import fs from 'fs/promises';
import path from 'path';
import matter from 'gray-matter';
import { findFileIgnoreCase } from './fs';

// Parsed metadata for a single skill.
export type SkillMeta = {
  name: string;
  description: string;
  metadata: Record<string, unknown>;
  dir: string;
};

export type SkillReadResult = { ok: true; skill: SkillMeta } | { ok: false; error: string };

// Read SKILL.md (case-insensitive) and validate required fields.
export const readSkillByDir = async (dir: string): Promise<SkillReadResult> => {
  const file = await findFileIgnoreCase(dir, 'SKILL.md');
  if (!file) {
    return { ok: false, error: 'SKILL.md not found' };
  }

  try {
    const raw = await fs.readFile(file, 'utf-8');
    const parsed = matter(raw);
    const name = String(parsed.data?.name ?? '').trim();
    const description = parsed.data?.description;
    if (!name) {
      return { ok: false, error: 'name is required' };
    }
    if (description === undefined) {
      return { ok: false, error: 'description is required' };
    }
    const metadata = parsed.data?.metadata ?? {};
    return {
      ok: true,
      skill: {
        name,
        description: String(description),
        metadata: typeof metadata === 'object' && metadata ? metadata : {},
        dir: path.resolve(dir),
      },
    };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Unknown parse error' };
  }
};

// A skill directory is valid if SKILL.md parses correctly.
export const checkSkillDir = async (dir: string) => {
  const res = await readSkillByDir(dir);
  return res.ok;
};

// Basic path segment validation (no separators, no empty name).
export const isValidSkillName = (name: string) => {
  if (!name.trim()) return false;
  if (name.includes('/') || name.includes('\\')) return false;
  return true;
};
