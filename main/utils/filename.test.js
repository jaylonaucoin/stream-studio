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
  });
});
