import { describe, it, expect } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import { ensureAgentDirs, exists, readDirNames, runCli, withTempWorkspace, writeSkill } from './helpers';

describe('install/update/check e2e', () => {
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
