import { describe, it, expect } from 'vitest';
import { fileStemFromPath } from './path-helpers.js';

describe('fileStemFromPath', () => {
  it('returns basename without extension', () => {
    expect(fileStemFromPath('/a/b/track.mp3')).toBe('track');
    expect(fileStemFromPath('C:\\music\\song.flac')).toBe('song');
  });

  it('handles edge cases', () => {
    expect(fileStemFromPath('')).toBe('');
    expect(fileStemFromPath('.hidden')).toBe('.hidden');
    expect(fileStemFromPath('noext')).toBe('noext');
  });

  it('returns empty string for null, undefined, and non-string input', () => {
    expect(fileStemFromPath(null)).toBe('');
    expect(fileStemFromPath(undefined)).toBe('');
    expect(fileStemFromPath(42)).toBe('');
  });

  it('handles path with multiple dots', () => {
    expect(fileStemFromPath('/a/b/my.song.v2.mp3')).toBe('my.song.v2');
    expect(fileStemFromPath('archive.tar.gz')).toBe('archive.tar');
  });

  it('handles trailing slash', () => {
    expect(fileStemFromPath('/a/b/')).toBe('');
    expect(fileStemFromPath('/a/b/c/')).toBe('');
  });
});
