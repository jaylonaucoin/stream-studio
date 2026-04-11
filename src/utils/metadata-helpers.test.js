import { describe, it, expect } from 'vitest';
import { normalizeTagDisplay } from './metadata-helpers.js';

describe('normalizeTagDisplay', () => {
  it('handles null and primitives', () => {
    expect(normalizeTagDisplay(null)).toBe('');
    expect(normalizeTagDisplay('  a  ')).toBe('a');
  });

  it('joins array values', () => {
    expect(normalizeTagDisplay([' a ', '', 'b'])).toBe('a; b');
  });
});
