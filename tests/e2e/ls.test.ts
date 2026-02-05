import { describe, it, expect } from 'vitest';
import { ensureAgentDirs, runCli, withTempWorkspace } from './helpers';

describe('ls e2e', () => {
  it('lists root skills by default', async () => {
    await withTempWorkspace(async (root) => {
      await ensureAgentDirs(root, ['cursor']);

      await runCli(['init', 'alpha', '--agent', 'cursor', '--no-prompt'], root);
      await runCli(['init', 'beta', '--agent', 'cursor', '--no-prompt'], root);

      const { stdout } = await runCli(['ls'], root);
      expect(stdout).toContain('alpha');
      expect(stdout).toContain('beta');
    });
  });

  it('lists skills for a specific agent', async () => {
    await withTempWorkspace(async (root) => {
      await ensureAgentDirs(root, ['cursor', 'trae']);

      await runCli(['init', 'alpha', '--agent', 'cursor,trae', '--no-prompt'], root);
      await runCli(['init', 'beta', '--agent', 'cursor', '--no-prompt'], root);

      const { stdout } = await runCli(['ls', '--agent', 'trae'], root);
      expect(stdout).toContain('trae skills');
      expect(stdout).toContain('alpha');
      expect(stdout).not.toContain('beta');
    });
  });
});
