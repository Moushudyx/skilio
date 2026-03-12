import fs from 'fs/promises';
import path from 'path';
import { NpmModuleIndex } from './scan';
import { pathExists } from './utils/fs';

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

export const syncAgentsRuleIndex = async (rootDir: string, modules: NpmModuleIndex[]) => {
  const agentsPath = path.join(rootDir, DEFAULT_RULES_FILE);
  const exists = await pathExists(agentsPath);
  const original = exists ? await fs.readFile(agentsPath, 'utf-8') : '';
  const withTag = ensureSkilioTag(original);
  const block = renderSkilioBlock(modules);
  const next = withTag.replace(SKILIO_TAG_REGEX, (_, prefix: string) => `${prefix}${block}`);

  if (next === original) {
    return;
  }
  await fs.writeFile(agentsPath, next, 'utf-8');
};

export const __testOnly = {
  ensureSkilioTag,
  renderSkilioBlock,
};
