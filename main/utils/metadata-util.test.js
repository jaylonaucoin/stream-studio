import { createRequire } from 'node:module';
import { describe, it, expect } from 'vitest';

const require = createRequire(import.meta.url);

const { encodeMetadataValue } = require('./metadata.js');

describe('encodeMetadataValue', () => {
  it('returns empty string for empty string', () => {
    expect(encodeMetadataValue('')).toBe('');
  });

  it('returns empty string for null', () => {
    expect(encodeMetadataValue(null)).toBe('');
  });

  it('returns empty string for undefined', () => {
    expect(encodeMetadataValue(undefined)).toBe('');
  });

  it('passes through a regular string', () => {
    expect(encodeMetadataValue('Hello World')).toBe('Hello World');
  });

  it('removes null bytes', () => {
    expect(encodeMetadataValue('hello\0world')).toBe('helloworld');
  });

  it('preserves unicode characters', () => {
    const unicode = '日本語テスト 🎵';
    expect(encodeMetadataValue(unicode)).toBe(unicode);
  });

  it('converts non-string values to string', () => {
    expect(encodeMetadataValue(42)).toBe('42');
    expect(encodeMetadataValue(true)).toBe('true');
  });

  it('handles replacement character \uFFFD gracefully', () => {
    const result = encodeMetadataValue('test\uFFFDvalue');
    expect(typeof result).toBe('string');
  });
});
