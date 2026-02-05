import { describe, it, expect } from 'vitest';
import path from 'path';
import { ensureAgentDirs, readDirNames, runCli, withTempWorkspace, writeSkill } from './helpers';

describe('scenario e2e', () => {
  it('scan/init/disable/enable/ls work together with npm and package skills', async () => {
    await withTempWorkspace(async (root) => {
      await ensureAgentDirs(root, ['cursor', 'trae']);

      await writeSkill(path.join(root, 'node_modules', 'dep-a', 'skills', 'dep-skill'), 'dep-skill');
      await writeSkill(path.join(root, 'packages', 'pkg-a', 'skills', 'pkg-skill'), 'pkg-skill');

      await runCli(['scan', '--agent', 'cursor,trae'], root);

      await runCli(['init', 'local-skill', '--agent', 'cursor,trae', '--no-prompt'], root);

      await runCli(['disable', 'local-skill', '--agent', 'cursor'], root);

      let cursorSkills = await readDirNames(path.join(root, '.cursor', 'skills'));
      let traeSkills = await readDirNames(path.join(root, '.trae', 'skills'));

      expect(cursorSkills).not.toEqual(expect.arrayContaining(['local-skill']));
      expect(traeSkills).toEqual(expect.arrayContaining(['local-skill']));

      await runCli(['enable', 'local-skill', '--agent', 'cursor'], root);

      cursorSkills = await readDirNames(path.join(root, '.cursor', 'skills'));
      traeSkills = await readDirNames(path.join(root, '.trae', 'skills'));

      expect(cursorSkills).toEqual(expect.arrayContaining(['local-skill']));
      expect(traeSkills).toEqual(expect.arrayContaining(['local-skill']));

      const { stdout } = await runCli(['ls'], root);
      expect(stdout).toContain('local-skill');
      expect(stdout).toContain('npm-dep-a-dep-skill');
      expect(stdout).toContain('package-pkg-a-pkg-skill');
    });
  });
});
