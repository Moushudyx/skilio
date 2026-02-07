import { describe, it, expect } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import { ensureAgentDirs, exists, readDirNames, runCli, withTempWorkspace, writeSkill } from './helpers';

// Helper to get the single installed source key for each test workspace.
const getFirstSourceKey = (config: { installSources: Record<string, unknown> }) =>
  Object.keys(config.installSources)[0];

// Read installSources payload from the workspace config.
const readConfig = async (root: string) => {
  const configPath = path.join(root, 'skilio-config.json');
  return JSON.parse(await fs.readFile(configPath, 'utf-8')) as {
    installSources: Record<string, { include: string[]; exclude: string[]; installed: string[] }>;
  };
};

describe('uninstall e2e', () => {
  it('uninstalls an entire source', async () => {
    await withTempWorkspace(async (root) => {
      await ensureAgentDirs(root, ['cursor']);

      const source = path.join(root, 'source-repo');
      await writeSkill(path.join(source, 'skills', 'alpha'), 'alpha', 'v1');
      await writeSkill(path.join(source, 'skills', 'beta'), 'beta', 'v1');

      await runCli(['install', source, '--agent', 'cursor', '--no-prompt'], root);
      await runCli(['uninstall', source, '--agent', 'cursor', '--no-prompt'], root);

      expect(await exists(path.join(root, 'skills', 'alpha'))).toBe(false);
      expect(await exists(path.join(root, 'skills', 'beta'))).toBe(false);

      const config = await readConfig(root);
      expect(Object.keys(config.installSources)).toHaveLength(0);

      const cursorSkills = await readDirNames(path.join(root, '.cursor', 'skills'));
      expect(cursorSkills).not.toEqual(expect.arrayContaining(['alpha', 'beta']));
    });
  });

  it('uninstalls a skill from a full source and prevents re-add', async () => {
    await withTempWorkspace(async (root) => {
      await ensureAgentDirs(root, ['cursor']);

      const source = path.join(root, 'source-repo');
      await writeSkill(path.join(source, 'skills', 'alpha'), 'alpha', 'v1');
      await writeSkill(path.join(source, 'skills', 'beta'), 'beta', 'v1');

      await runCli(['install', source, '--agent', 'cursor', '--no-prompt'], root);
      await runCli(['uninstall', source, '--skills', 'alpha', '--agent', 'cursor', '--no-prompt'], root);

      expect(await exists(path.join(root, 'skills', 'alpha'))).toBe(false);
      expect(await exists(path.join(root, 'skills', 'beta'))).toBe(true);

      const config = await readConfig(root);
      const key = getFirstSourceKey(config);
      expect(config.installSources[key].exclude).toEqual(expect.arrayContaining(['alpha']));

      await writeSkill(path.join(source, 'skills', 'gamma'), 'gamma', 'v1');
      await runCli(['update', '--agent', 'cursor', '--no-prompt'], root);

      const rootSkills = await readDirNames(path.join(root, 'skills'));
      expect(rootSkills).toEqual(expect.arrayContaining(['beta', 'gamma']));
      expect(rootSkills).not.toEqual(expect.arrayContaining(['alpha']));
    });
  });

  it('uninstalls a skill from an install-only source', async () => {
    await withTempWorkspace(async (root) => {
      await ensureAgentDirs(root, ['cursor']);

      const source = path.join(root, 'source-repo');
      await writeSkill(path.join(source, 'skills', 'alpha'), 'alpha', 'v1');
      await writeSkill(path.join(source, 'skills', 'beta'), 'beta', 'v1');

      await runCli(['install', source, '--skills', 'alpha,beta', '--agent', 'cursor', '--no-prompt'], root);
      await runCli(['uninstall', source, '--skills', 'beta', '--agent', 'cursor', '--no-prompt'], root);

      expect(await exists(path.join(root, 'skills', 'beta'))).toBe(false);

      const config = await readConfig(root);
      const key = getFirstSourceKey(config);
      expect(config.installSources[key].exclude).toEqual(expect.arrayContaining(['beta']));
    });
  });

  it('uninstalls a skill from a wildcard-installed source', async () => {
    await withTempWorkspace(async (root) => {
      await ensureAgentDirs(root, ['cursor']);

      const source = path.join(root, 'source-repo');
      await writeSkill(path.join(source, 'skills', 'alpha'), 'alpha', 'v1');
      await writeSkill(path.join(source, 'skills', 'alchemy'), 'alchemy', 'v1');
      await writeSkill(path.join(source, 'skills', 'beta'), 'beta', 'v1');

      await runCli(['install', source, '--skills', 'a*', '--agent', 'cursor', '--no-prompt'], root);
      await runCli(['uninstall', source, '--skills', 'alpha', '--agent', 'cursor', '--no-prompt'], root);

      expect(await exists(path.join(root, 'skills', 'alpha'))).toBe(false);
      expect(await exists(path.join(root, 'skills', 'alchemy'))).toBe(true);

      const config = await readConfig(root);
      const key = getFirstSourceKey(config);
      expect(config.installSources[key].exclude).toEqual(expect.arrayContaining(['alpha']));
    });
  });

  it('warns when uninstalling a missing skill', async () => {
    await withTempWorkspace(async (root) => {
      await ensureAgentDirs(root, ['cursor']);

      const source = path.join(root, 'source-repo');
      await writeSkill(path.join(source, 'skills', 'alpha'), 'alpha', 'v1');

      await runCli(['install', source, '--agent', 'cursor', '--no-prompt'], root);
      const { stdout, stderr } = await runCli(
        ['uninstall', source, '--skills', 'beta', '--agent', 'cursor', '--no-prompt'],
        root
      );

      // Warnings are printed to stderr.
      expect(`${stdout}\n${stderr}`).toContain('No installed skills matched: beta');
      expect(await exists(path.join(root, 'skills', 'alpha'))).toBe(true);
    });
  });
});
