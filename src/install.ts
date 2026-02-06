import fs from 'fs/promises';
import path from 'path';
import { SkilioConfig, writeConfig } from './config';
import { appendDebugLog } from './debug';
import { listRootSkills } from './skills';
import { syncAgentSkills } from './sync';
import { AgentId } from './constants/agents';
import { ensureDir, pathExists } from './utils/fs';
import { listSourceSkills, parseSourceInput, fetchSourceToTemp } from './source';

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

export type InstallResult = {
  installed: string[];
  skipped: string[];
  sourceKey: string;
};

export const installFromSource = async (options: {
  rootDir: string;
  config: SkilioConfig;
  sourceInput: string;
  agents: AgentId[];
  knownAgents: AgentId[];
  applyDisabled: boolean;
}) => {
  const { rootDir, config, sourceInput, agents, knownAgents, applyDisabled } = options;
  const source = await parseSourceInput(sourceInput, rootDir);

  if (config.installSources[source.key]) {
    throw new Error(`Source already installed: ${source.display}`);
  }

  const { dir, cleanup } = await fetchSourceToTemp(source, rootDir);
  try {
    const skills = await listSourceSkills(dir, source, rootDir);
    if (!skills.length) {
      throw new Error('No valid skills found in source.');
    }

    await ensureDir(path.join(rootDir, 'skills'));

    const installed: string[] = [];
    const skipped: string[] = [];

    for (const skill of skills) {
      if (
        skill.name.startsWith(config.skillLinkPrefixNpm) ||
        skill.name.startsWith(config.skillLinkPrefixPackage)
      ) {
        await appendDebugLog(rootDir, `Install skipped invalid prefix: ${skill.name}`);
        skipped.push(skill.name);
        continue;
      }

      const targetDir = path.join(rootDir, 'skills', skill.name);
      if (await pathExists(targetDir)) {
        await appendDebugLog(rootDir, `Install conflict: ${targetDir} already exists.`);
        skipped.push(skill.name);
        continue;
      }

      await fs.cp(skill.dir, targetDir, { recursive: true });
      installed.push(skill.name);
      applyDisabledForAgents(config, skill.name, agents, knownAgents, applyDisabled);
    }

    if (!installed.length) {
      throw new Error('No skills installed due to conflicts or invalid names.');
    }

    config.installSources[source.key] = installed;
    await writeConfig(rootDir, config);

    const rootSkills = await listRootSkills(rootDir);
    for (const agent of agents) {
      const disabled = new Set<string>(
        Object.entries(config.skillDisabled)
          .filter(([, agentIds]) => agentIds.length === 0 || agentIds.includes(agent))
          .map(([name]) => name)
      );
      await syncAgentSkills(rootDir, agent, rootSkills, disabled, true);
    }

    return { installed, skipped, sourceKey: source.key };
  } finally {
    await cleanup();
  }
};
