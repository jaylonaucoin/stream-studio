import { describe, it, expect, vi } from 'vitest';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

vi.mock('../window.js', () => ({
  getMainWindow: () => null,
}));

describe('registerAllHandlers', () => {
  it('registers expected channels without throwing', () => {
    const { registerAllHandlers } = require('./index.js');
    const handlers = new Map();
    const ipcMain = {
      handle(channel, fn) {
        handlers.set(channel, fn);
      },
    };
    registerAllHandlers(ipcMain);
    expect(handlers.has('ping')).toBe(true);
    expect(handlers.has('getVideoInfo')).toBe(true);
    expect(handlers.has('convert')).toBe(true);
    expect(handlers.has('enumerateLocalMedia')).toBe(true);
    expect(handlers.has('fetchCatalogMetadataFromUrl')).toBe(true);
  });
});
