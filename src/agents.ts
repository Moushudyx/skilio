import fs from 'fs/promises';
import path from 'path';
import { AGENT_MAP, AGENTS, AgentId } from './constants/agents';
import { pathExists } from './utils/fs';

// Get config directory for a known agent.
export const getAgentConfigDir = (agent: AgentId) => {
  const info = AGENT_MAP.get(agent);
  if (!info) throw new Error(`Unknown agent: ${agent}`);
  return info.configDir;
};

// Guess agents by presence of config directories/files.
export const guessAgents = async (rootDir: string): Promise<AgentId[]> => {
  const found: AgentId[] = [];
  for (const agent of AGENTS) {
    if (agent.id === 'openclaw') {
      continue;
    }
    if (agent.guessBy?.file) {
      const filePath = path.join(rootDir, agent.guessBy.file);
      if (await pathExists(filePath)) {
        found.push(agent.id);
        continue;
      }
    }
    if (agent.guessBy?.dir) {
      const dirPath = path.join(rootDir, agent.guessBy.dir);
      if (await pathExists(dirPath)) {
        found.push(agent.id);
        continue;
      }
    }
  }
  return found;
};

// Ensure agent config dir exists (used for non-OpenClaw agents).
export const ensureAgentDir = async (rootDir: string, agent: AgentId) => {
  const dir = path.join(rootDir, getAgentConfigDir(agent));
  await fs.mkdir(dir, { recursive: true });
  return dir;
};
