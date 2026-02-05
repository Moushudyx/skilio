import { describe, it, expect } from 'vitest';
import path from 'path';
import { ensureAgentDirs, readDirNames, runCli, withTempWorkspace } from './helpers';

describe('enable e2e', () => {
  it('enable restores links for target agent', async () => {
    await withTempWorkspace(async (root) => {
      await ensureAgentDirs(root, ['cursor', 'trae']);

      await runCli(['init', 'my-skill', '--agent', 'cursor,trae', '--no-prompt'], root);
      await runCli(['disable', 'my-skill', '--agent', 'cursor'], root);

      await runCli(['enable', 'my-skill', '--agent', 'cursor'], root);

      const cursorSkills = await readDirNames(path.join(root, '.cursor', 'skills'));
      expect(cursorSkills).toEqual(expect.arrayContaining(['my-skill']));
    });
  });

  it('enable only restores the target agent', async () => {
    await withTempWorkspace(async (root) => {
      await ensureAgentDirs(root, ['cursor', 'trae']);

      await runCli(['init', 'my-skill', '--agent', 'cursor,trae', '--no-prompt'], root);
      await runCli(['disable', 'my-skill', '--agent', 'cursor'], root);

      const traeSkillsAfterDisable = await readDirNames(path.join(root, '.trae', 'skills'));
      expect(traeSkillsAfterDisable).toEqual(expect.arrayContaining(['my-skill']));

      await runCli(['enable', 'my-skill', '--agent', 'cursor'], root);

      const cursorSkills = await readDirNames(path.join(root, '.cursor', 'skills'));
      const traeSkills = await readDirNames(path.join(root, '.trae', 'skills'));
      expect(cursorSkills).toEqual(expect.arrayContaining(['my-skill']));
      expect(traeSkills).toEqual(expect.arrayContaining(['my-skill']));
    });
  });
});
