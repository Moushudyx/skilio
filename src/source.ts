import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { runCommand } from './utils/runCommand';
import { appendDebugLog } from './debug';
import { isValidSkillName, readSkillByDir } from './utils/skill';
import { warn } from './utils/log';
import { listAllDirsByDir, pathExists } from './utils/fs';

export type SourceSpec = {
  input: string;
  key: string;
  kind: 'git' | 'local';
  repoUrl?: string;
  branch?: string;
  localPath?: string;
  subPath?: string;
  skillName?: string;
  display: string;
};

export type SourceSkill = {
  name: string;
  dir: string;
  copyMode: 'full' | 'root';
};

const buildSourceKey = (kind: 'git' | 'local', location: string, branch?: string) => {
  const base = `${kind}:${location}`;
  return branch ? `${base}#${branch}` : base;
};

const looksLikeGitUrl = (value: string) =>
  value.startsWith('http://') ||
  value.startsWith('https://') ||
  value.startsWith('ssh://') ||
  value.startsWith('git@') ||
  value.endsWith('.git');

const parseGitInput = (input: string) => {
  const normalized = input.replace(/\.git$/, '');
  const match = normalized.match(
    /^([^/]+)\/([^/]+?)(?:\/tree\/([^/]+)(?:\/skills\/([^/]+))?)?$/
  );
  if (!match) return null;
  const [, owner, repo, branch, skillName] = match;
  const repoUrl = `https://github.com/${owner}/${repo}.git`;
  const subPath = skillName ? path.join('skills', skillName) : 'skills';
  return { repoUrl, branch, skillName, subPath, display: `${owner}/${repo}${branch ? `@${branch}` : ''}` };
};

export const parseSourceInput = async (input: string, rootDir: string): Promise<SourceSpec> => {
  const value = input.trim();
  const localPath = path.isAbsolute(value) ? value : path.resolve(rootDir, value);
  if (await pathExists(localPath)) {
    return {
      input,
      key: buildSourceKey('local', localPath),
      kind: 'local',
      localPath,
      subPath: 'skills',
      display: localPath,
    };
  }

  const gh = parseGitInput(value);
  if (gh) {
    return {
      input,
      key: buildSourceKey('git', gh.repoUrl, gh.branch),
      kind: 'git',
      repoUrl: gh.repoUrl,
      branch: gh.branch,
      subPath: gh.subPath,
      skillName: gh.skillName,
      display: gh.display,
    };
  }

  if (looksLikeGitUrl(value)) {
    const [repoUrl, branch] = value.split('#');
    return {
      input,
      key: buildSourceKey('git', repoUrl, branch),
      kind: 'git',
      repoUrl,
      branch,
      subPath: 'skills',
      display: repoUrl,
    };
  }

  throw new Error(`Unsupported source format: ${input}`);
};

export const parseSourceKey = (key: string): SourceSpec => {
  if (key.startsWith('local:')) {
    const localPath = key.slice('local:'.length);
    return {
      input: key,
      key,
      kind: 'local',
      localPath,
      subPath: 'skills',
      display: localPath,
    };
  }
  if (key.startsWith('git:')) {
    const rest = key.slice('git:'.length);
    const [repoUrl, branch] = rest.split('#');
    return {
      input: key,
      key,
      kind: 'git',
      repoUrl,
      branch,
      subPath: 'skills',
      display: repoUrl,
    };
  }
  throw new Error(`Unsupported source key: ${key}`);
};

export const fetchSourceToTemp = async (source: SourceSpec, rootDir: string) => {
  if (source.kind === 'local') {
    if (!source.localPath) {
      throw new Error('Local source path missing.');
    }
    return { dir: source.localPath, cleanup: async () => undefined };
  }
  if (!source.repoUrl) {
    throw new Error('Git source url missing.');
  }

  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'skilio-'));
  const branchPart = source.branch ? `--branch ${source.branch}` : '';
  const command = `git clone --depth 1 ${branchPart} "${source.repoUrl}" "${tempDir}"`;
  const result = await runCommand(command, { cwd: rootDir });
  if (result.code !== 0) {
    await fs.rm(tempDir, { recursive: true, force: true });
    throw new Error(`Failed to clone ${source.repoUrl}`);
  }

  return {
    dir: tempDir,
    cleanup: async () => {
      await fs.rm(tempDir, { recursive: true, force: true });
    },
  };
};

