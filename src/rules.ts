import fs from 'fs/promises';
import path from 'path';
import { AgentId, getAgentRulesFilePath } from './constants/agents';
import { NpmModuleIndex } from './scan';
import { appendDebugLog } from './debug';
import { pathExists } from './utils/fs';
import { warn } from './utils/log';
import { isSymlinkLike } from './utils/symlink';

const SKILIO_TAG_REGEX = /(^|\r?\n)<skilio>[\s\S]*?<\/skilio>/gi;
const DEFAULT_RULES_FILE = 'AGENTS.md';

const SKILIO_GUIDE =
  'Before writing code for any component mentioned in `<skilio>`, you MUST read the skill file specified in the doc.';

const ensureSkilioTag = (content: string) => {
  if (SKILIO_TAG_REGEX.test(content)) {
    SKILIO_TAG_REGEX.lastIndex = 0;
    return content;
  }
  SKILIO_TAG_REGEX.lastIndex = 0;

  const normalized = content.trimEnd();
  if (!normalized) {
    return `${SKILIO_GUIDE}\n<skilio></skilio>\n`;
  }
  return `${normalized}\n\n${SKILIO_GUIDE}\n<skilio></skilio>\n`;
};

const renderSkilioBlock = (modules: NpmModuleIndex[]) => {
  const lines: string[] = [];
  lines.push('<skilio>');
  lines.push('The following is an index of skills obtained by scanning node_modules.');

  for (const module of modules) {
    lines.push(`## ${module.moduleName}`);
    for (const skill of module.skills) {
      lines.push(`- \`${skill.skillName}\` filepath: \`${skill.linkPath}\``);
    }
    if (module.skilioDoc) {
      lines.push(module.skilioDoc);
    }
  }

  lines.push('</skilio>');
  return lines.join('\n');
};

const getRuleTargetPaths = (agents: AgentId[]) => {
  if (!agents.length) {
    return [DEFAULT_RULES_FILE];
  }

  return Array.from(new Set(agents.map((agent) => getAgentRulesFilePath(agent) || DEFAULT_RULES_FILE)));
};

const replaceSkilioBlock = (content: string, modules: NpmModuleIndex[]) => {
  const withTag = ensureSkilioTag(content);
  const block = renderSkilioBlock(modules);
  return withTag.replace(SKILIO_TAG_REGEX, (_, prefix: string) => `${prefix}${block}`);
};

const syncOneRulesFile = async (rootDir: string, filePath: string, modules: NpmModuleIndex[]) => {
  const fullPath = path.join(rootDir, filePath);
  const exists = await pathExists(fullPath);

  if (exists && (await isSymlinkLike(fullPath))) {
    const message = `Skip rules file update because target is a symlink: ${filePath}`;
    warn(message);
    await appendDebugLog(rootDir, message);
    return;
  }

  await fs.mkdir(path.dirname(fullPath), { recursive: true });
  const original = exists ? await fs.readFile(fullPath, 'utf-8') : '';
  const next = replaceSkilioBlock(original, modules);

  if (next === original) {
    return;
  }
  await fs.writeFile(fullPath, next, 'utf-8');
};

export const syncAgentsRuleIndex = async (rootDir: string, modules: NpmModuleIndex[], detectedAgents: AgentId[]) => {
  const targets = getRuleTargetPaths(detectedAgents);

  if (!detectedAgents.length) {
    const message = `No agent detected. Writing rules index to ${DEFAULT_RULES_FILE}.`;
    warn(message);
    await appendDebugLog(rootDir, message);
  }

  for (const target of targets) {
    // Rules files are regular markdown files; do not attempt file symlink management on Windows.
    await syncOneRulesFile(rootDir, target, modules);
  }
};

export const __testOnly = {
  ensureSkilioTag,
  getRuleTargetPaths,
  replaceSkilioBlock,
  renderSkilioBlock,
};
