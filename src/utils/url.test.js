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

  it('returns a reason for invalid URLs', () => {
    expect(isValidUrl('file:///tmp/x').reason).toBe('URL must use http:// or https://');
    expect(isValidUrl('https://localhost').reason).toBe('Please enter a valid website URL');
    expect(isValidUrl('').reason).toBe('');
  });

  it('accepts protocol-less URL containing dots', () => {
    const r = isValidUrl('example.com');
    expect(r.valid).toBe(true);
    expect(r.normalized).toBe('https://example.com');
  });
});

describe('normalizeUrl – edge cases', () => {
  it('preserves URL that already has a protocol', () => {
    expect(normalizeUrl('https://foo.bar')).toBe('https://foo.bar');
    expect(normalizeUrl('http://foo.bar')).toBe('http://foo.bar');
  });

  it('strips whitespace and newlines', () => {
    expect(normalizeUrl('  example.com\r\n')).toBe('https://example.com');
    expect(normalizeUrl('\n  https://a.com \n')).toBe('https://a.com');
  });

  it('does not add protocol to non-domain-like input', () => {
    expect(normalizeUrl('hello world')).toBe('hello world');
    expect(normalizeUrl('nodot')).toBe('nodot');
  });
});
