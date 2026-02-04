import { describe, it, expect } from 'vitest';
import path from 'path';
import fs from 'fs/promises';
import { ensureAgentDirs, exists, readDirNames, runCli, withTempWorkspace } from './helpers';

// Single-command CLI E2E tests. These should validate one command at a time.
describe('cli e2e - single commands', () => {
  it('add creates skill in root and syncs only selected agent', async () => {
    await withTempWorkspace(async (root) => {
      // Prepare agent config directories so guess/selection can work predictably.
      await ensureAgentDirs(root, ['cursor', 'trae']);

      // Add a local skill and sync only to Trae.
      await runCli(['add', 'my-skill', '--agent', 'trae', '--no-prompt'], root);

      const rootSkills = await readDirNames(path.join(root, 'skills'));
      expect(rootSkills).toEqual(expect.arrayContaining(['my-skill']));

      const traeSkills = await readDirNames(path.join(root, '.trae', 'skills'));
      expect(traeSkills).toEqual(expect.arrayContaining(['my-skill']));

      // Cursor should be disabled for this skill when only Trae is targeted.
      const cursorDir = path.join(root, '.cursor', 'skills');
      expect(await exists(cursorDir)).toBe(false);

      // Config file should persist the disabled state for cursor.
      const configPath = path.join(root, 'skilio-config.json');
      expect(await exists(configPath)).toBe(true);
      const config = JSON.parse(await fs.readFile(configPath, 'utf-8')) as { skillDisabled: Record<string, string[]> };
      expect(config.skillDisabled['my-skill']).toEqual(expect.arrayContaining(['cursor']));
    });
  });
});
