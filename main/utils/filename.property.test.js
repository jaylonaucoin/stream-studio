import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fc from 'fast-check';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const fs = require('fs');
const {
  sanitizeFileName,
  sanitizeFolderName,
  getFormatExtension,
  getUniqueFilename,
} = require('./filename.js');

describe('filename properties', () => {
  it('sanitizeFileName never contains forbidden chars', () => {
    fc.assert(
      fc.property(fc.string(), (s) => {
        const out = sanitizeFileName(s);
        expect(out).not.toMatch(/[<>:"/\\|?*]/);
      }),
      { numRuns: 500 }
    );
  });

  it('sanitizeFolderName never contains forbidden chars', () => {
    fc.assert(
      fc.property(fc.string(), (s) => {
        const out = sanitizeFolderName(s);
        expect(out).not.toMatch(/[<>:"/\\|?*]/);
      }),
      { numRuns: 500 }
    );
  });

  it('getFormatExtension returns a non-empty string for safe format keys and mode', () => {
    const formatArb = fc.oneof(
      fc.constant('mp3'),
      fc.constant('mp4'),
      fc.constant('best'),
      fc.constant('unknownfmt'),
      fc.constant('m4a'),
      fc.constant('webm'),
      fc.constant(''),
      fc.constant('aac'),
      fc.constant('opus')
    );
    fc.assert(
      fc.property(formatArb, fc.constantFrom('audio', 'video'), (format, mode) => {
        const ext = getFormatExtension(format, mode);
        expect(typeof ext).toBe('string');
        expect(ext.length).toBeGreaterThan(0);
      }),
      { numRuns: 500 }
    );
  });
});

describe('getUniqueFilename properties', () => {
  let existsSpy;

  beforeEach(() => {
    existsSpy = vi.spyOn(fs, 'existsSync').mockReturnValue(false);
  });

  afterEach(() => {
    existsSpy.mockRestore();
  });

  it('output path keeps the same extension as input when no collision', () => {
    fc.assert(
      fc.property(fc.uuid(), (id) => {
        const filePath = `/tmp/file-${id}.mp3`;
        const out = getUniqueFilename(filePath);
        const extIn = filePath.slice(filePath.lastIndexOf('.'));
        expect(out.endsWith(extIn)).toBe(true);
      }),
      { numRuns: 500 }
    );
  });
});
