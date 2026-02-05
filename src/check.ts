import path from 'path';
import { SkilioConfig } from './config';
import { listSourceSkills, parseSourceInput, parseSourceKey, fetchSourceToTemp } from './source';
import { hashDir } from './utils/hash';
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
    if (!config.installSources[spec.key]) {
      await appendDebugLog(rootDir, `Source not installed: ${spec.key}`);
      continue;
    }

    const { dir, cleanup } = await fetchSourceToTemp(spec, rootDir);
    try {
      const sourceSkills = await listSourceSkills(dir, spec, rootDir);
      const sourceMap = new Map(sourceSkills.map((skill) => [skill.name, skill.dir]));

      const installed = config.installSources[spec.key] ?? [];
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
        const remoteDir = sourceMap.get(name);
        if (!remoteDir) {
          report.skills.push({ name, status: 'missing-remote' });
          continue;
        }

        const [localHash, remoteHash] = await Promise.all([hashDir(localDir), hashDir(remoteDir)]);
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
