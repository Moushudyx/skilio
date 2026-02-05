import { describe, it, expect } from 'vitest';
import path from 'path';
import { ensureAgentDirs, readDirNames, runCli, withTempWorkspace } from './helpers';

describe('disable e2e', () => {
  it('disable without --agent disables all agents', async () => {
    await withTempWorkspace(async (root) => {
      await ensureAgentDirs(root, ['cursor', 'trae']);

      await runCli(['init', 'my-skill', '--agent', 'cursor,trae', '--no-prompt'], root);

      await runCli(['disable', 'my-skill'], root);

      const cursorSkills = await readDirNames(path.join(root, '.cursor', 'skills'));
      const traeSkills = await readDirNames(path.join(root, '.trae', 'skills'));
      expect(cursorSkills).not.toEqual(expect.arrayContaining(['my-skill']));
      expect(traeSkills).not.toEqual(expect.arrayContaining(['my-skill']));
    });
  });
});
