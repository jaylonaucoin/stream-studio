import { createRequire } from 'node:module';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createFakeIpcMain } from '../../../tests/setup/fake-ipc-main.js';
import store from '../../store.js';
import { registerHandlers } from './catalog-metadata.js';

const require = createRequire(import.meta.url);
const catalogLookup = require('../../services/music-catalog-lookup.js');

const MB_RELEASE = 'https://musicbrainz.org/release/1981d183-0dfd-4d7c-b0ae-55e59738d845';

describe('catalog-metadata IPC handlers', () => {
  beforeEach(() => {
    if (typeof store.clear === 'function') {
      store.clear();
    }
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('rejects missing url', async () => {
    const ipc = createFakeIpcMain();
    registerHandlers(ipc);
    await expect(ipc.invoke('fetchCatalogMetadataFromUrl', {}, '')).resolves.toEqual({
      success: false,
      error: 'URL is required',
    });
  });

  it('passes discogs token from settings', async () => {
    store.set('settings', { ...store.get('settings'), discogsToken: 'tok' });
    vi.spyOn(catalogLookup, 'fetchCatalogMetadataFromUrl').mockResolvedValue({
      success: true,
      meta: {},
    });
    const ipc = createFakeIpcMain();
    registerHandlers(ipc);
    await expect(ipc.invoke('fetchCatalogMetadataFromUrl', {}, MB_RELEASE)).resolves.toEqual({
      success: true,
      meta: {},
    });
    expect(catalogLookup.fetchCatalogMetadataFromUrl).toHaveBeenCalledWith(MB_RELEASE, {
      discogsToken: 'tok',
    });
  });

  it('maps thrown errors', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(catalogLookup, 'fetchCatalogMetadataFromUrl').mockRejectedValue(new Error('net'));
    const ipc = createFakeIpcMain();
    registerHandlers(ipc);
    await expect(ipc.invoke('fetchCatalogMetadataFromUrl', {}, MB_RELEASE)).resolves.toEqual({
      success: false,
      error: 'net',
    });
  });
});
