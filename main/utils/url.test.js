import { createRequire } from 'node:module';
import { describe, it, expect } from 'vitest';

const require = createRequire(import.meta.url);
const { normalizeUrl, sanitizeUrl } = require('./url.js');

describe('main normalizeUrl', () => {
  it('adds protocol for domain-like input', () => {
    expect(normalizeUrl('example.com')).toBe('https://example.com');
  });
});

describe('sanitizeUrl', () => {
  it('throws on bad type or empty', () => {
    expect(() => sanitizeUrl(1)).toThrow('Invalid URL type');
    expect(() => sanitizeUrl('   ')).toThrow('empty');
  });

  it('returns normalized valid url', () => {
    expect(sanitizeUrl('https://www.example.com/path')).toBe('https://www.example.com/path');
  });

  it('throws on invalid hostname', () => {
    expect(() => sanitizeUrl('https://ab')).toThrow();
  });
});
