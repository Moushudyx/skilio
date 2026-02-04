import fs from 'fs/promises';
import path from 'path';
import { checkSkillDir } from './skill';

// Create a directory symlink; Windows uses junction.
export const createSymlink = async (source: string, target: string) => {
  const type = process.platform === 'win32' ? 'junction' : 'dir';
  await fs.symlink(source, target, type);
};

// Delete a symlink only.
export const deleteSymlink = async (target: string) => {
  await fs.unlink(target);
};

// Validate symlink target points to a valid skill directory.
export const checkSymlink = async (target: string) => {
  try {
    const stat = await fs.lstat(target);
    if (!stat.isSymbolicLink()) return false;
    const link = await fs.readlink(target);
    const resolved = path.resolve(path.dirname(target), link);
    return await checkSkillDir(resolved);
  } catch {
    return false;
  }
};
