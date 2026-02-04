import path from 'path';
import fs from 'fs/promises';
import { execa } from 'execa';
import { temporaryDirectory } from 'tempy';

// Resolve CLI entry built by rolldown. Used by all E2E tests.
export const repoRoot = process.cwd();
export const cliPath = path.join(repoRoot, 'dist', 'cli.cjs');

// Run CLI with Node for a given workspace.
export const runCli = (args: string[], cwd: string) => execa('node', [cliPath, ...args], { cwd });

// Read directory entries; return empty list if missing.
export const readDirNames = async (dir: string) => {
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    return entries.map((entry) => entry.name);
  } catch {
    return [] as string[];
  }
};

// Check path existence without throwing.
export const exists = async (p: string) => {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
};

// Create a valid SKILL.md under a given skill directory.
export const writeSkill = async (dir: string, name: string, description = 'desc') => {
  await fs.mkdir(dir, { recursive: true });
  const skillFile = path.join(dir, 'SKILL.md');
  const content = `---\nname: ${name}\ndescription: ${description}\nmetadata:\n  author: test\n---\n`;
  await fs.writeFile(skillFile, content, 'utf-8');
};

// Create an invalid SKILL.md payload for negative cases.
export const writeInvalidSkill = async (dir: string, content: string) => {
  await fs.mkdir(dir, { recursive: true });
  const skillFile = path.join(dir, 'SKILL.md');
  await fs.writeFile(skillFile, content, 'utf-8');
};

// Ensure agent config directories exist for agent ids like "cursor" => .cursor/skills.
export const ensureAgentDirs = async (root: string, agents: string[]) => {
  await Promise.all(agents.map((agent) => fs.mkdir(path.join(root, `.${agent}`), { recursive: true })));
};

// Create a temp workspace and always remove it after test completes.
export const withTempWorkspace = async (fn: (root: string) => Promise<void>) => {
  const root = temporaryDirectory();
  try {
    await fn(root);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
};
