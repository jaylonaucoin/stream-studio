import { createRequire } from 'node:module';
import Module from 'node:module';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const require = createRequire(import.meta.url);
const EventEmitter = require('events');

const spawnQueue = [];
const spawnMock = vi.fn(() => {
  const next = spawnQueue.shift();
  if (!next) throw new Error('No queued fake process — call enqueue() first');
  return next;
});

const originalLoad = Module._load;
Module._load = function (uri, parent, isMain) {
  if (uri === 'child_process') {
    return { spawn: spawnMock };
  }
  return originalLoad.call(this, uri, parent, isMain);
};

vi.mock('../utils/paths', () => ({ getYtDlpPath: vi.fn(() => '/usr/bin/yt-dlp') }));
vi.mock('../utils/url', () => ({ sanitizeUrl: vi.fn((u) => u) }));

function makeFakeProc() {
  const proc = new EventEmitter();
  proc.stdout = new EventEmitter();
  proc.stderr = new EventEmitter();
  proc.pid = 99;
  proc.killed = false;
  proc.kill = vi.fn(() => {
    proc.killed = true;
  });
  return proc;
}

function enqueue() {
  const proc = makeFakeProc();
  spawnQueue.push(proc);
  return proc;
}

function closeProc(proc, { stdout = '', stderr = '', code = 0 } = {}) {
  if (stdout) proc.stdout.emit('data', Buffer.from(stdout));
  if (stderr) proc.stderr.emit('data', Buffer.from(stderr));
  proc.emit('close', code);
}

let mod;
const swallowed = [];
const swallowRejection = (err) => {
  swallowed.push(err);
};

beforeEach(async () => {
  vi.resetModules();
  spawnMock.mockClear();
  spawnQueue.length = 0;
  process.on('unhandledRejection', swallowRejection);
  mod = await import('./videoInfo.js');
});

afterEach(() => {
  vi.useRealTimers();
  process.removeListener('unhandledRejection', swallowRejection);
  swallowed.length = 0;
});

describe('formatDuration', () => {
  it('returns empty string for 0', () => {
    expect(mod.formatDuration(0)).toBe('');
  });

  it('returns empty string for null', () => {
    expect(mod.formatDuration(null)).toBe('');
  });

  it('returns empty string for NaN', () => {
    expect(mod.formatDuration(NaN)).toBe('');
  });

  it('formats 65 seconds as 1:05', () => {
    expect(mod.formatDuration(65)).toBe('1:05');
  });

  it('formats 3661 seconds as 1:01:01', () => {
    expect(mod.formatDuration(3661)).toBe('1:01:01');
  });

  it('formats 30 seconds as 0:30', () => {
    expect(mod.formatDuration(30)).toBe('0:30');
  });
});

describe('getHighQualityThumbnail', () => {
  it('returns array of URLs for youtube video', () => {
    const result = mod.getHighQualityThumbnail('abc123', 'https://www.youtube.com/watch?v=abc123');
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(3);
    expect(result[0]).toContain('abc123');
    expect(result[0]).toContain('maxresdefault');
  });

  it('returns null for non-youtube platform', () => {
    const result = mod.getHighQualityThumbnail('abc', 'https://vimeo.com/abc', 'vimeo');
    expect(result).toBeNull();
  });
});

describe('getVideoInfo', () => {
  it('resolves with video info on success', async () => {
    const proc = enqueue();

    const promise = mod.getVideoInfo('https://www.youtube.com/watch?v=test1');

    closeProc(proc, {
      stdout: JSON.stringify({
        title: 'Test Video',
        thumbnail: 'https://thumb.jpg',
        duration: 120,
        uploader: 'TestChannel',
        view_count: 1000,
        upload_date: '20240101',
        description: 'A test',
        webpage_url: 'https://www.youtube.com/watch?v=test1',
        extractor: 'youtube',
      }),
    });

    const result = await promise;
    expect(result.success).toBe(true);
    expect(result.title).toBe('Test Video');
    expect(result.duration).toBe(120);
    expect(result.durationFormatted).toBe('2:00');
    expect(result.uploader).toBe('TestChannel');
  });

  it('rejects on malformed JSON', async () => {
    const proc = enqueue();

    const promise = mod.getVideoInfo('https://example.com/vid');
    closeProc(proc, { stdout: '{not-json' });

    await expect(promise).rejects.toThrow('Failed to parse video info');
  });

  it('rejects with private video message', async () => {
    const proc = enqueue();

    const promise = mod.getVideoInfo('https://example.com/private');
    closeProc(proc, { stderr: 'ERROR: This video is private', code: 1 });

    await expect(promise).rejects.toThrow('private or unavailable');
  });

  it('retries once on timeout then resolves', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });

    enqueue();
    const proc2 = enqueue();

    const promise = mod.getVideoInfo('https://example.com/slow');

    await vi.advanceTimersByTimeAsync(40_000);

    closeProc(proc2, {
      stdout: JSON.stringify({
        title: 'Retry Video',
        duration: 60,
        webpage_url: 'https://example.com/slow',
      }),
    });

    const result = await promise;
    expect(result.success).toBe(true);
    expect(result.title).toBe('Retry Video');
    expect(spawnMock).toHaveBeenCalledTimes(2);
  });

  it('returns cached data on second call', async () => {
    const proc = enqueue();

    const p1 = mod.getVideoInfo('https://example.com/cache');
    closeProc(proc, {
      stdout: JSON.stringify({
        title: 'Cached',
        duration: 10,
        webpage_url: 'https://example.com/cache',
      }),
    });
    await p1;

    const result = await mod.getVideoInfo('https://example.com/cache');
    expect(result.title).toBe('Cached');
    expect(spawnMock).toHaveBeenCalledTimes(1);
  });
});

