import { createRequire } from 'node:module';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const require = createRequire(import.meta.url);
const fs = require('fs');
const {
  getFormatExtension,
  getUniqueFilename,
  sanitizeFolderName,
  sanitizeFileName,
} = require('./filename.js');

describe('filename utils', () => {
  let existsSpy;

  beforeEach(() => {
    existsSpy = vi.spyOn(fs, 'existsSync');
  });

  afterEach(() => {
    existsSpy.mockRestore();
  });

  describe('getFormatExtension', () => {
    it('maps known formats', () => {
      expect(getFormatExtension('mp3', 'audio')).toBe('mp3');
      expect(getFormatExtension('mp4', 'video')).toBe('mp4');
      expect(getFormatExtension('best', 'audio')).toBe('mp3');
    });

    it('falls back by mode', () => {
      expect(getFormatExtension('unknown', 'audio')).toBe('mp3');
      expect(getFormatExtension('unknown', 'video')).toBe('mp4');
    });
  });

  describe('getUniqueFilename', () => {
    it('returns path when missing', () => {
      existsSpy.mockReturnValue(false);
      expect(getUniqueFilename('/tmp/a.mp3')).toBe('/tmp/a.mp3');
    });

    it('adds numeric suffix when taken', () => {
      existsSpy.mockImplementation((p) => p === '/tmp/a.mp3');
      expect(getUniqueFilename('/tmp/a.mp3')).toMatch(/a \(1\)\.mp3$/);
    });
  });

  describe('sanitizeFolderName', () => {
    it('replaces illegal chars', () => {
      expect(sanitizeFolderName('a<b>')).toBe('a_b_');
    });
  });

  describe('sanitizeFileName', () => {
    it('handles invalid input', () => {
      expect(sanitizeFileName('')).toBe('');
      expect(sanitizeFileName(null)).toBe('');
    });

    it('replaces special characters', () => {
      expect(sanitizeFileName('a<b>c:d"e')).toBe('a_b_c_d_e');
      expect(sanitizeFileName('file|name?.txt')).toBe('file_name_.txt');
    });

    it('handles very long filename', () => {
      const long = 'a'.repeat(300) + '.mp3';
      const result = sanitizeFileName(long);
      expect(result).toBe(long);
    });

    it('returns empty string when all chars are invalid', () => {
      expect(sanitizeFileName(':<>"|')).toBe('_____');
    });
  });

  describe('getFormatExtension – all audio formats', () => {
    it.each([
      ['mp3', 'mp3'],
      ['m4a', 'm4a'],
      ['flac', 'flac'],
      ['wav', 'wav'],
      ['opus', 'opus'],
      ['aac', 'aac'],
      ['vorbis', 'ogg'],
      ['alac', 'm4a'],
    ])('maps audio format %s → %s', (format, expected) => {
      expect(getFormatExtension(format, 'audio')).toBe(expected);
    });
  });

  describe('getFormatExtension – all video formats', () => {
    it.each([
      ['mp4', 'mp4'],
      ['webm', 'webm'],
      ['mkv', 'mkv'],
      ['avi', 'avi'],
      ['mov', 'mov'],
    ])('maps video format %s → %s', (format, expected) => {
      expect(getFormatExtension(format, 'video')).toBe(expected);
    });
  });

  describe('getUniqueFilename – many collisions', () => {
    it('increments suffix through multiple collisions', () => {
      let callCount = 0;
      existsSpy.mockImplementation(() => {
        callCount++;
        return callCount <= 5;
      });
      const result = getUniqueFilename('/tmp/song.mp3');
      expect(result).toMatch(/song \(5\)\.mp3$/);
    });
  });
});
