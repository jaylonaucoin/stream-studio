import { createRequire } from 'node:module';
import Module from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { EventEmitter } from 'node:events';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const spawnMock = vi.fn();
const writeFileSyncMock = vi.fn();
const renameSyncMock = vi.fn();
const unlinkSyncMock = vi.fn();
const nodeId3WriteMock = vi.fn();
const getFfmpegPathMock = vi.fn(() => '/usr/local/bin/ffmpeg');
const encodeMetadataValueMock = vi.fn((v) => String(v));

const httpsGetMock = vi.fn();
const httpGetMock = vi.fn();

const MOCK_CP = path.join(__dirname, '__mock_meta_cp__');
const MOCK_FS = path.join(__dirname, '__mock_meta_fs__');
const MOCK_HTTPS = path.join(__dirname, '__mock_meta_https__');
const MOCK_HTTP = path.join(__dirname, '__mock_meta_http__');
const MOCK_ID3 = path.join(__dirname, '__mock_meta_id3__');
const MOCK_PATHS = path.join(__dirname, '__mock_meta_paths__');
const MOCK_META_UTIL = path.join(__dirname, '__mock_meta_util__');

function installMockModule(key, exports) {
  const m = new Module(key);
  m.filename = key;
  m.loaded = true;
  m.exports = exports;
  require.cache[key] = m;
}

installMockModule(MOCK_CP, { spawn: spawnMock });
installMockModule(MOCK_FS, {
  writeFileSync: writeFileSyncMock,
  renameSync: renameSyncMock,
  unlinkSync: unlinkSyncMock,
});
installMockModule(MOCK_HTTPS, { get: httpsGetMock });
installMockModule(MOCK_HTTP, { get: httpGetMock });
installMockModule(MOCK_ID3, { write: nodeId3WriteMock });
installMockModule(MOCK_PATHS, { getFfmpegPath: getFfmpegPathMock });
installMockModule(MOCK_META_UTIL, { encodeMetadataValue: encodeMetadataValueMock });

const originalResolveFilename = Module._resolveFilename;
Module._resolveFilename = function (request, parent, isMain, options) {
  const fromMetadata = parent?.filename?.includes('metadata.js');
  if (request === 'child_process' && fromMetadata) return MOCK_CP;
  if (request === 'fs' && fromMetadata) return MOCK_FS;
  if (request === 'https' && fromMetadata) return MOCK_HTTPS;
  if (request === 'http' && fromMetadata) return MOCK_HTTP;
  if (request === 'node-id3' && fromMetadata) return MOCK_ID3;
  if (request === '../utils/paths' && fromMetadata) return MOCK_PATHS;
  if (request === '../utils/metadata' && fromMetadata) return MOCK_META_UTIL;
  return originalResolveFilename.call(this, request, parent, isMain, options);
};

const { applyMetadataToFile, fetchThumbnailBuffer, detectMimeType } = require('./metadata.js');

function makeFakeProc() {
  const proc = new EventEmitter();
  proc.pid = 12345;
  proc.killed = false;
  proc.kill = vi.fn(() => {
    proc.killed = true;
  });
  return proc;
}

function makeFakeHttpResponse(chunks) {
  const res = new EventEmitter();
  setTimeout(() => {
    for (const chunk of chunks) {
      res.emit('data', chunk);
    }
    res.emit('end');
  }, 0);
  return res;
}

function makeFakeHttpRequest(response) {
  const req = new EventEmitter();
  req.setTimeout = vi.fn((_, cb) => {
    req._timeoutCb = cb;
  });
  req.destroy = vi.fn();
  setTimeout(() => {
    if (response) response(req);
  }, 0);
  return req;
}

beforeEach(() => {
  spawnMock.mockReset();
  writeFileSyncMock.mockReset();
  renameSyncMock.mockReset();
  unlinkSyncMock.mockReset();
  nodeId3WriteMock.mockReset();
  getFfmpegPathMock.mockReturnValue('/usr/local/bin/ffmpeg');
  encodeMetadataValueMock.mockImplementation((v) => String(v));
  httpsGetMock.mockReset();
  httpGetMock.mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('detectMimeType', () => {
  it('detects PNG from magic bytes', () => {
    const buf = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x00]);
    expect(detectMimeType(buf)).toBe('image/png');
  });

  it('detects JPEG from magic bytes', () => {
    const buf = Buffer.from([0xff, 0xd8, 0xff, 0xe0]);
    expect(detectMimeType(buf)).toBe('image/jpeg');
  });

  it('detects WebP from RIFF magic bytes', () => {
    const buf = Buffer.from([0x52, 0x49, 0x46, 0x46, 0x00]);
    expect(detectMimeType(buf)).toBe('image/webp');
  });

  it('defaults to image/jpeg for unknown bytes', () => {
    const buf = Buffer.from([0x00, 0x01, 0x02, 0x03]);
    expect(detectMimeType(buf)).toBe('image/jpeg');
  });
});

