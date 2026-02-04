import { describe, it, expect } from 'vitest';
import { runCli, withTempWorkspace } from './helpers';

describe('config forbidden e2e', () => {
  it('rejects modifying skillDisabled via config command', async () => {
    await withTempWorkspace(async (root) => {
      try {
        await runCli(['config', 'skillDisabled', 'foo'], root);
        throw new Error('Expected CLI to fail when modifying skillDisabled');
      } catch (err: any) {
        const out = err.stderr || err.stdout || err.message || '';
        expect(out).toContain('skillDisabled is managed by skilio');
      }
    });
  });

  it('rejects modifying installSources via config command', async () => {
    await withTempWorkspace(async (root) => {
      try {
        await runCli(['config', 'installSources', 'foo'], root);
        throw new Error('Expected CLI to fail when modifying installSources');
      } catch (err: any) {
        const out = err.stderr || err.stdout || err.message || '';
        expect(out).toContain('installSources is managed by skilio');
      }
    });
  });
});
