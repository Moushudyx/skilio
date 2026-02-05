import { describe, it, expect } from 'vitest';
import path from 'path';
import fs from 'fs/promises';
import { ensureAgentDirs, exists, readDirNames, runCli, withTempWorkspace } from './helpers';

describe('init e2e', () => {
  it('creates skill in root and syncs only selected agent', async () => {
    await withTempWorkspace(async (root) => {
      await ensureAgentDirs(root, ['cursor', 'trae']);

      await runCli(['init', 'my-skill', '--agent', 'trae', '--no-prompt'], root);

      const rootSkills = await readDirNames(path.join(root, 'skills'));
      expect(rootSkills).toEqual(expect.arrayContaining(['my-skill']));

      const traeSkills = await readDirNames(path.join(root, '.trae', 'skills'));
      expect(traeSkills).toEqual(expect.arrayContaining(['my-skill']));

      const cursorDir = path.join(root, '.cursor', 'skills');
      expect(await exists(cursorDir)).toBe(false);

      const configPath = path.join(root, 'skilio-config.json');
      expect(await exists(configPath)).toBe(true);
      const config = JSON.parse(await fs.readFile(configPath, 'utf-8')) as { skillDisabled: Record<string, string[]> };
      expect(config.skillDisabled['my-skill']).toEqual(expect.arrayContaining(['cursor']));
    });
  });
});
