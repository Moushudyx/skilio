import { describe, it, expect } from 'vitest';
import path from 'path';
import fs from 'fs/promises';
import { exists, runCli, withTempWorkspace } from './helpers';

// Config command should persist updates to skilio-config.json.
describe('config e2e', () => {
  it('writes config file with updated values (single command)', async () => {
    await withTempWorkspace(async (root) => {
      // Update config via CLI in an empty workspace.
      await runCli(['config', 'defaultAgents', 'cursor,trae'], root);

      const configPath = path.join(root, 'skilio-config.json');
      expect(await exists(configPath)).toBe(true);

      const config = JSON.parse(await fs.readFile(configPath, 'utf-8')) as { defaultAgents: string[] };
      expect(config.defaultAgents).toEqual(['cursor', 'trae']);
    });
  });
});
