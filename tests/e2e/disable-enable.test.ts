import { describe, it, expect } from 'vitest';
import path from 'path';
import { ensureAgentDirs, readDirNames, runCli, withTempWorkspace } from './helpers';

// Global disable should affect all agents when no --agent is provided.
describe('disable/enable e2e (global)', () => {
  it('disable without --agent disables all agents', async () => {
    await withTempWorkspace(async (root) => {
      await ensureAgentDirs(root, ['cursor', 'trae']);

      // Seed a skill linked to both agents.
      await runCli(['add', 'my-skill', '--agent', 'cursor,trae', '--no-prompt'], root);

      // Disable globally (no --agent).
      await runCli(['disable', 'my-skill'], root);

      const cursorSkills = await readDirNames(path.join(root, '.cursor', 'skills'));
      const traeSkills = await readDirNames(path.join(root, '.trae', 'skills'));
      expect(cursorSkills).not.toEqual(expect.arrayContaining(['my-skill']));
      expect(traeSkills).not.toEqual(expect.arrayContaining(['my-skill']));
    });
  });
});
