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

// Check path existence without throwing.
const exists = async (p: string) => {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
};

// E2E tests validate CLI behavior on a temporary workspace.
describe('cli e2e', () => {
  it('add creates skill and syncs to selected agent only', async () => {
    const root = temporaryDirectory();
    await fs.mkdir(path.join(root, '.cursor'), { recursive: true });
    await fs.mkdir(path.join(root, '.trae'), { recursive: true });

    // Create a local skill and sync only to Trae.
    await execa('node', [cliPath, 'add', 'my-skill', '--agent', 'trae', '--no-prompt'], { cwd: root });

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

  it('disable/enable updates links for target agent', async () => {
    const root = temporaryDirectory();
    await fs.mkdir(path.join(root, '.cursor'), { recursive: true });
    await fs.mkdir(path.join(root, '.trae'), { recursive: true });

    // Add skill for both agents.
    await execa('node', [cliPath, 'add', 'my-skill', '--agent', 'cursor,trae', '--no-prompt'], { cwd: root });

    // Disable cursor only.
    await execa('node', [cliPath, 'disable', 'my-skill', '--agent', 'cursor'], { cwd: root });
    const cursorSkillsAfterDisable = await readDirNames(path.join(root, '.cursor', 'skills'));
    expect(cursorSkillsAfterDisable).not.toEqual(expect.arrayContaining(['my-skill']));

    // Re-enable cursor only.
    await execa('node', [cliPath, 'enable', 'my-skill', '--agent', 'cursor'], { cwd: root });
    const cursorSkillsAfterEnable = await readDirNames(path.join(root, '.cursor', 'skills'));
    expect(cursorSkillsAfterEnable).toEqual(expect.arrayContaining(['my-skill']));
  });

  it('config set/get works and ls prints skills', async () => {
    const root = temporaryDirectory();
    await fs.mkdir(path.join(root, '.cursor'), { recursive: true });

    // Prepare a local skill for list output.
    await execa('node', [cliPath, 'add', 'my-skill', '--agent', 'cursor', '--no-prompt'], { cwd: root });

    await execa('node', [cliPath, 'config', 'showPrompt', 'false'], { cwd: root });
    const { stdout: showPrompt } = await execa('node', [cliPath, 'config', 'showPrompt'], { cwd: root });
    expect(JSON.parse(showPrompt.trim())).toBe(false);

    const { stdout: listOut } = await execa('node', [cliPath, 'ls'], { cwd: root });
    expect(listOut).toContain('my-skill');
  });
});
