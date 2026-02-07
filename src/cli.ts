import { Command } from 'commander';
import path from 'path';
import fs from 'fs/promises';
import { checkbox, confirm } from '@inquirer/prompts';
import trash from 'trash';
import { readConfig, updateConfig, writeConfig, SkilioConfig } from './config';
import { AGENTS, AgentId, getAllAgentIds } from './constants/agents';
import { guessAgents } from './agents';
import { scanProject } from './scan';
import { listRootSkills, isLocalSkillDir } from './skills';
import { syncAgentSkills } from './sync';
import { installFromSource } from './install';
import { updateInstalled } from './update';
import { uninstallFromSource } from './uninstall';
import { checkUpdates } from './check';
import { info, subInfo, warn, success, error } from './utils/log';
import { ensureDir, pathExists } from './utils/fs';
import { isSymlinkLike } from './utils/symlink';
import { appendDebugLog } from './debug';

// Parse comma-separated agents list from CLI options.
const parseAgents = (value?: string): AgentId[] => {
  if (!value) return [];
  return value
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean) as AgentId[];
};

const parseList = (value?: string): string[] => {
  if (!value) return [];
  return value
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean);
};

type AgentResolutionSource = 'cli' | 'default' | 'guess' | 'prompt';
type AgentResolution = {
  agents: AgentId[];
  source: AgentResolutionSource;
  knownAgents: AgentId[];
};

const isExplicitSelection = (source: AgentResolutionSource) => source === 'cli' || source === 'default' || source === 'prompt';

// Resolve target agents by priority: CLI > config.defaultAgents > guess > prompt (if allowed).
const resolveAgents = async (
  rootDir: string,
  config: SkilioConfig,
  cliAgents: AgentId[],
  noPrompt?: boolean
): Promise<AgentResolution> => {
  const knownAgents = await guessAgents(rootDir);
  if (cliAgents.length) return { agents: cliAgents, source: 'cli', knownAgents };
  if (config.defaultAgents.length) return { agents: config.defaultAgents, source: 'default', knownAgents };
  if (knownAgents.length) return { agents: knownAgents, source: 'guess', knownAgents };
  if (noPrompt || !config.showPrompt) {
    throw new Error('No agent detected. Use --agent or set defaultAgents in config.');
  }

  const selected = await checkbox({
    message: 'Select target agents/IDEs',
    choices: AGENTS.filter((agent) => agent.id !== 'openclaw').map((agent) => ({
      name: `${agent.name} (${agent.id})`,
      value: agent.id,
    })),
  });

  return { agents: selected as AgentId[], source: 'prompt', knownAgents };
};

// For a newly created local skill, mark known-but-unselected agents as disabled.
const buildDisabledMap = (
  config: SkilioConfig,
  skillName: string,
  enabledAgents: AgentId[],
  knownAgents: AgentId[],
  applyDisabled: boolean
) => {
  if (!applyDisabled) return;
  const disabled = knownAgents.filter((agent) => !enabledAgents.includes(agent));
  if (disabled.length) {
    config.skillDisabled[skillName] = disabled;
  }
};

// Build disabled set for one agent; empty array means disabled for all agents.
const getDisabledSet = (config: SkilioConfig, agent: AgentId) => {
  const disabled = new Set<string>();
  for (const [name, agents] of Object.entries(config.skillDisabled)) {
    if (!agents.length || agents.includes(agent)) {
      disabled.add(name);
    }
  }
  return disabled;
};

// CLI entry.
const program = new Command();

// Parse config value from CLI string input.
const parseConfigValue = (value: string) => {
  if (value === 'true') return true;
  if (value === 'false') return false;
  if (value.includes(',')) return value.split(',').map((v) => v.trim());
  return value;
};

program.name('skilio').description('A lightweight agent skills manager').version('1.0.0');

program
  .command('scan')
  .description('Scan skills and sync links')
  .option('--no-prompt', 'Disable interactive prompt')
  .option('--agent <agents>', 'Target agents, comma separated')
  .option('--no-npm', 'Do not scan node_modules')
  .option('--no-packages', 'Do not scan packages')
  .option('--no-clean', 'Do not clean invalid links')
  .action(async (options) => {
    const rootDir = process.cwd();
    const config = await readConfig(rootDir);
    // CLI flags override config for this run only when explicitly provided.
    const argv = process.argv;
    const hasNpmFlag = argv.includes('--npm') || argv.includes('--no-npm');
    const hasPackagesFlag = argv.includes('--packages') || argv.includes('--no-packages');
    const hasCleanFlag = argv.includes('--clean') || argv.includes('--no-clean');
    if (hasNpmFlag) config.scanNpm = options.npm;
    if (hasPackagesFlag) config.scanPackages = options.packages;
    if (hasCleanFlag) config.cleanLinks = options.clean;

    const cliAgents = parseAgents(options.agent);
    const resolution = await resolveAgents(rootDir, config, cliAgents, options.prompt === false);
    const agents = resolution.agents;

    info('Scanning skills...');
    const { rootSkills } = await scanProject(rootDir, config);

    for (const agent of agents) {
      const disabled = getDisabledSet(config, agent);
      await syncAgentSkills(rootDir, agent, rootSkills, disabled, config.cleanLinks);
    }

    success(`Scan complete. ${rootSkills.length} skills available.`);
  });

