import { describe, it, expect } from 'vitest';
import { isValidSkillName } from '../../src/utils/skill';

// Unit tests for skill name validation (pure function, no I/O).
describe('isValidSkillName', () => {
  it('accepts simple names', () => {
    expect(isValidSkillName('my-skill')).toBe(true);
  });

  it('rejects empty or whitespace', () => {
    expect(isValidSkillName('')).toBe(false);
    expect(isValidSkillName('   ')).toBe(false);
  });

  it('rejects path separators', () => {
    expect(isValidSkillName('a/b')).toBe(false);
    expect(isValidSkillName('a\\b')).toBe(false);
  });
});
