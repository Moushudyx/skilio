import { describe, it, expect } from 'vitest';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { hashDir } from '../../src/utils/hash';
import { parseSourceInput, parseSourceKey } from '../../src/source';

describe('source parsing', () => {
  it('parses local path inputs', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'skilio-test-'));
    const local = path.join(root, 'source');
    await fs.mkdir(local, { recursive: true });

    const parsed = await parseSourceInput(local, root);
    expect(parsed.kind).toBe('local');
    expect(parsed.localPath).toBe(local);
    expect(parsed.key.startsWith('local:')).toBe(true);
  });

  it('parses github shorthand with branch and skill', async () => {
    const parsed = await parseSourceInput('owner/repo/tree/main/skills/demo', process.cwd());
    expect(parsed.kind).toBe('git');
    expect(parsed.repoUrl).toContain('github.com/owner/repo.git');
    expect(parsed.branch).toBe('main');
    expect(parsed.skillName).toBe('demo');
  });

  it('parses source key back into spec', () => {
    const key = 'git:https://github.com/owner/repo.git#main';
    const parsed = parseSourceKey(key);
    expect(parsed.repoUrl).toBe('https://github.com/owner/repo.git');
    expect(parsed.branch).toBe('main');
  });
});

describe('hashDir', () => {
  it('produces same hash for same content', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'skilio-hash-'));
    await fs.writeFile(path.join(dir, 'a.txt'), 'hello', 'utf-8');
    const hash1 = await hashDir(dir);
    const hash2 = await hashDir(dir);
    expect(hash1).toBe(hash2);
  });

  it('detects different content', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'skilio-hash-'));
    await fs.writeFile(path.join(dir, 'a.txt'), 'hello', 'utf-8');
    const hash1 = await hashDir(dir);
    await fs.writeFile(path.join(dir, 'a.txt'), 'hello-world', 'utf-8');
    const hash2 = await hashDir(dir);
    expect(hash1).not.toBe(hash2);
  });
});
