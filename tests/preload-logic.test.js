import { describe, it, expect, vi } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const {
  getPathForFile,
  createConversionProgressHandlers,
} = require('../shared/preload-logic.js');

describe('getPathForFile', () => {
  it('returns empty string for null/undefined', () => {
    expect(getPathForFile(null, null)).toBe('');
    expect(getPathForFile(undefined, null)).toBe('');
  });

  it('uses webUtils when path returned', () => {
    const file = { path: '/fallback' };
    const webUtils = { getPathForFile: () => '/from-webutils' };
    expect(getPathForFile(file, webUtils)).toBe('/from-webutils');
  });

  it('falls back to file.path when webUtils returns empty', () => {
    const file = { path: '/p' };
    const webUtils = { getPathForFile: () => '' };
    expect(getPathForFile(file, webUtils)).toBe('/p');
  });

  it('uses file.path when webUtils missing', () => {
    expect(getPathForFile({ path: '/x' }, null)).toBe('/x');
  });

  it('returns empty string when no path available', () => {
    expect(getPathForFile({}, null)).toBe('');
  });

  it('falls back on throw from webUtils', () => {
    const file = { path: '/safe' };
    const webUtils = {
      getPathForFile: () => {
        throw new Error('fail');
      },
    };
    expect(getPathForFile(file, webUtils)).toBe('/safe');
  });
});

describe('createConversionProgressHandlers', () => {
  function createMockIpcRenderer() {
    const listeners = new Map();
    return {
      on: vi.fn((channel, fn) => {
        listeners.set(channel, fn);
      }),
      removeListener: vi.fn((channel, fn) => {
        if (listeners.get(channel) === fn) listeners.delete(channel);
      }),
      emit(channel, data) {
        const fn = listeners.get(channel);
        if (fn) fn({}, data);
      },
    };
  }

  it('registers ipcRenderer.on when first subscriber added', () => {
    const ipcRenderer = createMockIpcRenderer();
    const { onProgress } = createConversionProgressHandlers(ipcRenderer);
    const cb = vi.fn();
    onProgress(cb);
    expect(ipcRenderer.on).toHaveBeenCalledWith('conversion-progress', expect.any(Function));
  });

  it('removeListener when last subscriber leaves', () => {
    const ipcRenderer = createMockIpcRenderer();
    const { onProgress, offProgress } = createConversionProgressHandlers(ipcRenderer);
    const cb = vi.fn();
    onProgress(cb);
    offProgress(cb);
    expect(ipcRenderer.removeListener).toHaveBeenCalledWith(
      'conversion-progress',
      expect.any(Function)
    );
  });

  it('clearing all subscribers removes ipc listener', () => {
    const ipcRenderer = createMockIpcRenderer();
    const { onProgress, offProgress } = createConversionProgressHandlers(ipcRenderer);
    onProgress(vi.fn());
    onProgress(vi.fn());
    offProgress();
    expect(ipcRenderer.removeListener).toHaveBeenCalled();
  });

  it('relays events to all callbacks', () => {
    const ipcRenderer = createMockIpcRenderer();
    const { onProgress } = createConversionProgressHandlers(ipcRenderer);
    const a = vi.fn();
    const b = vi.fn();
    onProgress(a);
    onProgress(b);
    ipcRenderer.emit('conversion-progress', { percent: 50 });
    expect(a).toHaveBeenCalledWith({ percent: 50 });
    expect(b).toHaveBeenCalledWith({ percent: 50 });
  });

  it('ignores non-function onProgress', () => {
    const ipcRenderer = createMockIpcRenderer();
    const { onProgress } = createConversionProgressHandlers(ipcRenderer);
    onProgress(null);
    expect(ipcRenderer.on).not.toHaveBeenCalled();
  });
});
