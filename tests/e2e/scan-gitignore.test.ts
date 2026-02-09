import { describe, it, expect } from 'vitest';
import path from 'path';
import fs from 'fs/promises';
import { runCli, withTempWorkspace } from './helpers';

describe('scan gitignore warnings', () => {
  it('warns when .gitignore is missing', async () => {
    await withTempWorkspace(async (root) => {
      const result = await runCli(['scan', '--agent', 'cursor'], root);
      expect(result.stderr).toContain('skills/npm-*');
      expect(result.stderr).toContain('skills/package-*');
    });
  });

  it('warns when .gitignore lacks both patterns', async () => {
    await withTempWorkspace(async (root) => {
      await fs.writeFile(path.join(root, '.gitignore'), 'node_modules\n', 'utf-8');
      const result = await runCli(['scan', '--agent', 'cursor'], root);
      expect(result.stderr).toContain('skills/npm-*');
      expect(result.stderr).toContain('skills/package-*');
    });
  });

  it('warns when .gitignore only has one pattern', async () => {
    await withTempWorkspace(async (root) => {
      await fs.writeFile(path.join(root, '.gitignore'), '**/skills/npm-*\n', 'utf-8');
      const result = await runCli(['scan', '--agent', 'cursor'], root);
      expect(result.stderr).toContain('skills/npm-*');
      expect(result.stderr).toContain('skills/package-*');
    });
  });

  it('does not warn when .gitignore has both patterns', async () => {
    await withTempWorkspace(async (root) => {
      await fs.writeFile(path.join(root, '.gitignore'), '**/skills/npm-*\n**/skills/package-*\n', 'utf-8');
      const result = await runCli(['scan', '--agent', 'cursor'], root);
      expect(result.stderr).not.toContain('skills/npm-*');
      expect(result.stderr).not.toContain('skills/package-*');
    });
  });
});
