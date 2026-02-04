import path from 'path';
import { readJSONFile, writeJSONFile, updateJSONFile } from './utils/fs';
import { AgentId } from './constants/agents';

// All configuration values persisted in skilio-config.json.
export type SkilioConfig = {
  showPrompt: boolean;
  scanNpm: boolean;
  scanPackages: boolean;
  cleanLinks: boolean;
  defaultAgents: AgentId[];
  skillLinkPrefixNpm: string;
  skillLinkPrefixPackage: string;
  skillDisabled: Record<string, AgentId[]>;
  installSources: Record<string, string[]>;
};

// Defaults used when config file is missing or partial.
export const DEFAULT_CONFIG: SkilioConfig = {
  showPrompt: true,
  scanNpm: true,
  scanPackages: true,
  cleanLinks: true,
  defaultAgents: [],
  skillLinkPrefixNpm: 'npm-',
  skillLinkPrefixPackage: 'package-',
  skillDisabled: {},
  installSources: {},
};

// Config file lives at project root.
export const getConfigPath = (rootDir: string) => path.join(rootDir, 'skilio-config.json');

// Read config and merge with defaults.
export const readConfig = async (rootDir: string): Promise<SkilioConfig> => {
  const filePath = getConfigPath(rootDir);
  const userConfig = await readJSONFile<Partial<SkilioConfig>>(filePath);
  return { ...DEFAULT_CONFIG, ...(userConfig ?? {}) } as SkilioConfig;
};

// Write the complete config object.
export const writeConfig = async (rootDir: string, config: SkilioConfig) => {
  const filePath = getConfigPath(rootDir);
  await writeJSONFile(filePath, config);
};

// Shallow merge update, consistent with design constraints.
export const updateConfig = async (rootDir: string, patch: Partial<SkilioConfig>) => {
  const filePath = getConfigPath(rootDir);
  return updateJSONFile<SkilioConfig>(filePath, patch);
};
