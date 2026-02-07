import fs from 'fs/promises';
import path from 'path';
import { InstallSourceRecord, SkilioConfig, writeConfig } from './config';
import { appendDebugLog } from './debug';
import { listRootSkills } from './skills';
import { syncAgentSkills } from './sync';
import { AgentId } from './constants/agents';
import { ensureDir, pathExists } from './utils/fs';
import { listSourceSkills, parseSourceInput, fetchSourceToTemp } from './source';
import { matchesAnySkillPattern } from './utils/skill';
import { copyRootSkill } from './utils/skillCopy';

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
  skillPatterns?: string[];
}) => {
  const { rootDir, config, sourceInput, agents, knownAgents, applyDisabled, skillPatterns } = options;
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

    const patterns = (skillPatterns ?? []).filter(Boolean);
    const selected = patterns.length ? skills.filter((skill) => matchesAnySkillPattern(skill.name, patterns)) : skills;
    if (!selected.length) {
      throw new Error('No skills matched the provided patterns.');
    }

    await ensureDir(path.join(rootDir, 'skills'));

    const installed: string[] = [];
    const skipped: string[] = [];

    for (const skill of selected) {
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

      if (skill.copyMode === 'root') {
        await copyRootSkill(skill.dir, targetDir);
      } else {
        await fs.cp(skill.dir, targetDir, { recursive: true });
      }
      installed.push(skill.name);
      applyDisabledForAgents(config, skill.name, agents, knownAgents, applyDisabled);
    }

    if (!installed.length) {
      throw new Error('No skills installed due to conflicts or invalid names.');
    }

    const selectionPatterns = patterns.length ? patterns : source.skillName ? [source.skillName] : [];
    const record: InstallSourceRecord = {
      mode: selectionPatterns.length ? 'only' : 'all',
      include: selectionPatterns.length ? selectionPatterns : [],
      exclude: [],
      installed,
    };
    config.installSources[source.key] = record;
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
