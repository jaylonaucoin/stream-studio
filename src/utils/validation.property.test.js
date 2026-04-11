import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { validateMetadata, isValidHttpUrl, isValidPositiveInteger, isValidYear } from './validation.js';

describe('validation properties', () => {
  it('validateMetadata never throws', () => {
    fc.assert(
      fc.property(fc.dictionary(fc.string(), fc.string()), (meta) => {
        const r = validateMetadata(meta);
        expect(r).toEqual(expect.any(Object));
      }),
      { numRuns: 50 }
    );
  });

  it('isValidHttpUrl is true only for http(s) URLs', () => {
    fc.assert(
      fc.property(fc.webUrl(), (u) => {
        try {
          const parsed = new URL(u);
          expect(isValidHttpUrl(u)).toBe(parsed.protocol === 'http:' || parsed.protocol === 'https:');
        } catch {
          expect(isValidHttpUrl(u)).toBe(false);
        }
      }),
      { numRuns: 40 }
    );
  });

  it('isValidPositiveInteger matches digit-string predicate', () => {
    fc.assert(
      fc.property(fc.nat({ max: 100000 }), (n) => {
        const s = String(n);
        const ok = n > 0 && s === String(parseInt(s, 10));
        expect(isValidPositiveInteger(s)).toBe(ok);
      }),
      { numRuns: 60 }
    );
  });

  it('isValidYear respects bounds', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1900, max: 2100 }), fc.integer({ min: 1800, max: 2200 }), (y, minY) => {
        const s = String(y);
        const maxY = minY + 50;
        expect(isValidYear(s, minY, maxY)).toBe(y >= minY && y <= maxY);
      }),
      { numRuns: 40 }
    );
  });
});
