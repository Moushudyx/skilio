import { describe, it, expect } from 'vitest';
import path from 'path';
import fs from 'fs/promises';
import { execa } from 'execa';
import { temporaryDirectory } from 'tempy';

// Resolve CLI entry built by rolldown.
const repoRoot = process.cwd();
const cliPath = path.join(repoRoot, 'dist', 'cli.cjs');

// Create a valid SKILL.md under a given skill directory.
const writeSkill = async (dir: string, name: string, description = 'desc') => {
  await fs.mkdir(dir, { recursive: true });
  const skillFile = path.join(dir, 'SKILL.md');
  const content = `---\nname: ${name}\ndescription: ${description}\nmetadata:\n  author: test\n---\n`;
  await fs.writeFile(skillFile, content, 'utf-8');
};

// Create an invalid SKILL.md payload for negative cases.
const writeInvalidSkill = async (dir: string, content: string) => {
  await fs.mkdir(dir, { recursive: true });
  const skillFile = path.join(dir, 'SKILL.md');
  await fs.writeFile(skillFile, content, 'utf-8');
};

// Read directory entries; return empty list if missing.
const readDirNames = async (dir: string) => {
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    return entries.map((entry) => entry.name);
  } catch {
    return [] as string[];
  }
};

// Check path existence without throwing.
const exists = async (p: string) => {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
};

// E2E tests validate scan behavior and link syncing.
describe('scan e2e', () => {
  it('scans node_modules + packages + local skills and links to cursor/trae', async () => {
    const root = temporaryDirectory();

    await fs.mkdir(path.join(root, '.cursor'), { recursive: true });
    await fs.mkdir(path.join(root, '.trae'), { recursive: true });

    await writeSkill(path.join(root, 'skills', 'my-local'), 'my-local');
    await writeSkill(path.join(root, 'node_modules', 'some-module', 'skills', 'some-skill'), 'some-skill');
    await writeSkill(
      path.join(root, 'node_modules', '@scope', 'ns-module', 'skills', 'ns-skill'),
      'ns-skill'
    );
    await writeSkill(path.join(root, 'packages', 'subpkg', 'skills', 'pkg-skill'), 'pkg-skill');

    // Run scan without specifying agents; should infer cursor/trae.
    await execa('node', [cliPath, 'scan'], { cwd: root });

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

  it('respects --agent and creates qoder dir when specified', async () => {
    const root = temporaryDirectory();

    await fs.mkdir(path.join(root, '.cursor'), { recursive: true });
    await fs.mkdir(path.join(root, '.trae'), { recursive: true });

    await writeSkill(path.join(root, 'skills', 'my-local'), 'my-local');
    await writeSkill(path.join(root, 'node_modules', 'some-module', 'skills', 'some-skill'), 'some-skill');

    // Only Trae should be created when explicitly selected.
    await execa('node', [cliPath, 'scan', '--agent', 'trae'], { cwd: root });

    expect(await exists(path.join(root, '.trae', 'skills'))).toBe(true);
    expect(await exists(path.join(root, '.cursor', 'skills'))).toBe(false);

    // Selecting Qoder should create its config dir.
    await execa('node', [cliPath, 'scan', '--agent', 'qoder'], { cwd: root });
    expect(await exists(path.join(root, '.qoder', 'skills'))).toBe(true);
  });

  it('skips invalid skills and writes debug log', async () => {
    const root = temporaryDirectory();

    await fs.mkdir(path.join(root, '.cursor'), { recursive: true });
    await fs.mkdir(path.join(root, '.trae'), { recursive: true });

    await writeSkill(path.join(root, 'skills', 'my-local'), 'my-local');

    // Missing SKILL.md
    await fs.mkdir(path.join(root, 'node_modules', 'badmod', 'skills', 'empty-skill'), { recursive: true });

    // Invalid frontmatter (missing name)
    await writeInvalidSkill(
      path.join(root, 'packages', 'badpkg', 'skills', 'bad-skill'),
      `---\nname:\ndescription: test\n---\n`
    );

    // Name mismatch
    await writeInvalidSkill(
      path.join(root, 'node_modules', 'badmod2', 'skills', 'mismatch-skill'),
      `---\nname: other-name\ndescription: test\n---\n`
    );

    // Scan should skip invalid skills and log debug info.
    await execa('node', [cliPath, 'scan'], { cwd: root });

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