program
  .command('init')
  .alias('create')
  .description('Initialize a new local skill')
  .argument('<skill-name>', 'Skill folder name')
  .option('--no-prompt', 'Disable interactive prompt')
  .option('--agent <agents>', 'Target agents, comma separated')
  .action(async (name, options) => {
    const rootDir = process.cwd();
    const config = await readConfig(rootDir);
    const cliAgents = parseAgents(options.agent);
    const resolution = await resolveAgents(rootDir, config, cliAgents, options.prompt === false);
    const agents = resolution.agents;

    // Avoid confusing local skill name with external link prefixes.
    if (name.startsWith(config.skillLinkPrefixNpm) || name.startsWith(config.skillLinkPrefixPackage)) {
      throw new Error('Skill name cannot start with npm- or package- prefix.');
    }

    const skillDir = path.join(rootDir, 'skills', name);
    if (await pathExists(skillDir)) {
      throw new Error(`Skill already exists: ${name}`);
    }

    await ensureDir(skillDir);
    const skillFile = path.join(skillDir, 'SKILL.md');
    // Minimal frontmatter; description is required but can be empty string.
    const content = `---\nname: ${name}\ndescription: ''\nmetadata:\n  author: ''\n---\n`;
    await fs.writeFile(skillFile, content, 'utf-8');

    buildDisabledMap(config, name, agents, resolution.knownAgents, isExplicitSelection(resolution.source));
    await writeConfig(rootDir, config);

    const rootSkills = await listRootSkills(rootDir);
    for (const agent of agents) {
      const disabled = getDisabledSet(config, agent);
      await syncAgentSkills(rootDir, agent, rootSkills, disabled, true);
    }

    success(`Skill created: ${name}`);
  });

program
  .command('delete')
  .alias('del')
  .alias('remove')
  .description('Delete a local skill')
  .argument('<skill-name>', 'Skill folder name')
  .option('--no-prompt', 'Disable interactive prompt')
  .action(async (name, options) => {
    const rootDir = process.cwd();
    const config = await readConfig(rootDir);

    if (!(await pathExists(path.join(rootDir, 'skills', name)))) {
      throw new Error(`Skill not found: ${name}`);
    }

    // Only local (non-symlink) skills can be deleted directly.
    if (!(await isLocalSkillDir(rootDir, name))) {
      throw new Error('Only local skills can be deleted. Use disable for external skills.');
    }

    const inInstallSources = Object.values(config.installSources).some((record) => record.installed.includes(name));
    if (inInstallSources) {
      throw new Error('Skill comes from install sources and cannot be deleted directly.');
    }

    // Destructive action: confirm unless prompt is disabled.
    if (options.prompt !== false) {
      const ok = await confirm({ message: `Delete skill ${name}? This is irreversible.` });
      if (!ok) return;
    }

    // Move to recycle bin instead of permanent deletion.
    // try {
    await trash(path.join(rootDir, 'skills', name));
    // } catch {
    //   await fs.rm(path.join(rootDir, 'skills', name), { recursive: true, force: true });
    // }

    // Remove symlink from agent config dirs only; never remove real directories.
    for (const agent of getAllAgentIds()) {
      if (agent === 'openclaw') continue;
      const agentDir = path.join(rootDir, AGENTS.find((a) => a.id === agent)?.configDir ?? '');
      if (agentDir && (await pathExists(agentDir))) {
        const linkPath = path.join(agentDir, name);
        if (await pathExists(linkPath)) {
          if (await isSymlinkLike(linkPath)) {
            await fs.unlink(linkPath).catch(() => null);
          }
        }
      }
    }

    delete config.skillDisabled[name];
    await writeConfig(rootDir, config);

    success(`Skill deleted: ${name}`);
  });

program
  .command('disable')
  .description('Disable a skill')
  .argument('<skill-name>', 'Skill name')
  .option('--no-prompt', 'Disable interactive prompt')
  .option('--agent <agents>', 'Target agents, comma separated')
  .action(async (name, options) => {
    const rootDir = process.cwd();
    const config = await readConfig(rootDir);
    const cliAgents = parseAgents(options.agent);
    const agents = cliAgents.length ? cliAgents : getAllAgentIds();

    // Empty array means disabled for all agents.
    config.skillDisabled[name] = cliAgents.length ? agents : [];
    await writeConfig(rootDir, config);

    const rootSkills = await listRootSkills(rootDir);
    for (const agent of agents) {
      const disabled = getDisabledSet(config, agent);
      await syncAgentSkills(rootDir, agent, rootSkills, disabled, true);
    }

    success(`Skill disabled: ${name}`);
  });

