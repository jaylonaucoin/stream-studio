import { createRequire } from 'node:module';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createFakeIpcMain } from '../../../tests/setup/fake-ipc-main.js';
import { registerHandlers } from './videoInfo.js';

const require = createRequire(import.meta.url);
const videoInfoService = require('../../services/videoInfo.js');

describe('videoInfo IPC handlers', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('getVideoInfo returns service result', async () => {
    vi.spyOn(videoInfoService, 'getVideoInfo').mockResolvedValue({ success: true, title: 'x' });
    const ipc = createFakeIpcMain();
    registerHandlers(ipc);
    await expect(ipc.invoke('getVideoInfo', {}, 'https://a.com')).resolves.toEqual({
      success: true,
      title: 'x',
    });
  });

  it('getVideoInfo maps thrown errors', async () => {
    vi.spyOn(videoInfoService, 'getVideoInfo').mockRejectedValue(new Error('fail'));
    const ipc = createFakeIpcMain();
    registerHandlers(ipc);
    await expect(ipc.invoke('getVideoInfo', {}, 'https://a.com')).resolves.toEqual({
      success: false,
      error: 'fail',
    });
  });

  it('getPlaylistInfo maps thrown errors', async () => {
    vi.spyOn(videoInfoService, 'getPlaylistInfo').mockRejectedValue(new Error('nope'));
    const ipc = createFakeIpcMain();
    registerHandlers(ipc);
    await expect(ipc.invoke('getPlaylistInfo', {}, 'https://a.com')).resolves.toEqual({
      success: false,
      isPlaylist: false,
      error: 'nope',
    });
  });

  it('searchMultiSite maps thrown errors', async () => {
    vi.spyOn(videoInfoService, 'searchMultiSite').mockRejectedValue(new Error('bad'));
    const ipc = createFakeIpcMain();
    registerHandlers(ipc);
    await expect(ipc.invoke('searchMultiSite', {}, 'youtube', 'q', 5)).resolves.toEqual({
      success: false,
      results: [],
      error: 'bad',
    });
  });
});
