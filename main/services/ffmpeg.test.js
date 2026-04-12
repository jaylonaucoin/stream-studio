import { createRequire } from 'node:module';
import Module from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { EventEmitter } from 'node:events';
import { Readable } from 'node:stream';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const spawnMock = vi.fn();
const existsSyncMock = vi.fn(() => true);
const getFfmpegPathMock = vi.fn(() => '/usr/local/bin/ffmpeg');
const encodeMetadataValueMock = vi.fn((v) => String(v));

const MOCK_CP = path.join(__dirname, '__mock_cp__');
const MOCK_FS = path.join(__dirname, '__mock_fs__');
const MOCK_PATHS = path.join(__dirname, '__mock_paths__');
const MOCK_META = path.join(__dirname, '__mock_meta__');

function installMockModule(key, exports) {
  const m = new Module(key);
  m.filename = key;
  m.loaded = true;
  m.exports = exports;
  require.cache[key] = m;
}

installMockModule(MOCK_CP, { spawn: spawnMock, execFileSync: vi.fn() });
installMockModule(MOCK_FS, { existsSync: existsSyncMock });
installMockModule(MOCK_PATHS, { getFfmpegPath: getFfmpegPathMock });
installMockModule(MOCK_META, { encodeMetadataValue: encodeMetadataValueMock });

const originalResolveFilename = Module._resolveFilename;
Module._resolveFilename = function (request, parent, isMain, options) {
  const fromFfmpeg = parent?.filename?.includes('ffmpeg.js');
  if (request === 'child_process' && fromFfmpeg) return MOCK_CP;
  if (request === 'fs' && fromFfmpeg) return MOCK_FS;
  if (request === '../utils/paths' && fromFfmpeg) return MOCK_PATHS;
  if (request === '../utils/metadata' && fromFfmpeg) return MOCK_META;
  return originalResolveFilename.call(this, request, parent, isMain, options);
};

const {
  buildMetadataArgs,
  getFfmpegUnavailableError,
  checkFfmpegAvailable,
  runFfmpegCommand,
  splitAudioByTime,
  convertLocalFile,
} = require('./ffmpeg.js');

function makeFakeProc() {
  const proc = new EventEmitter();
  proc.stdout = new Readable({ read() {} });
  proc.stderr = new Readable({ read() {} });
  proc.pid = 12345;
  proc.killed = false;
  proc.kill = vi.fn(() => {
    proc.killed = true;
  });
  return proc;
}

function closeProc(proc, code = 0) {
  proc.stdout.push(null);
  proc.stderr.push(null);
  proc.emit('close', code);
}

