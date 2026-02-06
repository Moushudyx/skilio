import { describe, it, expect } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import { ensureAgentDirs, exists, readDirNames, runCli, withTempWorkspace, writeSkill } from './helpers';

describe('install/update/check e2e', () => {
  it('install only disables detected agents', async () => {
    await withTempWorkspace(async (root) => {
      const source = path.join(root, 'source-repo');
      await writeSkill(path.join(source, 'skills', 'alpha'), 'alpha', 'v1');

      // No detected agents; do not record disabled entries for unknown agents.
      await runCli(['install', source, '--agent', 'cursor', '--no-prompt'], root);

      const configPath = path.join(root, 'skilio-config.json');
      const config = JSON.parse(await fs.readFile(configPath, 'utf-8')) as { skillDisabled: Record<string, string[]> };
      expect(config.skillDisabled['alpha']).toBeUndefined();
    });
  });

  it('install disables only detected agents not selected', async () => {
    await withTempWorkspace(async (root) => {
      await ensureAgentDirs(root, ['cursor', 'trae']);

      const source = path.join(root, 'source-repo');
      await writeSkill(path.join(source, 'skills', 'alpha'), 'alpha', 'v1');

      await runCli(['install', source, '--agent', 'cursor', '--no-prompt'], root);

      const configPath = path.join(root, 'skilio-config.json');
      const config = JSON.parse(await fs.readFile(configPath, 'utf-8')) as { skillDisabled: Record<string, string[]> };
      expect(config.skillDisabled['alpha']).toEqual(['trae']);
    });
  });

  it('installs from local source and checks/updates changes', async () => {
    await withTempWorkspace(async (root) => {
      await ensureAgentDirs(root, ['cursor']);

      const source = path.join(root, 'source-repo');
      await writeSkill(path.join(source, 'skills', 'alpha'), 'alpha', 'v1');

      await runCli(['install', source, '--agent', 'cursor', '--no-prompt'], root);

      expect(await exists(path.join(root, 'skills', 'alpha'))).toBe(true);
      expect(await exists(path.join(root, '.cursor', 'skills', 'alpha'))).toBe(true);

      // Update source skill content.
      await writeSkill(path.join(source, 'skills', 'alpha'), 'alpha', 'v2');

      const { stdout: checkOut } = await runCli(['check'], root);
      expect(checkOut).toContain('alpha: update available');

      await runCli(['update', '--agent', 'cursor', '--no-prompt'], root);
      const skillFile = await fs.readFile(path.join(root, 'skills', 'alpha', 'SKILL.md'), 'utf-8');
      expect(skillFile).toContain('description: v2');

      // Add a new skill to source and update again.
      await writeSkill(path.join(source, 'skills', 'beta'), 'beta', 'v1');
      await runCli(['update', '--agent', 'cursor', '--no-prompt'], root);

      const rootSkills = await readDirNames(path.join(root, 'skills'));
      expect(rootSkills).toEqual(expect.arrayContaining(['beta']));
      const cursorSkills = await readDirNames(path.join(root, '.cursor', 'skills'));
      expect(cursorSkills).toEqual(expect.arrayContaining(['beta']));
    });
  });
});
