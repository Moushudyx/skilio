import { describe, it, expect } from 'vitest';
import { AGENT_MAP, getAllAgentIds } from '../../src/constants/agents';

// Unit tests for agent metadata constants.
describe('agents constants', () => {
  it('contains known agent ids', () => {
    const ids = getAllAgentIds();
    expect(ids.includes('cursor')).toBe(true);
    expect(ids.includes('trae')).toBe(true);
    expect(ids.includes('qoder')).toBe(true);
  });

  it('agent map resolves config dirs', () => {
    const cursor = AGENT_MAP.get('cursor');
    const trae = AGENT_MAP.get('trae');
    expect(cursor?.configDir).toBe('.cursor/skills');
    expect(trae?.configDir).toBe('.trae/skills');
  });
});