const scanSkillsDir = async (skillsDir: string, rootDir: string) => {
  if (!(await pathExists(skillsDir))) return [] as SourceSkill[];
  const subDirs = await listAllDirsByDir(skillsDir);
  const results: SourceSkill[] = [];

  for (const sub of subDirs) {
    if (!isValidSkillName(sub)) {
      await appendDebugLog(rootDir, `Invalid skill name: ${sub} @ ${skillsDir}`);
      continue;
    }
    const skillDir = path.join(skillsDir, sub);
    const parsed = await readSkillByDir(skillDir);
    if (!parsed.ok) {
      await appendDebugLog(rootDir, `Invalid SKILL.md: ${skillDir}. ${parsed.error}`);
      if (!parsed.missing && parsed.error.trim()) {
        warn(`Invalid SKILL.md: ${skillDir}. ${parsed.error}`);
      }
      continue;
    }
    if (parsed.skill.name !== sub) {
      await appendDebugLog(rootDir, `Skill name mismatch: ${skillDir}. folder=${sub}, name=${parsed.skill.name}`);
      warn(`Skill name mismatch: ${skillDir}. folder=${sub}, name=${parsed.skill.name}`);
      continue;
    }
    results.push({ name: sub, dir: skillDir, copyMode: 'full' });
  }

  return results;
};

export const listSourceSkills = async (sourceDir: string, source: SourceSpec, rootDir: string) => {
  if (source.skillName) {
    const skillDir = path.join(sourceDir, source.subPath ?? path.join('skills', source.skillName));
    if (!(await pathExists(skillDir))) {
      await appendDebugLog(rootDir, `Missing skill dir: ${skillDir}`);
      return [] as SourceSkill[];
    }
    const parsed = await readSkillByDir(skillDir);
    if (!parsed.ok) {
      await appendDebugLog(rootDir, `Invalid SKILL.md: ${skillDir}. ${parsed.error}`);
      if (!parsed.missing && parsed.error.trim()) {
        warn(`Invalid SKILL.md: ${skillDir}. ${parsed.error}`);
      }
      return [] as SourceSkill[];
    }
    if (parsed.skill.name !== source.skillName) {
      await appendDebugLog(
        rootDir,
        `Skill name mismatch: ${skillDir}. folder=${source.skillName}, name=${parsed.skill.name}`
      );
      warn(`Skill name mismatch: ${skillDir}. folder=${source.skillName}, name=${parsed.skill.name}`);
      return [] as SourceSkill[];
    }
    return [{ name: source.skillName, dir: skillDir, copyMode: 'full' }];
  }

  const skillsDir = path.join(sourceDir, source.subPath ?? 'skills');
  const scanned = await scanSkillsDir(skillsDir, rootDir);
  if (scanned.length) return scanned;

  const rootParsed = await readSkillByDir(sourceDir);
  if (rootParsed.ok) {
    if (!isValidSkillName(rootParsed.skill.name)) {
      await appendDebugLog(rootDir, `Invalid skill name: ${rootParsed.skill.name} @ ${sourceDir}`);
      warn(`Invalid skill name: ${rootParsed.skill.name} @ ${sourceDir}`);
      return [] as SourceSkill[];
    }
    return [{ name: rootParsed.skill.name, dir: sourceDir, copyMode: 'root' }];
  }
  if (!rootParsed.missing) {
    await appendDebugLog(rootDir, `Invalid SKILL.md: ${sourceDir}. ${rootParsed.error}`);
    if (rootParsed.error.trim()) {
      warn(`Invalid SKILL.md: ${sourceDir}. ${rootParsed.error}`);
    }
  }
  return [] as SourceSkill[];
};
