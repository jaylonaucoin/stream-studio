import { createRequire } from 'node:module';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const require = createRequire(import.meta.url);

const fs = require('fs');
const path = require('path');

vi.spyOn(fs, 'existsSync');

beforeEach(() => {
  vi.clearAllMocks();
  fs.existsSync.mockReturnValue(false);
});

const { isDev, getAppRoot, getYtDlpPath, getFfmpegPath, getIconPath } = require('./paths.js');

describe('isDev', () => {
  it('returns true when app.isPackaged is falsy', () => {
    expect(isDev()).toBe(true);
  });
});

describe('getAppRoot', () => {
  it('returns repo root in dev mode', () => {
    const root = getAppRoot();
    const resolved = path.resolve(__dirname, '..', '..');
    expect(root).toBe(resolved);
  });
});

describe('getYtDlpPath', () => {
  const binaryName = process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp';

  it('returns bin path when bin/yt-dlp exists', () => {
    const expectedPath = path.normalize(path.join(getAppRoot(), 'bin', binaryName));
    fs.existsSync.mockImplementation((p) => p === expectedPath);

    expect(getYtDlpPath()).toBe(expectedPath);
  });

  it('returns bare binary name when no bin exists', () => {
    fs.existsSync.mockReturnValue(false);
    expect(getYtDlpPath()).toBe(binaryName);
  });
});

describe('getFfmpegPath', () => {
  const binaryName = process.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg';

  it('returns bin path when bin/ffmpeg exists', () => {
    const expectedPath = path.normalize(path.join(getAppRoot(), 'bin', binaryName));
    fs.existsSync.mockImplementation((p) => p === expectedPath);

    expect(getFfmpegPath()).toBe(expectedPath);
  });

  it('returns bare binary name when no bin exists', () => {
    fs.existsSync.mockReturnValue(false);
    expect(getFfmpegPath()).toBe(binaryName);
  });
});

describe('getIconPath', () => {
  it('returns path containing assets/icon.png', () => {
    const iconPath = getIconPath();
    expect(iconPath).toContain(path.join('assets', 'icon.png'));
  });
});
