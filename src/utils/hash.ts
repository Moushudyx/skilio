import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';

const normalizePath = (value: string) => value.split(path.sep).join('/');

const hashFile = async (hash: crypto.Hash, filePath: string, relativePath: string) => {
  hash.update(`file:${relativePath}`);
  const content = await fs.readFile(filePath);
  hash.update(content);
};

const hashDirectory = async (hash: crypto.Hash, dirPath: string, baseDir: string) => {
  const entries = await fs.readdir(dirPath, { withFileTypes: true });
  entries.sort((a, b) => a.name.localeCompare(b.name));

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    const relPath = normalizePath(path.relative(baseDir, fullPath));
    if (entry.isDirectory()) {
      hash.update(`dir:${relPath}`);
      await hashDirectory(hash, fullPath, baseDir);
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
