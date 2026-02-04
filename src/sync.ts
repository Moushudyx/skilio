import fs from 'fs/promises';
import path from 'path';
import { ensureDir, pathExists } from './utils/fs';
import { checkSymlink, createSymlink, deleteSymlink } from './utils/symlink';
import { appendDebugLog } from './debug';
import { AgentId, AGENT_MAP } from './constants/agents';

// Sync root skills into an agent config directory.
// It only manages symlinks and never deletes real directories.
export const syncAgentSkills = async (
  rootDir: string,
  agent: AgentId,
  skillEntries: string[],
  disabled: Set<string>,
  cleanLinks: boolean
) => {
  const agentInfo = AGENT_MAP.get(agent);
  if (!agentInfo) throw new Error(`Unknown agent: ${agent}`);
  // OpenClaw uses root skills/ directly; no sync needed to avoid loops.
  if (agentInfo.id === 'openclaw') {
    return;
  }

  const agentDir = path.join(rootDir, agentInfo.configDir);
  await ensureDir(agentDir);

  if (!(await pathExists(agentDir))) {
    return;
  }

  const currentEntries = await fs.readdir(agentDir, { withFileTypes: true });
  const desired = new Set(skillEntries.filter((name) => !disabled.has(name)));

  // Remove extra symlinks when cleanLinks is enabled.
  if (cleanLinks) {
    for (const entry of currentEntries) {
      const target = path.join(agentDir, entry.name);
      if (!desired.has(entry.name)) {
        if (entry.isSymbolicLink()) {
          await deleteSymlink(target);
        } else if (entry.isDirectory()) {
          await appendDebugLog(rootDir, `Conflict in ${agentDir}: ${entry.name} is a real directory.`);
        }
      }
    }
  }

  for (const name of desired) {
    const linkPath = path.join(agentDir, name);
    const source = path.join(rootDir, 'skills', name);
    if (await pathExists(linkPath)) {
      const ok = await checkSymlink(linkPath);
      if (!ok) {
        try {
          const stat = await fs.lstat(linkPath);
          if (stat.isSymbolicLink()) {
            await deleteSymlink(linkPath);
            await createSymlink(source, linkPath);
          } else {
            await appendDebugLog(rootDir, `Conflict in ${agentDir}: ${name} is a real directory.`);
          }
        } catch (error) {
          await appendDebugLog(rootDir, `Failed to refresh link: ${linkPath} ${String(error)}`);
        }
      }
      continue;
    }
    await createSymlink(source, linkPath);
  }
};
