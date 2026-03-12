import { describe, it, expect } from 'vitest';
import { __testOnly } from '../../src/rules';

describe('rules helpers', () => {
  it('appends guide and empty skilio tag when missing', () => {
    const next = __testOnly.ensureSkilioTag('# Project Rules\n');
    expect(next).toContain('Before writing code for any component mentioned in `<skilio>`');
    expect(next).toContain('<skilio></skilio>');
  });

  it('renders npm module index block with sorted skills and optional doc', () => {
    const block = __testOnly.renderSkilioBlock([
      {
        moduleName: '@scope/module-a',
        skills: [
          {
            moduleName: '@scope/module-a',
            skillName: 'b-skill',
            linkName: 'npm-@scope-module-a-b-skill',
            linkPath: 'skills/npm-@scope-module-a-b-skill/',
          },
          {
            moduleName: '@scope/module-a',
            skillName: 'a-skill',
            linkName: 'npm-@scope-module-a-a-skill',
            linkPath: 'skills/npm-@scope-module-a-a-skill/',
          },
        ],
        skilioDoc: 'extra docs',
      },
    ]);

    expect(block).toContain('<skilio>');
    expect(block).toContain('## @scope/module-a');
    expect(block).toContain('`a-skill` filepath: `skills/npm-@scope-module-a-a-skill/`');
    expect(block).toContain('`b-skill` filepath: `skills/npm-@scope-module-a-b-skill/`');
    expect(block).toContain('extra docs');
    expect(block).toContain('</skilio>');
  });

  it('resolves detected agent rule targets with dedupe and fallback', () => {
    expect(__testOnly.getRuleTargetPaths(['cursor', 'windsurf'])).toEqual(['AGENTS.md']);
    expect(__testOnly.getRuleTargetPaths(['copilot', 'cursor'])).toEqual([
      '.github/copilot-instructions.md',
      'AGENTS.md',
    ]);
    expect(__testOnly.getRuleTargetPaths([])).toEqual(['AGENTS.md']);
  });
});
