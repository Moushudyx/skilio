import { describe, it, expect } from 'vitest';
import path from 'path';
import fs from 'fs/promises';
import { execa } from 'execa';
import { temporaryDirectory } from 'tempy';

// Resolve CLI entry built by rolldown.
const repoRoot = process.cwd();
const cliPath = path.join(repoRoot, 'dist', 'cli.cjs');

// Read directory entries; return empty list if missing.
const readDirNames = async (dir: string) => {
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    return entries.map((entry) => entry.name);
  } catch {
    return [] as string[];
  }
};

// Global disable should affect all agents when no --agent is provided.
describe('disable/enable e2e (global)', () => {
  it('disable without --agent disables all', async () => {
    const root = temporaryDirectory();
    await fs.mkdir(path.join(root, '.cursor'), { recursive: true });
    await fs.mkdir(path.join(root, '.trae'), { recursive: true });

    await execa('node', [cliPath, 'add', 'my-skill', '--agent', 'cursor,trae', '--no-prompt'], { cwd: root });

    // Disable globally.
    await execa('node', [cliPath, 'disable', 'my-skill'], { cwd: root });

    const cursorSkills = await readDirNames(path.join(root, '.cursor', 'skills'));
    const traeSkills = await readDirNames(path.join(root, '.trae', 'skills'));
    expect(cursorSkills).not.toEqual(expect.arrayContaining(['my-skill']));
    expect(traeSkills).not.toEqual(expect.arrayContaining(['my-skill']));
  });
});
