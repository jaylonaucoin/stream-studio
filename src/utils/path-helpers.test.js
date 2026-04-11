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
});
