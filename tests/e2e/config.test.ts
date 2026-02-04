import { describe, it, expect } from 'vitest';
import path from 'path';
import fs from 'fs/promises';
import { execa } from 'execa';
import { temporaryDirectory } from 'tempy';

// Resolve CLI entry built by rolldown.
const repoRoot = process.cwd();
const cliPath = path.join(repoRoot, 'dist', 'cli.cjs');

// Check path existence without throwing.
const exists = async (p: string) => {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
};

// Config command should persist updates to skilio-config.json.
describe('config e2e', () => {
  it('writes config file with updated values', async () => {
    const root = temporaryDirectory();

    // Update config via CLI.
    await execa('node', [cliPath, 'config', 'defaultAgents', 'cursor,trae'], { cwd: root });

    const configPath = path.join(root, 'skilio-config.json');
    expect(await exists(configPath)).toBe(true);

    const config = JSON.parse(await fs.readFile(configPath, 'utf-8')) as { defaultAgents: string[] };
    expect(config.defaultAgents).toEqual(['cursor', 'trae']);
  });
});