describe('getPlaylistInfo', () => {
  it('returns isPlaylist false for single video without playlist title', async () => {
    const proc = enqueue();

    const promise = mod.getPlaylistInfo('https://example.com/single');
    closeProc(proc, { stdout: JSON.stringify({ id: 'v1', title: 'Solo' }) });

    const result = await promise;
    expect(result.success).toBe(true);
    expect(result.isPlaylist).toBe(false);
  });

  it('returns playlist data for multi-video response', async () => {
    const proc = enqueue();

    const promise = mod.getPlaylistInfo('https://youtube.com/playlist?list=PL123');

    const lines = [
      JSON.stringify({
        id: 'v1',
        title: 'First',
        duration: 60,
        playlist: 'My Playlist',
        uploader: 'Chan',
        playlist_index: 1,
        url: 'https://youtube.com/watch?v=v1',
      }),
      JSON.stringify({
        id: 'v2',
        title: 'Second',
        duration: 120,
        playlist: 'My Playlist',
        playlist_index: 2,
        url: 'https://youtube.com/watch?v=v2',
      }),
    ].join('\n');

    closeProc(proc, { stdout: lines });

    const result = await promise;
    expect(result.success).toBe(true);
    expect(result.isPlaylist).toBe(true);
    expect(result.playlistTitle).toBe('My Playlist');
    expect(result.playlistVideoCount).toBe(2);
    expect(result.videos).toHaveLength(2);
    expect(result.playlistTotalDuration).toBe(180);
  });

  it('returns isPlaylist false for empty stdout', async () => {
    const proc = enqueue();

    const promise = mod.getPlaylistInfo('https://example.com/empty');
    closeProc(proc, { code: 1 });

    const result = await promise;
    expect(result.success).toBe(true);
    expect(result.isPlaylist).toBe(false);
  });
});

describe('getChapterInfo', () => {
  it('returns chapters when video has them', async () => {
    const proc = enqueue();

    const promise = mod.getChapterInfo('https://example.com/chapters');

    closeProc(proc, {
      stdout: JSON.stringify({
        duration: 300,
        chapters: [
          { title: 'Intro', start_time: 0, end_time: 60 },
          { title: 'Main', start_time: 60, end_time: 300 },
        ],
      }),
    });

    const result = await promise;
    expect(result.success).toBe(true);
    expect(result.hasChapters).toBe(true);
    expect(result.totalChapters).toBe(2);
    expect(result.chapters[0].title).toBe('Intro');
    expect(result.chapters[0].duration).toBe(60);
  });

  it('returns hasChapters false when video has no chapters', async () => {
    const proc = enqueue();

    const promise = mod.getChapterInfo('https://example.com/nochapters');
    closeProc(proc, { stdout: JSON.stringify({ duration: 120, chapters: [] }) });

    const result = await promise;
    expect(result.success).toBe(true);
    expect(result.hasChapters).toBe(false);
    expect(result.chapters).toEqual([]);
  });

  it('rejects on parse error', async () => {
    const proc = enqueue();

    const promise = mod.getChapterInfo('https://example.com/bad');
    closeProc(proc, { stdout: 'not json' });

    await expect(promise).rejects.toThrow('Failed to parse chapter info');
  });
});

