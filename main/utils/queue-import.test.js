import { describe, it, expect } from 'vitest';
import { normalizeQueueImportData, PLAYLIST_MODES } from './queue-import.js';

describe('normalizeQueueImportData', () => {
  it('rejects non-array', () => {
    const r = normalizeQueueImportData({});
    expect(r.ok).toBe(false);
    expect(r.error).toContain('array');
  });

  it('skips invalid rows and collects valid urls', () => {
    const r = normalizeQueueImportData([
      null,
      { url: '  https://a.com  ', isPlaylist: true, playlistMode: 'single', title: 1 },
    ]);
    expect(r.ok).toBe(true);
    expect(r.items).toHaveLength(1);
    expect(r.items[0].url).toBe('https://a.com');
    expect(r.items[0].isPlaylist).toBe(true);
    expect(r.items[0].playlistMode).toBe('single');
    expect(r.items[0].title).toBe('1');
  });

  it('defaults playlist mode when invalid', () => {
    const r = normalizeQueueImportData([{ url: 'https://x.com', playlistMode: 'nope' }]);
    expect(r.ok).toBe(true);
    expect(r.items[0].playlistMode).toBe('full');
  });

  it('errors when no valid entries', () => {
    const r = normalizeQueueImportData([{ url: '' }, { foo: 1 }]);
    expect(r.ok).toBe(false);
  });
});

describe('PLAYLIST_MODES', () => {
  it('contains expected modes', () => {
    expect(PLAYLIST_MODES.has('full')).toBe(true);
  });
});
