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

  it('accepts URL with path and query', () => {
    const result = sanitizeUrl('https://www.example.com/path?q=1&b=2');
    expect(result).toBe('https://www.example.com/path?q=1&b=2');
  });

  it('accepts very long valid URL', () => {
    const long = 'https://www.example.com/' + 'a'.repeat(500);
    expect(sanitizeUrl(long)).toBe(long);
  });
});

describe('main normalizeUrl – edge cases', () => {
  it('preserves URL that already has a protocol', () => {
    expect(normalizeUrl('https://foo.bar')).toBe('https://foo.bar');
    expect(normalizeUrl('http://foo.bar')).toBe('http://foo.bar');
  });

  it('strips whitespace and newlines', () => {
    expect(normalizeUrl('  example.com\r\n')).toBe('https://example.com');
    expect(normalizeUrl('\n  https://a.com \n')).toBe('https://a.com');
  });

  it('does not add protocol to host without a dot', () => {
    expect(normalizeUrl('localhost')).toBe('localhost');
    expect(normalizeUrl('intranet')).toBe('intranet');
  });
});
