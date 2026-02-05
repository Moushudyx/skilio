import { describe, it, expect } from 'vitest';
import path from 'path';
import { ensureAgentDirs, readDirNames, runCli, withTempWorkspace } from './helpers';

// Multi-command CLI E2E tests. These validate cross-command behavior and state transitions.
describe('cli e2e - scenarios', () => {
  it('disable/enable toggles links for a target agent', async () => {
    await withTempWorkspace(async (root) => {
      await ensureAgentDirs(root, ['cursor', 'trae']);

      // Step 1: init the skill for both agents to establish baseline links.
      await runCli(['init', 'my-skill', '--agent', 'cursor,trae', '--no-prompt'], root);

      // Step 2: disable cursor only; link should be removed from cursor.
      await runCli(['disable', 'my-skill', '--agent', 'cursor'], root);
      const cursorSkillsAfterDisable = await readDirNames(path.join(root, '.cursor', 'skills'));
      expect(cursorSkillsAfterDisable).not.toEqual(expect.arrayContaining(['my-skill']));

      // Step 3: re-enable cursor; link should be restored for cursor.
      await runCli(['enable', 'my-skill', '--agent', 'cursor'], root);
      const cursorSkillsAfterEnable = await readDirNames(path.join(root, '.cursor', 'skills'));
      expect(cursorSkillsAfterEnable).toEqual(expect.arrayContaining(['my-skill']));
    });
  });

  it('config set/get works and ls shows the created skill', async () => {
    await withTempWorkspace(async (root) => {
      await ensureAgentDirs(root, ['cursor']);

      // Step 1: create a skill so that ls has data to show.
      await runCli(['init', 'my-skill', '--agent', 'cursor', '--no-prompt'], root);

      // Step 2: set showPrompt to false and verify the stored value.
      await runCli(['config', 'showPrompt', 'false'], root);
      const { stdout: showPrompt } = await runCli(['config', 'showPrompt'], root);
      expect(JSON.parse(showPrompt.trim())).toBe(false);

      // Step 3: list skills and ensure the created skill is present.
      const { stdout: listOut } = await runCli(['ls'], root);
      expect(listOut).toContain('my-skill');
    });
  });
});
