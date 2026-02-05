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
});