program
  .command('enable')
  .description('Enable a skill')
  .argument('<skill-name>', 'Skill name')
  .option('--agent <agents>', 'Target agents, comma separated')
  .action(async (name, options) => {
    const rootDir = process.cwd();
    const config = await readConfig(rootDir);
    const cliAgents = parseAgents(options.agent);

    if (!config.skillDisabled[name]) {
      warn('Skill is not disabled.');
      return;
    }

    // Remove all disables when no agent filter is provided.
    if (cliAgents.length === 0) {
      delete config.skillDisabled[name];
    } else {
      const current = new Set(config.skillDisabled[name]);
      for (const agent of cliAgents) {
        current.delete(agent);
      }
      const next = Array.from(current);
      if (next.length === 0) {
        delete config.skillDisabled[name];
      } else {
        config.skillDisabled[name] = next;
      }
    }

    await writeConfig(rootDir, config);

    const rootSkills = await listRootSkills(rootDir);
    const agents = cliAgents.length ? cliAgents : getAllAgentIds();
    for (const agent of agents) {
      const disabled = getDisabledSet(config, agent);
      await syncAgentSkills(rootDir, agent, rootSkills, disabled, true);
    }

    success(`Skill enabled: ${name}`);
  });

program
  .command('ls')
  .alias('list')
  .description('List managed skills')
  .option('--show-disabled', 'Show disabled skills')
  .option('--agent <agents>', 'Target agents, comma separated')
  .action(async (options) => {
    const rootDir = process.cwd();
    const config = await readConfig(rootDir);
    const agents = parseAgents(options.agent);

    const skills = await listRootSkills(rootDir);
    if (!agents.length) {
      info(`Skills in root: ${skills.length}`);
      for (const skill of skills) {
        const disabled = config.skillDisabled[skill];
        if (disabled && disabled.length === 0 && !options.showDisabled) {
          continue;
        }
        if (options.showDisabled && disabled) {
          subInfo(`${skill} (disabled: ${disabled.length ? disabled.join(',') : 'all'})`);
        } else {
          subInfo(skill);
        }
      }
      return;
    }

    for (const agent of agents) {
      const agentDir = path.join(rootDir, AGENTS.find((a) => a.id === agent)?.configDir ?? '');
      if (!agentDir || !(await pathExists(agentDir))) {
        warn(`Agent dir missing: ${agent}`);
        continue;
      }
      const entries = await fs.readdir(agentDir, { withFileTypes: true });
      info(`${agent} skills: ${entries.length}`);
      for (const entry of entries) {
        subInfo(entry.name);
      }
    }
  });

program
  .command('config')
  .alias('cfg')
  .description('Get or set configuration')
  .argument('[key]', 'Config key')
  .argument('[value]', 'Config value')
  .action(async (key, value) => {
    const rootDir = process.cwd();
    if (!key) {
      const config = await readConfig(rootDir);
      console.log(JSON.stringify(config, null, 2));
      return;
    }

    if (value === undefined) {
      const config = await readConfig(rootDir);
      console.log(JSON.stringify((config as any)[key], null, 2));
      return;
    }

    // Prevent users from modifying tool-managed fields.
    const forbidden = new Set(['skillDisabled', 'installSources']);
    if (forbidden.has(key)) {
      throw new Error(`${key} is managed by skilio and cannot be modified via this command.`);
    }

    const parsedValue = parseConfigValue(value);
    await updateConfig(rootDir, { [key]: parsedValue } as any);
    success(`Config updated: ${key}`);
  });

program
  .command('install')
  .alias('add')
  .alias('i')
  .alias('pull')
  .description('Install skills from repository')
  .argument('<source>', 'Skill source (repo, repo/tree/branch, repo/tree/branch/skills/name, or git URL)')
  .option('--no-prompt', 'Disable interactive prompts')
  .option('--agent <agents>', 'Target agents, comma separated')
  .option('--skills <skills>', 'Only install matching skills (comma separated, supports *)')
  .action(async (source, options) => {
    const rootDir = process.cwd();
    const config = await readConfig(rootDir);
    const cliAgents = parseAgents(options.agent);
    const resolution = await resolveAgents(rootDir, config, cliAgents, options.prompt === false);
    const agents = resolution.agents;
    const skills = parseList(options.skills);

    info(`Installing from ${source}...`);
    const result = await installFromSource({
      rootDir,
      config,
      sourceInput: source,
      agents,
      knownAgents: resolution.knownAgents,
      applyDisabled: isExplicitSelection(resolution.source),
      skillPatterns: skills,
    });

    if (result.skipped.length) {
      warn(`Skipped: ${result.skipped.join(', ')}`);
    }
    success(`Installed ${result.installed.length} skills.`);
  });