describe('fetchThumbnailBuffer', () => {
  it('returns null for null input', async () => {
    const result = await fetchThumbnailBuffer(null);
    expect(result).toBeNull();
  });

  it('returns null for empty string', async () => {
    const result = await fetchThumbnailBuffer('');
    expect(result).toBeNull();
  });

  it('parses a data URL correctly', async () => {
    const raw = Buffer.from('hello thumbnail');
    const dataUrl = `data:image/png;base64,${raw.toString('base64')}`;
    const result = await fetchThumbnailBuffer(dataUrl);
    expect(result).toEqual(raw);
  });

  it('fetches from HTTPS URL', async () => {
    const expected = Buffer.from('image-data');
    httpsGetMock.mockImplementation((url, cb) => {
      const res = makeFakeHttpResponse([expected]);
      cb(res);
      const req = new EventEmitter();
      req.setTimeout = vi.fn();
      req.destroy = vi.fn();
      return req;
    });

    const result = await fetchThumbnailBuffer('https://example.com/thumb.jpg');
    expect(httpsGetMock).toHaveBeenCalled();
    expect(result).toEqual(expected);
  });

  it('fetches from HTTP URL using http client', async () => {
    const expected = Buffer.from('http-image');
    httpGetMock.mockImplementation((url, cb) => {
      const res = makeFakeHttpResponse([expected]);
      cb(res);
      const req = new EventEmitter();
      req.setTimeout = vi.fn();
      req.destroy = vi.fn();
      return req;
    });

    const result = await fetchThumbnailBuffer('http://example.com/thumb.jpg');
    expect(httpGetMock).toHaveBeenCalled();
    expect(result).toEqual(expected);
  });

  it('rejects on network error', async () => {
    httpsGetMock.mockImplementation(() => {
      const req = new EventEmitter();
      req.setTimeout = vi.fn();
      req.destroy = vi.fn();
      setTimeout(() => req.emit('error', new Error('ECONNREFUSED')), 0);
      return req;
    });

    await expect(fetchThumbnailBuffer('https://example.com/fail.jpg')).rejects.toThrow(
      'ECONNREFUSED'
    );
  });

  it('rejects on timeout', async () => {
    httpsGetMock.mockImplementation(() => {
      const req = new EventEmitter();
      req.setTimeout = vi.fn((_, cb) => {
        setTimeout(cb, 0);
      });
      req.destroy = vi.fn(() => {
        req.emit('error', new Error('Timeout fetching thumbnail'));
      });
      return req;
    });

    await expect(fetchThumbnailBuffer('https://example.com/slow.jpg')).rejects.toThrow(
      'Timeout fetching thumbnail'
    );
  });
});

describe('applyMetadataToFile', () => {
  it('uses node-id3 for MP3 files', async () => {
    nodeId3WriteMock.mockReturnValue(true);

    const result = await applyMetadataToFile('/music/song.mp3', { title: 'Test' }, null);
    expect(nodeId3WriteMock).toHaveBeenCalled();
    expect(result).toEqual({ success: true });
  });

  it('uses ffmpeg for non-MP3 files without thumbnail', async () => {
    const proc = makeFakeProc();
    spawnMock.mockReturnValueOnce(proc);

    const promise = applyMetadataToFile('/music/song.flac', { title: 'Test' }, null);
    setTimeout(() => proc.emit('close', 0), 0);
    const result = await promise;

    expect(spawnMock).toHaveBeenCalled();
    expect(renameSyncMock).toHaveBeenCalled();
    expect(result).toEqual({ success: true });
  });

  it('uses ffmpeg with thumbnail for non-MP3 files', async () => {
    const thumbBuf = Buffer.from('fake-image');
    const dataUrl = `data:image/jpeg;base64,${thumbBuf.toString('base64')}`;

    const proc = makeFakeProc();
    spawnMock.mockReturnValueOnce(proc);

    const promise = applyMetadataToFile('/music/song.m4a', { title: 'Track' }, dataUrl);
    setTimeout(() => proc.emit('close', 0), 0);
    const result = await promise;

    expect(writeFileSyncMock).toHaveBeenCalled();
    expect(renameSyncMock).toHaveBeenCalled();
    expect(unlinkSyncMock).toHaveBeenCalled();
    expect(result).toEqual({ success: true });
  });

  it('returns error when NodeID3.write fails', async () => {
    nodeId3WriteMock.mockReturnValue(false);

    const result = await applyMetadataToFile('/music/song.mp3', { title: 'Bad' }, null);
    expect(result.success).toBe(false);
    expect(result.error).toContain('Failed to write ID3 tags');
  });

  it('returns error when ffmpeg exits with non-zero code', async () => {
    const proc = makeFakeProc();
    spawnMock.mockReturnValueOnce(proc);

    const promise = applyMetadataToFile('/music/song.ogg', { title: 'Fail' }, null);
    setTimeout(() => proc.emit('close', 1), 0);
    const result = await promise;

    expect(result.success).toBe(false);
    expect(result.error).toContain('FFmpeg failed with code 1');
  });

  it('returns error when ffmpeg emits an error event', async () => {
    const proc = makeFakeProc();
    spawnMock.mockReturnValueOnce(proc);

    const promise = applyMetadataToFile('/music/song.wav', { title: 'Err' }, null);
    setTimeout(() => proc.emit('error', new Error('spawn ENOENT')), 0);
    const result = await promise;

    expect(result.success).toBe(false);
    expect(result.error).toContain('spawn ENOENT');
  });
});
