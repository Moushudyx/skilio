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
  guessBy: {
    dir?: string;
    file?: string;
  };
};

export const AGENTS: AgentInfo[] = [
  { id: 'cursor', name: 'Cursor', configDir: '.cursor/skills', guessBy: { dir: '.cursor' } },
  {
    id: 'copilot',
    name: 'GitHub Copilot',
    configDir: '.github/skills',
    guessBy: { file: '.github/copilot-instructions.md', dir: '.github/skills' },
  },
  { id: 'windsurf', name: 'Windsurf', configDir: '.windsurf/skills', guessBy: { dir: '.windsurf' } },
  { id: 'trae', name: 'Trae', configDir: '.trae/skills', guessBy: { dir: '.trae' } },
  { id: 'claude', name: 'Claude Code', configDir: '.claude/skills', guessBy: { dir: '.claude' } },
  { id: 'openclaw', name: 'OpenClaw', configDir: 'skills', guessBy: {} },
  { id: 'qoder', name: 'Qoder', configDir: '.qoder/skills', guessBy: { dir: '.qoder' } },
  { id: 'qwen', name: 'Qwen Code', configDir: '.qwen/skills', guessBy: { dir: '.qwen' } },
  { id: 'cline', name: 'Cline', configDir: '.cline/skills', guessBy: { dir: '.cline' } },
  { id: 'codex', name: 'Codex', configDir: '.codex/skills', guessBy: { dir: '.codex' } },
  { id: 'continue', name: 'Continue', configDir: '.continue/skills', guessBy: { dir: '.continue' } },
  { id: 'gemini', name: 'Gemini CLI', configDir: '.gemini/skills', guessBy: { dir: '.gemini' } },
  { id: 'kimi', name: 'Kimi Code CLI', configDir: '.agents/skills', guessBy: { dir: '.agents' } },
  { id: 'roo', name: 'Roo Code', configDir: '.roo/skills', guessBy: { dir: '.roo' } },
  { id: 'zencoder', name: 'Zencoder', configDir: '.zencoder/skills', guessBy: { dir: '.zencoder' } },
];

export const AGENT_MAP = new Map(AGENTS.map((agent) => [agent.id, agent]));

export const getAllAgentIds = (): AgentId[] => AGENTS.map((agent) => agent.id);