program
  .command('update')
  .alias('up')
  .description('Update installed skills')
  .option('--no-prompt', 'Disable interactive prompts')
  .option('--agent <agents>', 'Target agents, comma separated')
  .option('--source <sources>', 'Filter by sources, comma separated')
  .option('--skills <skills>', 'Filter by skill names, comma separated')
  .action(async (options) => {
    const rootDir = process.cwd();
    const config = await readConfig(rootDir);
    const cliAgents = parseAgents(options.agent);
    const resolution = await resolveAgents(rootDir, config, cliAgents, options.prompt === false);
    const agents = resolution.agents;
    const sources = parseList(options.source);
    const skills = parseList(options.skills);

    info('Updating installed skills...');
    const result = await updateInstalled({
      rootDir,
      config,
      agents,
      knownAgents: resolution.knownAgents,
      applyDisabled: isExplicitSelection(resolution.source),
      sources,
      skills,
    });

    if (result.removed.length) subInfo(`Removed: ${result.removed.join(', ')}`);
    if (result.added.length) subInfo(`Added: ${result.added.join(', ')}`);
    if (result.updated.length) subInfo(`Updated: ${result.updated.join(', ')}`);
    if (result.skipped.length) warn(`Skipped: ${result.skipped.join(', ')}`);

    success('Update complete.');
  });

program
  .command('uninstall')
  .description('Uninstall skills from an installed source')
  .argument('<source>', 'Installed source (same format as install)')
  .option('--no-prompt', 'Disable interactive prompts')
  .option('--agent <agents>', 'Target agents, comma separated')
  .option('--skills <skills>', 'Only uninstall matching skills (comma separated, supports *)')
  .action(async (source, options) => {
    const rootDir = process.cwd();
    const config = await readConfig(rootDir);
    const cliAgents = parseAgents(options.agent);
    const resolution = await resolveAgents(rootDir, config, cliAgents, options.prompt === false);
    const agents = resolution.agents;
    const skills = parseList(options.skills);

    info(`Uninstalling from ${source}...`);
    const result = await uninstallFromSource({
      rootDir,
      config,
      sourceInput: source,
      agents,
      skillPatterns: skills,
    });

    if (result.missing.length) {
      warn(`No installed skills matched: ${result.missing.join(', ')}`);
    }
    if (result.skipped.length) {
      warn(`Skipped: ${result.skipped.join(', ')}`);
    }
    if (result.removed.length) {
      subInfo(`Removed: ${result.removed.join(', ')}`);
    }
    success(`Uninstall complete. Removed ${result.removed.length} skills.`);
  });

program
  .command('check')
  .description('Check for updates without modifying local files')
  .option('--source <sources>', 'Filter by sources, comma separated')
  .option('--skills <skills>', 'Filter by skill names, comma separated')
  .action(async (options) => {
    const rootDir = process.cwd();
    const config = await readConfig(rootDir);
    const sources = parseList(options.source);
    const skills = parseList(options.skills);

    info('Checking for updates...');
    const reports = await checkUpdates({ rootDir, config, sources, skills });

    if (!reports.length) {
      warn('No install sources found to check.');
      return;
    }

    for (const report of reports) {
      info(`Source: ${report.display}`);
      if (!report.skills.length) {
        subInfo('No skills matched filters.');
        continue;
      }
      for (const skill of report.skills) {
        if (skill.status === 'update-available') {
          subInfo(`${skill.name}: update available`);
        } else if (skill.status === 'up-to-date') {
          subInfo(`${skill.name}: up to date`);
        } else if (skill.status === 'missing-local') {
          warn(`${skill.name}: missing local files`);
        } else if (skill.status === 'missing-remote') {
          warn(`${skill.name}: missing in source`);
        }
      }
    }
  });

program
  .command('scan-default')
  .description('Experimental: rebuild links using default agents')
  .action(async () => {
    const rootDir = process.cwd();
    const config = await readConfig(rootDir);
    const agents = config.defaultAgents.length ? config.defaultAgents : await guessAgents(rootDir);
    if (!agents.length) {
      await appendDebugLog(rootDir, 'No agents found for scan-default');
      error('No agents detected.');
      return;
    }
    const { rootSkills } = await scanProject(rootDir, config);
    for (const agent of agents) {
      const disabled = getDisabledSet(config, agent);
      await syncAgentSkills(rootDir, agent, rootSkills, disabled, true);
    }
    success('scan-default done.');
  });

program.parseAsync().catch((err) => {
  error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
