import { createRequire } from 'node:module';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import path from 'path';
import { EventEmitter } from 'node:events';

const require = createRequire(import.meta.url);

function patchRequireCache(modulePath, mockExports) {
  const resolved = require.resolve(modulePath);
  const mod = require.cache[resolved] || { id: resolved, filename: resolved, loaded: true };
  mod.exports = mockExports;
  require.cache[resolved] = mod;
}

const loadURL = vi.fn();
const loadFile = vi.fn();
const shouldLoadViteDevServer = vi.fn(() => true);

describe('window', () => {
  let electronMod;
  let OriginalBW;
  let lastBw;

  class MockBrowserWindow extends EventEmitter {
    constructor(opts) {
      super();
      this.gotOpts = opts;
      lastBw = this;
      this._min = false;
      this._max = false;
    }

    show() {}

    isMinimized() {
      return this._min;
    }

    isMaximized() {
      return this._max;
    }

    getBounds() {
      return { width: 400, height: 300, x: 1, y: 2 };
    }
  }

  MockBrowserWindow.prototype.loadURL = loadURL;
  MockBrowserWindow.prototype.loadFile = loadFile;

  let createWindow;
  let getMainWindow;
  let getWindowBoundsSpy;
  let saveWindowBoundsSpy;

  beforeEach(() => {
    vi.clearAllMocks();
    shouldLoadViteDevServer.mockReturnValue(true);
    patchRequireCache('./utils/paths.js', {
      isDev: () => true,
      getAppRoot: () => '/fake-app-root',
      getIconPath: () => '/fake/icon.png',
    });
    patchRequireCache('./window-load-target.js', {
      shouldLoadViteDevServer,
    });
    const settings = require('./services/settings.js');
    getWindowBoundsSpy = vi
      .spyOn(settings, 'getWindowBounds')
      .mockReturnValue({ width: 800, height: 600, x: 10, y: 20 });
    saveWindowBoundsSpy = vi.spyOn(settings, 'saveWindowBounds').mockImplementation(() => {});
    electronMod = require('electron');
    OriginalBW = electronMod.BrowserWindow;
    electronMod.BrowserWindow = MockBrowserWindow;
    delete require.cache[require.resolve('./window.js')];
    ({ createWindow, getMainWindow } = require('./window.js'));
  });

  afterEach(() => {
    electronMod.BrowserWindow = OriginalBW;
    getWindowBoundsSpy.mockRestore();
    saveWindowBoundsSpy.mockRestore();
    delete require.cache[require.resolve('./window.js')];
    delete require.cache[require.resolve('./utils/paths.js')];
    delete require.cache[require.resolve('./window-load-target.js')];
  });

  it('getMainWindow is null before createWindow', () => {
    expect(getMainWindow()).toBeNull();
  });

  it('creates BrowserWindow with secure webPreferences and deferred show', () => {
    createWindow();
    expect(lastBw.gotOpts.webPreferences.nodeIntegration).toBe(false);
    expect(lastBw.gotOpts.webPreferences.contextIsolation).toBe(true);
    expect(lastBw.gotOpts.webPreferences.sandbox).toBe(false);
    expect(lastBw.gotOpts.show).toBe(false);
    expect(lastBw.gotOpts.webPreferences.preload).toBe(
      path.join('/fake-app-root', 'preload.js')
    );
    expect(getMainWindow()).toBe(lastBw);
  });

  it('loads Vite dev URL when shouldLoadViteDevServer is true', () => {
    shouldLoadViteDevServer.mockReturnValue(true);
    delete require.cache[require.resolve('./window.js')];
    ({ createWindow } = require('./window.js'));
    createWindow();
    expect(loadURL).toHaveBeenCalledWith('http://localhost:5173');
    expect(loadFile).not.toHaveBeenCalled();
  });

  it('loads packaged index.html when shouldLoadViteDevServer is false', () => {
    shouldLoadViteDevServer.mockReturnValue(false);
    delete require.cache[require.resolve('./window.js')];
    ({ createWindow } = require('./window.js'));
    createWindow();
    expect(loadFile).toHaveBeenCalledWith(
      path.join('/fake-app-root', 'dist-renderer', 'index.html')
    );
    expect(loadURL).not.toHaveBeenCalled();
  });

  it('does not save bounds when minimized', () => {
    createWindow();
    saveWindowBoundsSpy.mockClear();
    lastBw._min = true;
    lastBw.emit('resize');
    expect(saveWindowBoundsSpy).not.toHaveBeenCalled();
  });

  it('does not save bounds when maximized', () => {
    createWindow();
    saveWindowBoundsSpy.mockClear();
    lastBw._max = true;
    lastBw.emit('move');
    expect(saveWindowBoundsSpy).not.toHaveBeenCalled();
  });

  it('saves bounds on resize when not minimized or maximized', () => {
    createWindow();
    saveWindowBoundsSpy.mockClear();
    lastBw.emit('resize');
    expect(saveWindowBoundsSpy).toHaveBeenCalledWith({ width: 400, height: 300, x: 1, y: 2 });
  });

  it('clears main window reference on closed', () => {
    createWindow();
    lastBw.emit('closed');
    expect(getMainWindow()).toBeNull();
  });
});
