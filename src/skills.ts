import fs from 'fs/promises';
import path from 'path';
import { checkSkillDir, isValidSkillName, readSkillByDir } from './utils/skill';
import { listAllDirsByDir, pathExists } from './utils/fs';
import { appendDebugLog } from './debug';
import { checkSymlink, isSymlinkLike } from './utils/symlink';

// Skill origin types for bookkeeping.
export type SkillSource = 'local' | 'npm' | 'package';

export type ScannedSkill = {
  name: string;
  dir: string;
  source: SkillSource;
  sourceName: string;
};

// Scan a base directory with a direct "skills/" child.
// Only one level of skills is scanned; deeper nesting is ignored.
export const scanSkillsFromBase = async (
  baseDir: string,
  source: SkillSource,
  sourceName: string,
  rootDir: string
): Promise<ScannedSkill[]> => {
  const skillsDir = path.join(baseDir, 'skills');
  if (!(await pathExists(skillsDir))) return [];

  const subDirs = await listAllDirsByDir(skillsDir);
  const results: ScannedSkill[] = [];

  for (const sub of subDirs) {
    // Reject invalid skill names early to avoid filesystem ambiguity.
    if (!isValidSkillName(sub)) {
      await appendDebugLog(rootDir, `Invalid skill name: ${sub} @ ${skillsDir}`);
      continue;
    }
    const skillDir = path.join(skillsDir, sub);
    const parsed = await readSkillByDir(skillDir);
    if (!parsed.ok) {
      await appendDebugLog(rootDir, `Invalid SKILL.md: ${skillDir}. ${parsed.error}`);
      continue;
    }
    if (parsed.skill.name !== sub) {
      await appendDebugLog(
        rootDir,
        `Skill name mismatch: ${skillDir}. folder=${sub}, name=${parsed.skill.name}`
      );
      continue;
    }
    results.push({ name: sub, dir: skillDir, source, sourceName });
  }

  return results;
};

// List skill entries in root skills/ directory.
export const listRootSkills = async (rootDir: string) => {
  const rootSkillsDir = path.join(rootDir, 'skills');
  if (!(await pathExists(rootSkillsDir))) return [] as string[];
  const entries = await fs.readdir(rootSkillsDir, { withFileTypes: true });
  const results: string[] = [];

  for (const entry of entries) {
    const entryPath = path.join(rootSkillsDir, entry.name);
    const linkLike = await isSymlinkLike(entryPath);
    if (linkLike) {
      const ok = await checkSymlink(entryPath);
      if (ok) {
        results.push(entry.name);
      } else {
        await appendDebugLog(rootDir, `Invalid root skill link: ${entryPath}`);
      }
      continue;
    }

    if (!entry.isDirectory()) continue;
    const ok = await checkSkillDir(entryPath);
    if (ok) {
      results.push(entry.name);
    } else {
      await appendDebugLog(rootDir, `Invalid root skill dir: ${entryPath}`);
    }
  }

  return results;
};

// A local skill is a real directory (not a symlink).
export const isLocalSkillDir = async (rootDir: string, name: string) => {
  const dir = path.join(rootDir, 'skills', name);
  const stat = await fs.lstat(dir);
  return stat.isDirectory() && !stat.isSymbolicLink();
};
