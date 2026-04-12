import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { parseTimeToSeconds } = require('./conversion.js');

describe('parseTimeToSeconds properties', () => {
  it('returns null or non-negative integer', () => {
    fc.assert(
      fc.property(
        fc.oneof(fc.string(), fc.constant(null), fc.constant(undefined), fc.integer()),
        (v) => {
          const r = parseTimeToSeconds(v);
          expect(r === null || (Number.isInteger(r) && r >= 0)).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('parses MM:SS to seconds in range', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 59 }), fc.integer({ min: 0, max: 58 }), (m, sec) => {
        const s = `${m}:${String(sec).padStart(2, '0')}`;
        expect(parseTimeToSeconds(s)).toBe(m * 60 + sec);
      }),
      { numRuns: 40 }
    );
  });
});
