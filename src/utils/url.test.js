import { describe, it, expect } from 'vitest';
import { normalizeUrl, isLikelyUrl, isValidUrl } from './url.js';

describe('normalizeUrl', () => {
  it('trims and strips newlines', () => {
    expect(normalizeUrl('  https://a.com  ')).toBe('https://a.com');
    expect(normalizeUrl('https://a.com\n')).toBe('https://a.com');
  });

  it('adds https for domain-like input', () => {
    expect(normalizeUrl('example.com/foo')).toBe('https://example.com/foo');
  });
});

describe('isLikelyUrl', () => {
  it('detects URL-like strings', () => {
    expect(isLikelyUrl('')).toBe(false);
    expect(isLikelyUrl('https://x.com')).toBe(true);
    expect(isLikelyUrl('x.com')).toBe(true);
    expect(isLikelyUrl('hello world')).toBe(false);
  });
});

describe('isValidUrl', () => {
  it('rejects empty', () => {
    expect(isValidUrl('').valid).toBe(false);
    expect(isValidUrl('   ').valid).toBe(false);
  });

  it('accepts valid https URL', () => {
    const r = isValidUrl('https://www.youtube.com/watch?v=abc');
    expect(r.valid).toBe(true);
    expect(r.normalized).toContain('youtube.com');
  });

  it('rejects bad protocol', () => {
    const r = isValidUrl('file:///tmp/x');
    expect(r.valid).toBe(false);
  });

  it('rejects hostname without dot', () => {
    const r = isValidUrl('https://localhost');
    expect(r.valid).toBe(false);
  });
});