beforeEach(() => {
  spawnMock.mockReset();
  spawnMock.mockImplementation(() => makeFakeProc());
  existsSyncMock.mockReturnValue(true);
  getFfmpegPathMock.mockReturnValue('/usr/local/bin/ffmpeg');
  encodeMetadataValueMock.mockImplementation((v) => String(v));
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('buildMetadataArgs', () => {
  it('returns empty array for empty metadata', () => {
    expect(buildMetadataArgs({})).toEqual([]);
  });

  it('builds args for all populated fields', () => {
    const meta = {
      title: 'My Song',
      artist: 'Artist',
      album: 'Album',
      albumArtist: 'VA',
      genre: 'Rock',
      year: '2024',
      trackNumber: '3',
      composer: 'Composer',
      publisher: 'Label',
      comment: 'Nice',
      copyright: '2024',
      bpm: '120',
    };
    const args = buildMetadataArgs(meta);
    expect(args).toContain('title=My Song');
    expect(args).toContain('artist=Artist');
    expect(args).toContain('album=Album');
    expect(args).toContain('album_artist=VA');
    expect(args).toContain('genre=Rock');
    expect(args).toContain('date=2024');
    expect(args).toContain('track=3');
    expect(args).toContain('composer=Composer');
    expect(args).toContain('publisher=Label');
    expect(args).toContain('comment=Nice');
    expect(args).toContain('copyright=2024');
    expect(args).toContain('TBPM=120');
  });

  it('passes values through encodeMetadataValue', () => {
    encodeMetadataValueMock.mockImplementation((v) => `encoded(${v})`);
    const args = buildMetadataArgs({ title: 'A & B' });
    expect(encodeMetadataValueMock).toHaveBeenCalledWith('A & B');
    expect(args).toContain('title=encoded(A & B)');
  });

  it('formats trackNumber with totalTracks', () => {
    const args = buildMetadataArgs({ trackNumber: '5', totalTracks: '12' });
    expect(args).toContain('track=5/12');
  });
});

describe('getFfmpegUnavailableError', () => {
  const originalPlatform = process.platform;

  afterEach(() => {
    Object.defineProperty(process, 'platform', { value: originalPlatform });
  });

  it('returns win32-specific message on Windows', () => {
    Object.defineProperty(process, 'platform', { value: 'win32' });
    const msg = getFfmpegUnavailableError();
    expect(msg).toContain('ffmpeg.exe');
    expect(msg).toContain('bin/ folder');
  });

  it('returns unix-specific message on non-Windows', () => {
    Object.defineProperty(process, 'platform', { value: 'darwin' });
    const msg = getFfmpegUnavailableError();
    expect(msg).toContain('brew install ffmpeg');
    expect(msg).toContain('sudo apt install ffmpeg');
  });
});

describe('checkFfmpegAvailable', () => {
  it('resolves true when spawn exits with code 0', async () => {
    const proc = makeFakeProc();
    spawnMock.mockReturnValueOnce(proc);
    const promise = checkFfmpegAvailable();
    closeProc(proc, 0);
    await expect(promise).resolves.toBe(true);
  });

  it('resolves false when spawn emits error', async () => {
    const proc = makeFakeProc();
    spawnMock.mockReturnValueOnce(proc);
    const promise = checkFfmpegAvailable();
    proc.emit('error', new Error('ENOENT'));
    await expect(promise).resolves.toBe(false);
  });

  it('resolves false when file does not exist', async () => {
    existsSyncMock.mockReturnValue(false);
    const result = await checkFfmpegAvailable();
    expect(result).toBe(false);
    expect(spawnMock).not.toHaveBeenCalled();
  });
});

describe('runFfmpegCommand', () => {
  it('resolves on exit code 0', async () => {
    const proc = makeFakeProc();
    spawnMock.mockReturnValueOnce(proc);
    const promise = runFfmpegCommand('/in.mp3', '/out.mp3', ['-y']);
    closeProc(proc, 0);
    await expect(promise).resolves.toBeUndefined();
    expect(spawnMock).toHaveBeenCalledWith(
      '/usr/local/bin/ffmpeg',
      ['-i', '/in.mp3', '-c', 'copy', '-y', '/out.mp3'],
      { stdio: 'ignore' }
    );
  });

  it('rejects on non-zero exit code', async () => {
    const proc = makeFakeProc();
    spawnMock.mockReturnValueOnce(proc);
    const promise = runFfmpegCommand('/in.mp3', '/out.mp3');
    closeProc(proc, 1);
    await expect(promise).rejects.toThrow('FFmpeg failed with code 1');
  });

  it('rejects on error event', async () => {
    const proc = makeFakeProc();
    spawnMock.mockReturnValueOnce(proc);
    const promise = runFfmpegCommand('/in.mp3', '/out.mp3');
    proc.emit('error', new Error('spawn ENOENT'));
    await expect(promise).rejects.toThrow('spawn ENOENT');
  });
});

describe('splitAudioByTime', () => {
  it('passes correct args with metadata', async () => {
    const proc = makeFakeProc();
    spawnMock.mockReturnValueOnce(proc);
    const promise = splitAudioByTime('/in.flac', '/out.flac', 10, 60, { title: 'Track' });
    closeProc(proc, 0);
    await expect(promise).resolves.toBeUndefined();
    const args = spawnMock.mock.calls[0][1];
    expect(args).toEqual([
      '-i',
      '/in.flac',
      '-ss',
      '10',
      '-to',
      '60',
      '-c',
      'copy',
      '-metadata',
      'title=Track',
      '-y',
      '/out.flac',
    ]);
  });

  it('passes correct args without metadata', async () => {
    const proc = makeFakeProc();
    spawnMock.mockReturnValueOnce(proc);
    const promise = splitAudioByTime('/in.flac', '/out.flac', 0, 30);
    closeProc(proc, 0);
    await expect(promise).resolves.toBeUndefined();
    const args = spawnMock.mock.calls[0][1];
    expect(args).toEqual([
      '-i',
      '/in.flac',
      '-ss',
      '0',
      '-to',
      '30',
      '-c',
      'copy',
      '-y',
      '/out.flac',
    ]);
  });

  it('rejects on failure', async () => {
    const proc = makeFakeProc();
    spawnMock.mockReturnValueOnce(proc);
    const promise = splitAudioByTime('/in.flac', '/out.flac', 0, 30);
    closeProc(proc, 1);
    await expect(promise).rejects.toThrow('FFmpeg split failed with code 1');
  });
});

describe('convertLocalFile', () => {
  it('builds correct args for audio mp3 mode', async () => {
    const proc = makeFakeProc();
    spawnMock.mockReturnValueOnce(proc);
    const promise = convertLocalFile('/in.wav', '/out.mp3', {
      mode: 'audio',
      format: 'mp3',
      quality: 'best',
    });
    closeProc(proc, 0);
    await expect(promise).resolves.toBeUndefined();
    const args = spawnMock.mock.calls[0][1];
    expect(args[0]).toBe('-y');
    expect(args).toContain('-vn');
    expect(args).toContain('-acodec');
    expect(args).toContain('libmp3lame');
    expect(args[args.length - 1]).toBe('/out.mp3');
  });

  it('builds correct args for video mode', async () => {
    const proc = makeFakeProc();
    spawnMock.mockReturnValueOnce(proc);
    const promise = convertLocalFile('/in.mp4', '/out.mp4', { mode: 'video', quality: 'high' });
    closeProc(proc, 0);
    await expect(promise).resolves.toBeUndefined();
    const args = spawnMock.mock.calls[0][1];
    expect(args).toContain('-c:v');
    expect(args).toContain('libx264');
    expect(args).toContain('-c:a');
    expect(args).toContain('aac');
    expect(args).not.toContain('-vn');
  });

  it('invokes progress callback from stderr output', async () => {
    const proc = makeFakeProc();
    spawnMock.mockReturnValueOnce(proc);
    const onProgress = vi.fn();
    const promise = convertLocalFile(
      '/in.wav',
      '/out.mp3',
      { mode: 'audio', format: 'mp3' },
      onProgress
    );
    proc.stderr.push('frame=  100 fps=25 time=00:01:30.00 bitrate=128.0kbits/s');
    closeProc(proc, 0);
    await expect(promise).resolves.toBeUndefined();
    expect(onProgress).toHaveBeenCalled();
    const lastCall = onProgress.mock.calls[onProgress.mock.calls.length - 1][0];
    expect(lastCall).toBe(100);
  });

  it('rejects on failure', async () => {
    const proc = makeFakeProc();
    spawnMock.mockReturnValueOnce(proc);
    const promise = convertLocalFile('/in.wav', '/out.mp3', {});
    closeProc(proc, 1);
    await expect(promise).rejects.toThrow('FFmpeg conversion failed with code 1');
  });
});
