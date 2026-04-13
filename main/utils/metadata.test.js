import { describe, it, expect, vi } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { encodeMetadataValue } = require('./metadata.js');

describe('encodeMetadataValue', () => {
  it('returns empty for falsy', () => {
    expect(encodeMetadataValue('')).toBe('');
    expect(encodeMetadataValue(null)).toBe('');
    expect(encodeMetadataValue(undefined)).toBe('');
  });

  it('strips null bytes', () => {
    expect(encodeMetadataValue('a\0b')).toBe('ab');
  });

  it('preserves unicode', () => {
    expect(encodeMetadataValue('café 日本')).toBe('café 日本');
  });

  it('strips replacement chars when Buffer.from throws', () => {
    const spy = vi.spyOn(Buffer, 'from').mockImplementation(() => {
      throw new Error('fail');
    });
    expect(encodeMetadataValue('a\uFFFDb')).toBe('ab');
    spy.mockRestore();
  });
});