describe('searchMultiSite', () => {
  it('returns error for empty query', async () => {
    const result = await mod.searchMultiSite('youtube', '');
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/empty/);
  });

  it('returns results for valid query', async () => {
    const proc = enqueue();

    const promise = mod.searchMultiSite('youtube', 'test song');

    const lines = [
      JSON.stringify({
        id: 'r1',
        title: 'Result 1',
        duration: 200,
        webpage_url: 'https://youtube.com/watch?v=r1',
        uploader: 'Artist1',
      }),
      JSON.stringify({
        id: 'r2',
        title: 'Result 2',
        duration: 180,
        webpage_url: 'https://youtube.com/watch?v=r2',
        uploader: 'Artist2',
      }),
    ].join('\n');

    closeProc(proc, { stdout: lines });

    const result = await promise;
    expect(result.success).toBe(true);
    expect(result.results).toHaveLength(2);
    expect(result.results[0].title).toBe('Result 1');
  });

  it('rejects on timeout', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    enqueue();

    const promise = mod.searchMultiSite('youtube', 'slow query');

    await vi.advanceTimersByTimeAsync(40_000);

    await expect(promise).rejects.toThrow('Search timed out');
    vi.clearAllTimers();
  });
});

describe('searchYouTube', () => {
  it('delegates to searchMultiSite with youtube site', async () => {
    const proc = enqueue();

    const promise = mod.searchYouTube('my query', 5);

    closeProc(proc, {
      stdout: JSON.stringify({
        id: 'yt1',
        title: 'YT Result',
        duration: 100,
        webpage_url: 'https://youtube.com/watch?v=yt1',
        uploader: 'Chan',
      }),
    });

    const result = await promise;
    expect(result.success).toBe(true);
    expect(result.results[0].title).toBe('YT Result');

    const spawnArgs = spawnMock.mock.calls[0][1];
    expect(spawnArgs.some((a) => a.startsWith('ytsearch'))).toBe(true);
  });
});

describe('getAudioStreamUrl', () => {
  it('resolves with URL on success', async () => {
    const proc = enqueue();

    const promise = mod.getAudioStreamUrl('https://youtube.com/watch?v=audio1');
    closeProc(proc, { stdout: 'https://stream.example.com/audio\n' });

    const result = await promise;
    expect(result.success).toBe(true);
    expect(result.url).toBe('https://stream.example.com/audio');
  });

  it('retries once on timeout then resolves', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });

    enqueue();
    const proc2 = enqueue();

    const promise = mod.getAudioStreamUrl('https://youtube.com/watch?v=slow');

    await vi.advanceTimersByTimeAsync(40_000);

    closeProc(proc2, { stdout: 'https://stream.example.com/retry\n' });

    const result = await promise;
    expect(result.success).toBe(true);
    expect(result.url).toBe('https://stream.example.com/retry');
    expect(spawnMock).toHaveBeenCalledTimes(2);
  });

  it('rejects with private video error', async () => {
    const proc = enqueue();

    const promise = mod.getAudioStreamUrl('https://youtube.com/watch?v=priv');
    closeProc(proc, { stderr: 'ERROR: This video is private', code: 1 });

    await expect(promise).rejects.toThrow('private or unavailable');
  });

  it('returns cached data on second call', async () => {
    const proc = enqueue();

    const p1 = mod.getAudioStreamUrl('https://youtube.com/watch?v=cached');
    closeProc(proc, { stdout: 'https://stream.example.com/cached\n' });
    await p1;

    const result = await mod.getAudioStreamUrl('https://youtube.com/watch?v=cached');
    expect(result.success).toBe(true);
    expect(result.url).toBe('https://stream.example.com/cached');
    expect(spawnMock).toHaveBeenCalledTimes(1);
  });
});

describe('getCachedVideoInfo', () => {
  it('returns null when no cache exists', () => {
    expect(mod.getCachedVideoInfo('https://example.com/none')).toBeNull();
  });

  it('returns data when cache is populated', async () => {
    const proc = enqueue();

    const promise = mod.getVideoInfo('https://example.com/forcache');
    closeProc(proc, {
      stdout: JSON.stringify({
        title: 'For Cache',
        duration: 42,
        webpage_url: 'https://example.com/forcache',
      }),
    });
    await promise;

    const cached = mod.getCachedVideoInfo('https://example.com/forcache');
    expect(cached).not.toBeNull();
    expect(cached.title).toBe('For Cache');
  });
});

describe('getCachedChapterInfo', () => {
  it('returns null when no cache exists', () => {
    expect(mod.getCachedChapterInfo('https://example.com/nochap')).toBeNull();
  });
});
