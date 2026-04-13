import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRequire } from 'node:module';
import { createFakeIpcMain } from './setup/fake-ipc-main.js';
import { registerAllHandlers } from '../main/ipc/index.js';
import store from '../main/store.js';

vi.mock('../main/window.js', () => ({
  getMainWindow: () => null,
}));

const require = createRequire(import.meta.url);

describe('IPC round-trip', () => {
  let videoInfo;
  let ffmpeg;

  beforeEach(() => {
    store.clear();
    videoInfo = require('../main/services/videoInfo.js');
    ffmpeg = require('../main/services/ffmpeg.js');
    vi.spyOn(ffmpeg, 'checkFfmpegAvailable').mockResolvedValue(true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function setupIpc() {
    const ipc = createFakeIpcMain();
    registerAllHandlers(ipc);
    return ipc;
  }

  it('ping returns pong', async () => {
    const ipc = setupIpc();
    await expect(ipc.invoke('ping', {})).resolves.toBe('pong');
  });

  it('getAppVersion returns a string', async () => {
    const ipc = setupIpc();
    const v = await ipc.invoke('getAppVersion', {});
    expect(typeof v).toBe('string');
    expect(v.length).toBeGreaterThan(0);
  });

  it('getSettings returns expected keys', async () => {
    const ipc = setupIpc();
    const s = await ipc.invoke('getSettings', {});
    expect(s).toMatchObject({
      defaultMode: 'audio',
      theme: 'dark',
      discogsToken: expect.any(String),
      defaultSearchSite: expect.any(String),
    });
  });

  it('saveSettings then getSettings persists theme', async () => {
    const ipc = setupIpc();
    await ipc.invoke('saveSettings', {}, { theme: 'light' });
    const s = await ipc.invoke('getSettings', {});
    expect(s.theme).toBe('light');
  });

  it('saveSettings ignores unknown keys', async () => {
    const ipc = setupIpc();
    await ipc.invoke('saveSettings', {}, { theme: 'dark', rogueKey: 'x', n: 99 });
    const s = await ipc.invoke('getSettings', {});
    expect('rogueKey' in s).toBe(false);
    expect('n' in s).toBe(false);
  });

  it('getHistory returns empty success wrapper initially', async () => {
    const ipc = setupIpc();
    await expect(ipc.invoke('getHistory', {})).resolves.toEqual({ success: true, items: [] });
  });

  it('getHistory returns items after addToHistory', async () => {
    const { addToHistory } = require('../main/services/history.js');
    addToHistory({ fileName: 'a.mp3', url: 'https://a', format: 'mp3', mode: 'audio' });
    const ipc = setupIpc();
    const res = await ipc.invoke('getHistory', {});
    expect(res.success).toBe(true);
    expect(res.items).toHaveLength(1);
    expect(res.items[0].fileName).toBe('a.mp3');
  });

  it('clearHistory empties items', async () => {
    const { addToHistory } = require('../main/services/history.js');
    addToHistory({ fileName: 'a.mp3', url: 'https://a', format: 'mp3', mode: 'audio' });
    const ipc = setupIpc();
    await ipc.invoke('clearHistory', {});
    const res = await ipc.invoke('getHistory', {});
    expect(res.items).toEqual([]);
  });

  it('removeHistoryItem removes by id', async () => {
    const { addToHistory, getHistory } = require('../main/services/history.js');
    let t = 1000;
    vi.spyOn(Date, 'now').mockImplementation(() => t++);
    addToHistory({ fileName: 'a.mp3', url: 'https://a', format: 'mp3', mode: 'audio' });
    vi.restoreAllMocks();
    const [item] = getHistory();
    const ipc = setupIpc();
    const removed = await ipc.invoke('removeHistoryItem', {}, item.id);
    expect(Array.isArray(removed)).toBe(true);
    expect(removed).toHaveLength(0);
  });

  it('checkFfmpeg returns availability shape', async () => {
    const ipc = setupIpc();
    const r = await ipc.invoke('checkFfmpeg', {});
    expect(r).toMatchObject({ available: true });
  });

  it('getVideoInfo maps errors to failure object', async () => {
    vi.spyOn(videoInfo, 'getVideoInfo').mockRejectedValue(new Error('fail'));
    const ipc = setupIpc();
    await expect(ipc.invoke('getVideoInfo', {}, 'https://a.com')).resolves.toEqual({
      success: false,
      error: 'fail',
    });
  });

  it('getPlaylistInfo maps errors', async () => {
    vi.spyOn(videoInfo, 'getPlaylistInfo').mockRejectedValue(new Error('pl'));
    const ipc = setupIpc();
    await expect(ipc.invoke('getPlaylistInfo', {}, 'https://a.com')).resolves.toEqual({
      success: false,
      isPlaylist: false,
      error: 'pl',
    });
  });

  it('getChapterInfo maps errors', async () => {
    vi.spyOn(videoInfo, 'getChapterInfo').mockRejectedValue(new Error('ch'));
    const ipc = setupIpc();
    await expect(ipc.invoke('getChapterInfo', {}, 'https://a.com')).resolves.toEqual({
      success: false,
      hasChapters: false,
      error: 'ch',
    });
  });

  it('enumerateLocalMedia normalizes non-array input', async () => {
    const batchLocal = require('../main/services/batch-local.js');
    vi.spyOn(batchLocal, 'enumeratePaths').mockReturnValue({ paths: [], truncated: false });
    const ipc = setupIpc();
    await ipc.invoke('enumerateLocalMedia', {}, 'not-array', {});
    expect(batchLocal.enumeratePaths).toHaveBeenCalledWith([], {});
  });

  it('fetchCatalogMetadataFromUrl rejects empty url', async () => {
    const ipc = setupIpc();
    await expect(ipc.invoke('fetchCatalogMetadataFromUrl', {}, '')).resolves.toEqual({
      success: false,
      error: 'URL is required',
    });
  });
});
