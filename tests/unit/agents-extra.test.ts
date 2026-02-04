import { describe, it, expect } from 'vitest';
import { AGENT_MAP, getAllAgentIds } from '../../src/constants/agents';

// Unit tests for special agent entries.
describe('agents extra', () => {
  it('includes openclaw in ids', () => {
    const ids = getAllAgentIds();
    expect(ids.includes('openclaw')).toBe(true);
  });

  it('maps openclaw config dir to skills/', () => {
    const openclaw = AGENT_MAP.get('openclaw');
    expect(openclaw?.configDir).toBe('skills');
  });
});
