import { describe, it, expect } from 'vitest';
import path from 'path';
import fs from 'fs/promises';
import { ensureAgentDirs, exists, runCli, withTempWorkspace, writeSkill } from './helpers';

describe('aliases e2e', () => {
  it('supports create/del/list/cfg aliases', async () => {
    await withTempWorkspace(async (root) => {
      await ensureAgentDirs(root, ['cursor']);

      await runCli(['create', 'alias-skill', '--agent', 'cursor', '--no-prompt'], root);
      const { stdout: listOut } = await runCli(['list'], root);
      expect(listOut).toContain('alias-skill');

      await runCli(['cfg', 'showPrompt', 'false'], root);
      const { stdout: showPrompt } = await runCli(['cfg', 'showPrompt'], root);
      expect(JSON.parse(showPrompt.trim())).toBe(false);

      await runCli(['del', 'alias-skill', '--no-prompt'], root);
      expect(await exists(path.join(root, 'skills', 'alias-skill'))).toBe(false);
    });
  });

  it('supports add/update aliases with local source', async () => {
    await withTempWorkspace(async (root) => {
      await ensureAgentDirs(root, ['cursor']);

      const source = path.join(root, 'source-repo');
      await writeSkill(path.join(source, 'skills', 'alpha'), 'alpha', 'v1');

      await runCli(['add', source, '--agent', 'cursor', '--no-prompt'], root);
      expect(await exists(path.join(root, 'skills', 'alpha'))).toBe(true);

      await writeSkill(path.join(source, 'skills', 'alpha'), 'alpha', 'v2');

      await runCli(['up', '--agent', 'cursor', '--no-prompt'], root);
      const skillFile = await fs.readFile(path.join(root, 'skills', 'alpha', 'SKILL.md'), 'utf-8');
      expect(skillFile).toContain('description: v2');
    });
  });
});
