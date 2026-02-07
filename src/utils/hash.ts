import crypto from 'crypto';
import fs from 'fs/promises';
import type { Dirent } from 'fs';
import path from 'path';

const normalizePath = (value: string) => value.split(path.sep).join('/');

const hashFile = async (hash: crypto.Hash, filePath: string, relativePath: string) => {
  hash.update(`file:${relativePath}`);
  const content = await fs.readFile(filePath);
  hash.update(content);
};

const hashDirectory = async (
  hash: crypto.Hash,
  dirPath: string,
  baseDir: string,
  filter?: (entry: Dirent, relPath: string, isRoot: boolean) => boolean
) => {
  const entries = await fs.readdir(dirPath, { withFileTypes: true });
  entries.sort((a, b) => a.name.localeCompare(b.name));
  const isRoot = dirPath === baseDir;

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    const relPath = normalizePath(path.relative(baseDir, fullPath));
    if (filter && !filter(entry, relPath, isRoot)) {
      continue;
    }
    if (entry.isDirectory()) {
      hash.update(`dir:${relPath}`);
      await hashDirectory(hash, fullPath, baseDir, filter);
      continue;
    }
    if (entry.isFile()) {
      await hashFile(hash, fullPath, relPath);
      continue;
    }
    if (entry.isSymbolicLink()) {
      hash.update(`symlink:${relPath}`);
    }
  }
};

export const hashDir = async (dirPath: string) => {
  const hash = crypto.createHash('sha256');
  await hashDirectory(hash, dirPath, dirPath);
  return hash.digest('hex');
};

export const hashDirFiltered = async (dirPath: string, allowedRootNames: string[]) => {
  const allowSet = new Set(allowedRootNames.map((name) => name.toLowerCase()));
  const hash = crypto.createHash('sha256');
  await hashDirectory(hash, dirPath, dirPath, (entry, _relPath, isRoot) => {
    if (!isRoot) return true;
    return allowSet.has(entry.name.toLowerCase());
  });
  return hash.digest('hex');
};
