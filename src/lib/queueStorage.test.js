import { describe, it, expect, beforeEach, vi } from 'vitest';
import { buildQueueItem } from '../../tests/factories.js';
import { loadQueueFromStorage, saveQueueToStorage } from './queueStorage.js';

const STORAGE_KEY = 'stream-studio-queue';
const OLD_KEY = 'media-converter-queue';

describe('queueStorage', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  it('returns empty when missing', () => {
    expect(loadQueueFromStorage()).toEqual({ items: [], loadError: null });
  });

  it('migrates legacy key', () => {
    const legacy = JSON.stringify([{ url: 'https://a.com', isPlaylist: false }]);
    localStorage.setItem(OLD_KEY, legacy);
    const { items, loadError } = loadQueueFromStorage();
    expect(loadError).toBeNull();
    expect(items).toHaveLength(1);
    expect(items[0].url).toBe('https://a.com');
    expect(localStorage.getItem(STORAGE_KEY)).toBeTruthy();
    expect(localStorage.getItem(OLD_KEY)).toBeNull();
  });

  it('handles invalid JSON', () => {
    localStorage.setItem(STORAGE_KEY, '{');
    const { items, loadError } = loadQueueFromStorage();
    expect(items).toEqual([]);
    expect(loadError).toContain('Could not read');
  });

  it('handles non-array JSON', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({}));
    const { items, loadError } = loadQueueFromStorage();
    expect(items).toEqual([]);
    expect(loadError).toContain('invalid');
  });

  it('saveQueueToStorage persists minimal fields', () => {
    const q = [
      {
        url: 'https://b.com',
        isPlaylist: true,
        playlistMode: 'single',
        title: 'T',
      },
    ];
    expect(saveQueueToStorage(q)).toEqual({ success: true });
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY));
    expect(raw[0]).toEqual({
      url: 'https://b.com',
      isPlaylist: true,
      playlistMode: 'single',
      title: 'T',
    });
  });

  it('saveQueueToStorage maps quota errors', () => {
    const setItem = vi.spyOn(Storage.prototype, 'setItem');
    const err = new DOMException('QuotaExceededError', 'QuotaExceededError');
    setItem.mockImplementation(() => {
      throw err;
    });
    const r = saveQueueToStorage([buildQueueItem({ url: 'https://x.com' })]);
    expect(r.success).toBe(false);
    expect(r.error).toContain('full');
    setItem.mockRestore();
  });

  it('filters out entries with empty url after load', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify([buildQueueItem({ url: 'https://keep.com' }), buildQueueItem({ url: '' })])
    );
    const { items } = loadQueueFromStorage();
    expect(items).toHaveLength(1);
    expect(items[0].url).toBe('https://keep.com');
  });

  it('saveQueueToStorage returns generic error for non-quota failures', () => {
    const setItem = vi.spyOn(Storage.prototype, 'setItem');
    setItem.mockImplementation(() => {
      throw new Error('boom');
    });
    const r = saveQueueToStorage([buildQueueItem()]);
    expect(r.success).toBe(false);
    expect(r.error).toContain('could not be saved');
    setItem.mockRestore();
  });

  it('saveQueueToStorage reports success when window is undefined', () => {
    vi.stubGlobal('window', undefined);
    try {
      const r = saveQueueToStorage([buildQueueItem({ url: 'https://nw.com' })]);
      expect(r).toEqual({ success: true });
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
