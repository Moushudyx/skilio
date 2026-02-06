import fs from 'fs/promises';
import path from 'path';
import trash from 'trash';
import { SkilioConfig, writeConfig } from './config';
import { listRootSkills } from './skills';
import { syncAgentSkills } from './sync';
import { AgentId } from './constants/agents';
import { appendDebugLog } from './debug';
import { listSourceSkills, parseSourceInput, parseSourceKey, fetchSourceToTemp } from './source';
import { ensureDir, pathExists } from './utils/fs';
import { isSymlinkLike } from './utils/symlink';

const buildDisabledSet = (config: SkilioConfig, agent: AgentId) => {
  const disabled = new Set<string>();
  for (const [name, agents] of Object.entries(config.skillDisabled)) {
    if (!agents.length || agents.includes(agent)) {
      disabled.add(name);
    }
  }
  return disabled;
};

const applyDisabledForAgents = (
  config: SkilioConfig,
  name: string,
  enabledAgents: AgentId[],
  knownAgents: AgentId[],
  applyDisabled: boolean
) => {
  if (!applyDisabled) return;
  const disabled = knownAgents.filter((agent) => !enabledAgents.includes(agent));
  if (disabled.length) {
    config.skillDisabled[name] = disabled;
  }
};

export type UpdateResult = {
  updated: string[];
  added: string[];
  removed: string[];
  skipped: string[];
};

export const updateInstalled = async (options: {
  rootDir: string;
  config: SkilioConfig;
  agents: AgentId[];
  knownAgents: AgentId[];
  applyDisabled: boolean;
  sources?: string[];
  skills?: string[];
}) => {
  const { rootDir, config, agents, knownAgents, applyDisabled, sources, skills } = options;
  const skillFilter = skills?.length ? new Set(skills) : null;
  const isFullUpdate = !sources?.length && !skills?.length;

  const sourceSpecs = sources?.length
    ? await Promise.all(sources.map((source) => parseSourceInput(source, rootDir)))
    : Object.keys(config.installSources).map((key) => parseSourceKey(key));

  const result: UpdateResult = {
    updated: [],
    added: [],
    removed: [],
    skipped: [],
  };

  await ensureDir(path.join(rootDir, 'skills'));

  for (const spec of sourceSpecs) {
    if (!config.installSources[spec.key]) {
      await appendDebugLog(rootDir, `Source not installed: ${spec.key}`);
      continue;
    }

    const { dir, cleanup } = await fetchSourceToTemp(spec, rootDir);
    try {
      const sourceSkills = await listSourceSkills(dir, spec, rootDir);
      const sourceMap = new Map(sourceSkills.map((skill) => [skill.name, skill.dir]));

      const installed = config.installSources[spec.key] ?? [];
      const targets = installed.filter((name) => (skillFilter ? skillFilter.has(name) : true));

      for (const name of targets) {
        const targetDir = path.join(rootDir, 'skills', name);
        const sourceDir = sourceMap.get(name);
        if (!sourceDir) {
          if (isFullUpdate) {
            if (await pathExists(targetDir)) {
              if (await isSymlinkLike(targetDir)) {
                await appendDebugLog(rootDir, `Skip removing symlink: ${targetDir}`);
                result.skipped.push(name);
              } else {
                await trash(targetDir);
                result.removed.push(name);
              }
            }
            delete config.skillDisabled[name];
            config.installSources[spec.key] = installed.filter((item) => item !== name);
          } else {
            await appendDebugLog(rootDir, `Missing remote skill: ${name} @ ${spec.key}`);
            result.skipped.push(name);
          }
          continue;
        }

        if (await pathExists(targetDir)) {
          if (await isSymlinkLike(targetDir)) {
            await appendDebugLog(rootDir, `Update conflict: ${targetDir} is a symlink.`);
            result.skipped.push(name);
            continue;
          }
          await fs.rm(targetDir, { recursive: true, force: true });
        }

        await fs.cp(sourceDir, targetDir, { recursive: true });
        if (!installed.includes(name)) {
          installed.push(name);
        }
        result.updated.push(name);
      }

      if (!skillFilter) {
        for (const [name, sourceDir] of sourceMap) {
          if (installed.includes(name)) continue;
          const targetDir = path.join(rootDir, 'skills', name);
          if (await pathExists(targetDir)) {
            await appendDebugLog(rootDir, `Update conflict: ${targetDir} already exists.`);
            result.skipped.push(name);
            continue;
          }
          await fs.cp(sourceDir, targetDir, { recursive: true });
          installed.push(name);
          result.added.push(name);
          applyDisabledForAgents(config, name, agents, knownAgents, applyDisabled);
        }
      }

      config.installSources[spec.key] = installed;
      if (!config.installSources[spec.key].length) {
        delete config.installSources[spec.key];
      }
    } finally {
      await cleanup();
    }
  }

  await writeConfig(rootDir, config);

  const rootSkills = await listRootSkills(rootDir);
  for (const agent of agents) {
    const disabled = buildDisabledSet(config, agent);
    await syncAgentSkills(rootDir, agent, rootSkills, disabled, true);
  }

  return result;
};
