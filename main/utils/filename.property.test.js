import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { sanitizeFileName, sanitizeFolderName } = require('./filename.js');

describe('filename properties', () => {
  it('sanitizeFileName never contains forbidden chars', () => {
    fc.assert(
      fc.property(fc.string(), (s) => {
        const out = sanitizeFileName(s);
        expect(out).not.toMatch(/[<>:"/\\|?*]/);
      }),
      { numRuns: 80 }
    );
  });

  it('sanitizeFolderName never contains forbidden chars', () => {
    fc.assert(
      fc.property(fc.string(), (s) => {
        const out = sanitizeFolderName(s);
        expect(out).not.toMatch(/[<>:"/\\|?*]/);
      }),
      { numRuns: 80 }
    );
  });
});
