import path from 'path';
import { moveToTrash } from './utils/trash';
import { SkilioConfig, writeConfig } from './config';
import { listRootSkills } from './skills';
import { syncAgentSkills } from './sync';
import { AgentId } from './constants/agents';
import { appendDebugLog } from './debug';
import { parseSourceInput, parseSourceKey, SourceSpec } from './source';
import { pathExists } from './utils/fs';
import { isSymlinkLike } from './utils/symlink';
import { matchesAnySkillPattern, matchesSkillPattern } from './utils/skill';

// Resolve disabled skills for a single agent; empty list means disabled for all.
const buildDisabledSet = (config: SkilioConfig, agent: AgentId) => {
  const disabled = new Set<string>();
  for (const [name, agents] of Object.entries(config.skillDisabled)) {
    if (!agents.length || agents.includes(agent)) {
      disabled.add(name);
    }
  }
  return disabled;
};

// Normalize and de-duplicate stored lists.
const dedupe = (items: string[]) => Array.from(new Set(items));

// Allow uninstall to accept install-style inputs or stored source keys.
const resolveUninstallSource = async (sourceInput: string, rootDir: string): Promise<SourceSpec> => {
  try {
    return await parseSourceInput(sourceInput, rootDir);
  } catch (error) {
    if (sourceInput.startsWith('git:') || sourceInput.startsWith('local:')) {
      return parseSourceKey(sourceInput);
    }
    throw error;
  }
};

export type UninstallResult = {
  removed: string[];
  skipped: string[];
  missing: string[];
  sourceKey: string;
  display: string;
};

export const uninstallFromSource = async (options: {
  rootDir: string;
  config: SkilioConfig;
  sourceInput: string;
  agents: AgentId[];
  skillPatterns?: string[];
}): Promise<UninstallResult> => {
  const { rootDir, config, sourceInput, agents, skillPatterns } = options;
  const source = await resolveUninstallSource(sourceInput, rootDir);
  const record = config.installSources[source.key];
  if (!record) {
    throw new Error(`Source not installed: ${source.display}`);
  }

  const installed = record.installed ?? [];
  const patterns = (skillPatterns ?? []).filter(Boolean);
  // When no patterns are provided, uninstall the entire source.
  const targets = patterns.length ? installed.filter((name) => matchesAnySkillPattern(name, patterns)) : installed;
  // Track patterns that do not match any installed skill.
  const missing = patterns.length
    ? patterns.filter((pattern) => !installed.some((name) => matchesSkillPattern(name, pattern)))
    : [];

  if (!targets.length) {
    return { removed: [], skipped: [], missing, sourceKey: source.key, display: source.display };
  }

  const removed: string[] = [];
  const skipped: string[] = [];

  for (const name of targets) {
    const targetDir = path.join(rootDir, 'skills', name);
    if (await pathExists(targetDir)) {
      if (await isSymlinkLike(targetDir)) {
        await appendDebugLog(rootDir, `Uninstall skipped symlink: ${targetDir}`);
        skipped.push(name);
        continue;
      }
      await moveToTrash(targetDir);
    } else {
      await appendDebugLog(rootDir, `Uninstall missing local dir: ${targetDir}`);
    }
    removed.push(name);
    delete config.skillDisabled[name];
  }

  const removedSet = new Set(removed);
  const nextInstalled = installed.filter((name) => !removedSet.has(name));

  if (patterns.length) {
    // Keep the source record and prevent re-add by extending exclude.
    record.installed = nextInstalled;
    record.exclude = dedupe([...(record.exclude ?? []), ...removed]);
    if (record.mode === 'only') {
      // Remove explicit include entries (non-wildcard) for removed skills.
      record.include = (record.include ?? []).filter((pattern) => !(removedSet.has(pattern) && !pattern.includes('*')));
    }
    if (!record.installed.length) {
      delete config.installSources[source.key];
    } else {
      config.installSources[source.key] = record;
    }
  } else {
    delete config.installSources[source.key];
  }

  await writeConfig(rootDir, config);

  const rootSkills = await listRootSkills(rootDir);
  for (const agent of agents) {
    const disabled = buildDisabledSet(config, agent);
    await syncAgentSkills(rootDir, agent, rootSkills, disabled, true);
  }

  return { removed, skipped, missing, sourceKey: source.key, display: source.display };
};
