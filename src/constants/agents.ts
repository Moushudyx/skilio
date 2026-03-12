export type AgentId =
  | 'cursor'
  | 'copilot'
  | 'windsurf'
  | 'trae'
  | 'claude'
  | 'openclaw'
  | 'qoder'
  | 'qwen'
  | 'cline'
  | 'codex'
  | 'continue'
  | 'gemini'
  | 'kimi'
  | 'roo'
  | 'zencoder';

export type AgentInfo = {
  id: AgentId;
  name: string;
  configDir: string;
  rulesFilePath: string;
  guessBy: {
    dir?: string;
    file?: string;
  };
};

export const AGENTS: AgentInfo[] = [
  {
    id: 'cursor',
    name: 'Cursor',
    configDir: '.cursor/skills',
    rulesFilePath: 'AGENTS.md',
    guessBy: { dir: '.cursor' },
  },
  {
    id: 'copilot',
    name: 'GitHub Copilot',
    configDir: '.github/skills',
    rulesFilePath: '.github/copilot-instructions.md',
    guessBy: { file: '.github/copilot-instructions.md', dir: '.github/skills' },
  },
  {
    id: 'windsurf',
    name: 'Windsurf',
    configDir: '.windsurf/skills',
    rulesFilePath: 'AGENTS.md',
    guessBy: { dir: '.windsurf' },
  },
  {
    id: 'trae',
    name: 'Trae',
    configDir: '.trae/skills',
    rulesFilePath: '.trae/rules/repo.md', // https://docs.trae.cn/ide/rules
    guessBy: { dir: '.trae' },
  },
  {
    id: 'claude',
    name: 'Claude Code',
    configDir: '.claude/skills',
    rulesFilePath: 'CLAUDE.md',
    guessBy: { dir: '.claude' },
  },
  {
    id: 'openclaw',
    name: 'OpenClaw',
    configDir: 'skills',
    rulesFilePath: 'AGENTS.md',
    guessBy: {},
  },
  {
    id: 'qoder',
    name: 'Qoder',
    configDir: '.qoder/skills',
    rulesFilePath: 'AGENTS.md', // https://docs.qoder.com/zh/user-guide/rules
    guessBy: { dir: '.qoder' },
  },
  {
    id: 'qwen',
    name: 'Qwen Code',
    configDir: '.qwen/skills',
    rulesFilePath: 'QWEN.md', // https://qwenlm.github.io/qwen-code-docs/zh/users/configuration/settings
    guessBy: { dir: '.qwen' },
  },
  {
    id: 'cline',
    name: 'Cline',
    configDir: '.cline/skills',
    rulesFilePath: 'AGENTS.md', // https://docs.cline.bot/customization/cline-rules
    guessBy: { dir: '.cline' },
  },
  {
    id: 'codex',
    name: 'Codex',
    configDir: '.codex/skills',
    rulesFilePath: 'AGENTS.md',
    guessBy: { dir: '.codex' },
  },
  {
    id: 'continue',
    name: 'Continue',
    configDir: '.continue/skills',
    rulesFilePath: 'AGENTS.md',
    guessBy: { dir: '.continue' },
  },
  {
    id: 'gemini',
    name: 'Gemini CLI',
    configDir: '.gemini/skills',
    rulesFilePath: 'GEMINI.md',
    guessBy: { dir: '.gemini' },
  },
  {
    id: 'kimi',
    name: 'Kimi Code CLI',
    configDir: '.agents/skills',
    rulesFilePath: 'AGENTS.md', // https://moonshotai.github.io/kimi-cli/zh/release-notes/changelog.html#_0-8-0-2025-09-14
    guessBy: { dir: '.agents' },
  },
  {
    id: 'roo',
    name: 'Roo Code',
    configDir: '.roo/skills',
    rulesFilePath: 'AGENTS.md',
    guessBy: { dir: '.roo' },
  },
  {
    id: 'zencoder',
    name: 'Zencoder',
    configDir: '.zencoder/skills',
    rulesFilePath: '.zencoder/rules/repo.md', // https://docs.zencoder.ai/rules-context/zen-rules#1-locate-the-rules-directory
    guessBy: { dir: '.zencoder' },
  },
];

export const AGENT_MAP = new Map(AGENTS.map((agent) => [agent.id, agent]));

export const getAllAgentIds = (): AgentId[] => AGENTS.map((agent) => agent.id);

export const getAgentRulesFilePath = (agent: AgentId): string => {
  const info = AGENT_MAP.get(agent);
  if (!info) {
    return 'AGENTS.md';
  }
  return info.rulesFilePath || 'AGENTS.md';
};
