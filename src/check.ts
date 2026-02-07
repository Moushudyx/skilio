import path from 'path';
import { SkilioConfig } from './config';
import { listSourceSkills, parseSourceInput, parseSourceKey, fetchSourceToTemp } from './source';
import { hashDir, hashDirFiltered } from './utils/hash';
import { ROOT_SKILL_DIRS } from './utils/skillCopy';
import { pathExists } from './utils/fs';
import { appendDebugLog } from './debug';

export type CheckSkillStatus = {
  name: string;
  status: 'up-to-date' | 'update-available' | 'missing-local' | 'missing-remote';
};

export type CheckSourceReport = {
  sourceKey: string;
  display: string;
  skills: CheckSkillStatus[];
};

export const checkUpdates = async (options: {
  rootDir: string;
  config: SkilioConfig;
  sources?: string[];
  skills?: string[];
}) => {
  const { rootDir, config, sources, skills } = options;
  const skillFilter = skills?.length ? new Set(skills) : null;

  const sourceSpecs = sources?.length
    ? await Promise.all(sources.map((source) => parseSourceInput(source, rootDir)))
    : Object.keys(config.installSources).map((key) => parseSourceKey(key));

  const reports: CheckSourceReport[] = [];

  for (const spec of sourceSpecs) {
    const record = config.installSources[spec.key];
    if (!record) {
      await appendDebugLog(rootDir, `Source not installed: ${spec.key}`);
      continue;
    }

    const { dir, cleanup } = await fetchSourceToTemp(spec, rootDir);
    try {
      const sourceSkills = await listSourceSkills(dir, spec, rootDir);
      const sourceMap = new Map(sourceSkills.map((skill) => [skill.name, skill]));

      const installed = record.installed ?? [];
      const targets = installed.filter((name) => (skillFilter ? skillFilter.has(name) : true));

      const report: CheckSourceReport = {
        sourceKey: spec.key,
        display: spec.display,
        skills: [],
      };

      for (const name of targets) {
        const localDir = path.join(rootDir, 'skills', name);
        if (!(await pathExists(localDir))) {
          report.skills.push({ name, status: 'missing-local' });
          continue;
        }
        const remoteSkill = sourceMap.get(name);
        if (!remoteSkill) {
          report.skills.push({ name, status: 'missing-remote' });
          continue;
        }

        const useFilteredHash = remoteSkill.copyMode === 'root';
        const allowed = ['SKILL.md', ...ROOT_SKILL_DIRS];
        const [localHash, remoteHash] = await Promise.all([
          useFilteredHash ? hashDirFiltered(localDir, allowed) : hashDir(localDir),
          useFilteredHash ? hashDirFiltered(remoteSkill.dir, allowed) : hashDir(remoteSkill.dir),
        ]);
        report.skills.push({
          name,
          status: localHash === remoteHash ? 'up-to-date' : 'update-available',
        });
      }

      reports.push(report);
    } finally {
      await cleanup();
    }
  }

  return reports;
};
