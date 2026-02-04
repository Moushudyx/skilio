import fs from 'fs/promises';
import path from 'path';

export const ensureDir = async (dir: string) => {
  await fs.mkdir(dir, { recursive: true });
};

export const pathExists = async (p: string) => {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
};

export const listAllDirsByDir = async (dir: string) => {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  return entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name);
};

export const listAllFilesByDir = async (dir: string) => {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  return entries.filter((entry) => entry.isFile()).map((entry) => entry.name);
};

export const readJSONFile = async <T>(filePath: string): Promise<T | null> => {
  try {
    const raw = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
};

export const writeJSONFile = async (filePath: string, data: unknown) => {
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
};

export const updateJSONFile = async <T extends Record<string, unknown>>(
  filePath: string,
  data: Partial<T>
) => {
  const current = (await readJSONFile<T>(filePath)) ?? ({} as T);
  const next = Object.assign({}, current, data);
  await writeJSONFile(filePath, next);
  return next as T;
};

export const findFileIgnoreCase = async (dir: string, filename: string) => {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const matched = entries.find((entry) => entry.isFile() && entry.name.toLowerCase() === filename.toLowerCase());
  return matched ? path.join(dir, matched.name) : null;
};
