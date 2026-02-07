import path from 'path';
import { readJSONFile, writeJSONFile, updateJSONFile } from './utils/fs';
import { AgentId } from './constants/agents';

// All configuration values persisted in skilio-config.json.
export type InstallSourceRecord = {
  mode: 'all' | 'only';
  include: string[];
  exclude: string[];
  installed: string[];
};

export type SkilioConfig = {
  showPrompt: boolean;
  scanNpm: boolean;
  scanPackages: boolean;
  cleanLinks: boolean;
  defaultAgents: AgentId[];
  skillLinkPrefixNpm: string;
  skillLinkPrefixPackage: string;
  skillDisabled: Record<string, AgentId[]>;
  installSources: Record<string, InstallSourceRecord>;
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

const normalizeStringList = (value: unknown) =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];

const normalizeInstallSources = (value: unknown): Record<string, InstallSourceRecord> => {
  if (!value || typeof value !== 'object') return {};
  const entries = Object.entries(value as Record<string, unknown>);
  const normalized: Record<string, InstallSourceRecord> = {};

  for (const [key, record] of entries) {
    if (Array.isArray(record)) {
      normalized[key] = {
        mode: 'all',
        include: [],
        exclude: [],
        installed: normalizeStringList(record),
      };
      continue;
    }
    if (!record || typeof record !== 'object') {
      continue;
    }
    const raw = record as Partial<InstallSourceRecord> & Record<string, unknown>;
    normalized[key] = {
      mode: raw.mode === 'only' ? 'only' : 'all',
      include: normalizeStringList(raw.include),
      exclude: normalizeStringList(raw.exclude),
      installed: normalizeStringList(raw.installed),
    };
  }

  return normalized;
};

// Config file lives at project root.
export const getConfigPath = (rootDir: string) => path.join(rootDir, 'skilio-config.json');

// Read config and merge with defaults.
export const readConfig = async (rootDir: string): Promise<SkilioConfig> => {
  const filePath = getConfigPath(rootDir);
  const userConfig = await readJSONFile<Partial<SkilioConfig>>(filePath);
  const merged = { ...DEFAULT_CONFIG, ...(userConfig ?? {}) } as SkilioConfig;
  merged.installSources = normalizeInstallSources((userConfig as any)?.installSources ?? merged.installSources);
  return merged;
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
