import { describe, it, expect } from 'vitest';
import path from 'path';
import fs from 'fs/promises';
import {
  ensureAgentDirs,
  exists,
  readDirNames,
  runCli,
  withTempWorkspace,
  writeInvalidSkill,
  writeSkill,
} from './helpers';

// E2E tests validate scan behavior and link syncing.
describe('scan e2e', () => {
  it('scans all sources and links to inferred agents (single command)', async () => {
    await withTempWorkspace(async (root) => {
      await ensureAgentDirs(root, ['cursor', 'trae']);

      // Prepare local + npm + workspace package skills for discovery.
      await writeSkill(path.join(root, 'skills', 'my-local'), 'my-local');
      await writeSkill(path.join(root, 'node_modules', 'some-module', 'skills', 'some-skill'), 'some-skill');
      await writeSkill(
        path.join(root, 'node_modules', '@scope', 'ns-module', 'skills', 'ns-skill'),
        'ns-skill'
      );
      await writeSkill(path.join(root, 'packages', 'subpkg', 'skills', 'pkg-skill'), 'pkg-skill');

      // Run scan without specifying agents; should infer cursor/trae.
      await runCli(['scan'], root);

      const rootSkills = await readDirNames(path.join(root, 'skills'));
      expect(rootSkills).toEqual(
        expect.arrayContaining([
          'my-local',
          'npm-some-module-some-skill',
          'npm-@scope-ns-module-ns-skill',
          'package-subpkg-pkg-skill',
        ])
      );

      const cursorSkills = await readDirNames(path.join(root, '.cursor', 'skills'));
      const traeSkills = await readDirNames(path.join(root, '.trae', 'skills'));
      expect(cursorSkills).toEqual(expect.arrayContaining(rootSkills));
      expect(traeSkills).toEqual(expect.arrayContaining(rootSkills));
    });
  });

  it('warns and exits when no agents and prompts are disabled', async () => {
    await withTempWorkspace(async (root) => {
      const result = await runCli(['scan', '--no-prompt'], root);
      expect(result.exitCode).toBe(0);
      expect(result.stderr).toContain('No agent detected');
    });
  });

  it('respects config scanNpm=false and skips npm skills', async () => {
    await withTempWorkspace(async (root) => {
      await ensureAgentDirs(root, ['cursor']);

      await writeSkill(path.join(root, 'node_modules', 'some-module', 'skills', 'some-skill'), 'some-skill');
      await writeSkill(path.join(root, 'packages', 'subpkg', 'skills', 'pkg-skill'), 'pkg-skill');

      await fs.writeFile(
        path.join(root, 'skilio-config.json'),
        JSON.stringify({ scanNpm: false, scanPackages: true, cleanLinks: true }, null, 2),
        'utf-8'
      );

      await runCli(['scan'], root);

      const rootSkills = await readDirNames(path.join(root, 'skills'));
      expect(rootSkills).not.toEqual(expect.arrayContaining(['npm-some-module-some-skill']));
      expect(rootSkills).toEqual(expect.arrayContaining(['package-subpkg-pkg-skill']));
    });
  });

  it('respects --agent and only creates requested agent dirs (single command)', async () => {
    await withTempWorkspace(async (root) => {
      // Pre-create some agents to verify that only target agent is used.
      await ensureAgentDirs(root, ['cursor', 'trae']);

      await writeSkill(path.join(root, 'skills', 'my-local'), 'my-local');
      await writeSkill(path.join(root, 'node_modules', 'some-module', 'skills', 'some-skill'), 'some-skill');

      // Only Trae should be created/used when explicitly selected.
      await runCli(['scan', '--agent', 'trae'], root);

      expect(await exists(path.join(root, '.trae', 'skills'))).toBe(true);
      expect(await exists(path.join(root, '.cursor', 'skills'))).toBe(false);

      // Selecting Qoder should create its config dir.
      await runCli(['scan', '--agent', 'qoder'], root);
      expect(await exists(path.join(root, '.qoder', 'skills'))).toBe(true);
    });
  });

  it('skips invalid skills and writes debug log (single command)', async () => {
    await withTempWorkspace(async (root) => {
      await ensureAgentDirs(root, ['cursor', 'trae']);

      await writeSkill(path.join(root, 'skills', 'my-local'), 'my-local');

      // Missing SKILL.md should be ignored by scan.
      await fs.mkdir(path.join(root, 'node_modules', 'badmod', 'skills', 'empty-skill'), { recursive: true });

      // Invalid frontmatter (missing name) should be ignored by scan.
      await writeInvalidSkill(
        path.join(root, 'packages', 'badpkg', 'skills', 'bad-skill'),
        `---\nname:\ndescription: test\n---\n`
      );

      // Name mismatch should be ignored by scan.
      await writeInvalidSkill(
        path.join(root, 'node_modules', 'badmod2', 'skills', 'mismatch-skill'),
        `---\nname: other-name\ndescription: test\n---\n`
      );

      // Scan should skip invalid skills and log debug info.
      await runCli(['scan'], root);

      const rootSkills = await readDirNames(path.join(root, 'skills'));
      expect(rootSkills).not.toEqual(expect.arrayContaining(['npm-badmod-empty-skill']));
      expect(rootSkills).not.toEqual(expect.arrayContaining(['package-badpkg-bad-skill']));
      expect(rootSkills).not.toEqual(expect.arrayContaining(['npm-badmod2-mismatch-skill']));

      const debugLog = path.join(root, 'skilio-debug.log');
      expect(await exists(debugLog)).toBe(true);
      const logContent = await fs.readFile(debugLog, 'utf-8');
      expect(logContent).toContain('Invalid SKILL.md');
      expect(logContent).toContain('Skill name mismatch');
    });
  });

  it('cleans stale npm links after rescan', async () => {
    await withTempWorkspace(async (root) => {
      await ensureAgentDirs(root, ['cursor']);

      await writeSkill(path.join(root, 'node_modules', 'some-module', 'skills', 'skill-a'), 'skill-a');
      await writeSkill(path.join(root, 'node_modules', 'some-module', 'skills', 'skill-b'), 'skill-b');

      await runCli(['scan', '--agent', 'cursor'], root);

      let rootSkills = await readDirNames(path.join(root, 'skills'));
      expect(rootSkills).toEqual(
        expect.arrayContaining(['npm-some-module-skill-a', 'npm-some-module-skill-b'])
      );

      await fs.rm(path.join(root, 'node_modules', 'some-module', 'skills', 'skill-b'), { recursive: true, force: true });
      await writeSkill(path.join(root, 'node_modules', 'some-module', 'skills', 'skill-c'), 'skill-c');

      await runCli(['scan', '--agent', 'cursor'], root);

      rootSkills = await readDirNames(path.join(root, 'skills'));
      expect(rootSkills).not.toEqual(expect.arrayContaining(['npm-some-module-skill-b']));
      expect(rootSkills).toEqual(expect.arrayContaining(['npm-some-module-skill-c']));

      const cursorSkills = await readDirNames(path.join(root, '.cursor', 'skills'));
      expect(cursorSkills).not.toEqual(expect.arrayContaining(['npm-some-module-skill-b']));
      expect(cursorSkills).toEqual(expect.arrayContaining(['npm-some-module-skill-c']));
    });
  });

  it('skips skills missing SKILL.md and removes agent links', async () => {
    await withTempWorkspace(async (root) => {
      await ensureAgentDirs(root, ['cursor']);

      await writeSkill(path.join(root, 'skills', 'my-local'), 'my-local');
      await writeSkill(path.join(root, 'node_modules', 'some-module', 'skills', 'some-skill'), 'some-skill');
      await writeSkill(path.join(root, 'packages', 'subpkg', 'skills', 'pkg-skill'), 'pkg-skill');

      await runCli(['scan', '--agent', 'cursor'], root);

      await fs.rm(path.join(root, 'skills', 'my-local', 'SKILL.md'), { force: true });
      await fs.rm(path.join(root, 'node_modules', 'some-module', 'skills', 'some-skill', 'SKILL.md'), { force: true });
      await fs.rm(path.join(root, 'packages', 'subpkg', 'skills', 'pkg-skill', 'SKILL.md'), { force: true });

      await runCli(['scan', '--agent', 'cursor'], root);

      const rootSkills = await readDirNames(path.join(root, 'skills'));
      expect(rootSkills).not.toEqual(expect.arrayContaining(['npm-some-module-some-skill']));
      expect(rootSkills).not.toEqual(expect.arrayContaining(['package-subpkg-pkg-skill']));

      const cursorSkills = await readDirNames(path.join(root, '.cursor', 'skills'));
      expect(cursorSkills).not.toEqual(
        expect.arrayContaining(['my-local', 'npm-some-module-some-skill', 'package-subpkg-pkg-skill'])
      );
    });
  });
});
