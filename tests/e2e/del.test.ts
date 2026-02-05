import { describe, it, expect } from 'vitest';
import path from 'path';
import { ensureAgentDirs, exists, runCli, withTempWorkspace } from './helpers';

describe('del e2e', () => {
  it('deletes local skill and removes agent links', async () => {
    await withTempWorkspace(async (root) => {
      await ensureAgentDirs(root, ['cursor', 'trae']);

      await runCli(['init', 'my-skill', '--agent', 'cursor,trae', '--no-prompt'], root);
      expect(await exists(path.join(root, 'skills', 'my-skill'))).toBe(true);

      await runCli(['del', 'my-skill', '--no-prompt'], root);

      expect(await exists(path.join(root, 'skills', 'my-skill'))).toBe(false);
      expect(await exists(path.join(root, '.cursor', 'skills', 'my-skill'))).toBe(false);
      expect(await exists(path.join(root, '.trae', 'skills', 'my-skill'))).toBe(false);
    });
  });
});
