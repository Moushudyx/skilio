import path from 'path';
import fs from 'fs/promises';
import { SkilioConfig } from './config';
import { appendDebugLog } from './debug';
import { listAllDirsByDir, pathExists } from './utils/fs';
import { checkSymlink, createSymlink, isSymlinkLike } from './utils/symlink';
import { scanSkillsFromBase, ScannedSkill, listRootSkills } from './skills';

// Build link name for npm skills: npm-<pkg>-<skill>
const getNpmSkillLinkName = (prefix: string, pkgName: string, skillName: string) => {
  const safePkg = pkgName.replace('/', '-');
  return `${prefix}${safePkg}-${skillName}`;
};

// Build link name for workspace package skills: package-<pkg>-<skill>
const getPackageSkillLinkName = (prefix: string, pkgName: string, skillName: string) => {
  return `${prefix}${pkgName}-${skillName}`;
};

const scanNodeModules = async (rootDir: string) => {
  const result: { skill: ScannedSkill; linkName: string }[] = [];
  const nodeModulesDir = path.join(rootDir, 'node_modules');
  if (!(await pathExists(nodeModulesDir))) return result;

  const modules = await listAllDirsByDir(nodeModulesDir);
  for (const mod of modules) {
    if (mod.startsWith('@')) {
      const scopeDir = path.join(nodeModulesDir, mod);
      const scoped = await listAllDirsByDir(scopeDir);
      for (const scopedName of scoped) {
        const fullName = `${mod}/${scopedName}`;
        const skills = await scanSkillsFromBase(path.join(scopeDir, scopedName), 'npm', fullName, rootDir);
        for (const skill of skills) {
          result.push({
            skill,
            linkName: getNpmSkillLinkName(DEFAULT_PREFIX_NPM, fullName, skill.name),
          });
        }
      }
      continue;
    }
    const skills = await scanSkillsFromBase(path.join(nodeModulesDir, mod), 'npm', mod, rootDir);
    for (const skill of skills) {
      result.push({
        skill,
        linkName: getNpmSkillLinkName(DEFAULT_PREFIX_NPM, mod, skill.name),
      });
    }
  }

  return result;
};

// Fallback prefixes if config values are empty.
const DEFAULT_PREFIX_NPM = 'npm-';
const DEFAULT_PREFIX_PACKAGE = 'package-';

// Scan node_modules and packages, then link skills into root skills/ directory.
export const scanProject = async (rootDir: string, config: SkilioConfig) => {
  const rootSkillsDir = path.join(rootDir, 'skills');
  await fs.mkdir(rootSkillsDir, { recursive: true });

  const prefixNpm = config.skillLinkPrefixNpm || DEFAULT_PREFIX_NPM;
  const prefixPackage = config.skillLinkPrefixPackage || DEFAULT_PREFIX_PACKAGE;

  const scanned: { skill: ScannedSkill; linkName: string }[] = [];

  if (config.scanNpm) {
    const nodeModulesDir = path.join(rootDir, 'node_modules');
    if (await pathExists(nodeModulesDir)) {
      const modules = await listAllDirsByDir(nodeModulesDir);
      for (const mod of modules) {
        if (mod.startsWith('@')) {
          const scopeDir = path.join(nodeModulesDir, mod);
          const scoped = await listAllDirsByDir(scopeDir);
          for (const scopedName of scoped) {
            const fullName = `${mod}/${scopedName}`;
            const skills = await scanSkillsFromBase(path.join(scopeDir, scopedName), 'npm', fullName, rootDir);
            for (const skill of skills) {
              scanned.push({
                skill,
                linkName: getNpmSkillLinkName(prefixNpm, fullName, skill.name),
              });
            }
          }
          continue;
        }
        const skills = await scanSkillsFromBase(path.join(nodeModulesDir, mod), 'npm', mod, rootDir);
        for (const skill of skills) {
          scanned.push({
            skill,
            linkName: getNpmSkillLinkName(prefixNpm, mod, skill.name),
          });
        }
      }
    }
  }

  if (config.scanPackages) {
    const packagesDir = path.join(rootDir, 'packages');
    if (await pathExists(packagesDir)) {
      const packages = await listAllDirsByDir(packagesDir);
      for (const pkg of packages) {
        const skills = await scanSkillsFromBase(path.join(packagesDir, pkg), 'package', pkg, rootDir);
        for (const skill of skills) {
          scanned.push({
            skill,
            linkName: getPackageSkillLinkName(prefixPackage, pkg, skill.name),
          });
        }
      }
    }
  }

  // Avoid duplicate link names (conflicts are logged, not overwritten).
  const usedNames = new Set<string>();
  for (const entry of scanned) {
    if (usedNames.has(entry.linkName)) {
      await appendDebugLog(rootDir, `Duplicate skill link name: ${entry.linkName}`);
      continue;
    }
    usedNames.add(entry.linkName);

    const linkPath = path.join(rootSkillsDir, entry.linkName);
    // If link exists and is a real directory, keep it and log a conflict.
    if (await pathExists(linkPath)) {
      try {
        if (!(await isSymlinkLike(linkPath))) {
          await appendDebugLog(rootDir, `Conflict: ${linkPath} exists and is not a symlink.`);
          continue;
        }
        await fs.unlink(linkPath);
      } catch (error) {
        await appendDebugLog(rootDir, `Failed to update link: ${linkPath} ${String(error)}`);
        continue;
      }
    }

    await createSymlink(entry.skill.dir, linkPath);
  }

  if (config.cleanLinks) {
    const entries = await fs.readdir(rootSkillsDir, { withFileTypes: true });
    for (const entry of entries) {
      const name = entry.name;
      const linkPath = path.join(rootSkillsDir, name);

      if (!(await isSymlinkLike(linkPath))) {
        continue;
      }

      const isNpmLink = name.startsWith(prefixNpm);
      const isPackageLink = name.startsWith(prefixPackage);
      const shouldCheckSource =
        (isNpmLink && config.scanNpm) || (isPackageLink && config.scanPackages) || (!isNpmLink && !isPackageLink);

      if (!shouldCheckSource) {
        continue;
      }

      const isValid = await checkSymlink(linkPath);
      if (!isValid) {
        if (await isSymlinkLike(linkPath)) {
          await fs.unlink(linkPath).catch(() => null);
        }
        continue;
      }

      if ((isNpmLink || isPackageLink) && !usedNames.has(name)) {
        await fs.unlink(linkPath).catch(() => null);
      }
    }
  }

  const rootSkills = await listRootSkills(rootDir);
  return { rootSkills };
};
