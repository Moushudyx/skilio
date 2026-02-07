import fs from 'fs/promises';
import path from 'path';
import { ensureDir, findFileIgnoreCase, pathExists } from './fs';

export const ROOT_SKILL_DIRS = ['scripts', 'references', 'assets'];

const findRootDirMatch = async (rootDir: string, name: string) => {
  const entries = await fs.readdir(rootDir, { withFileTypes: true });
  const matched = entries.find((entry) => entry.isDirectory() && entry.name.toLowerCase() === name.toLowerCase());
  return matched ? matched.name : null;
};

export const copyRootSkill = async (sourceDir: string, targetDir: string) => {
  await ensureDir(targetDir);

  const skillFile = await findFileIgnoreCase(sourceDir, 'SKILL.md');
  if (skillFile) {
    await fs.copyFile(skillFile, path.join(targetDir, 'SKILL.md'));
  }

  for (const dirName of ROOT_SKILL_DIRS) {
    const matched = await findRootDirMatch(sourceDir, dirName);
    if (!matched) continue;
    const sourcePath = path.join(sourceDir, matched);
    if (!(await pathExists(sourcePath))) continue;
    await fs.cp(sourcePath, path.join(targetDir, matched), { recursive: true });
  }
};
