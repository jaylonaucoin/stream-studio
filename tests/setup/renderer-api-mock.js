import { vi } from 'vitest';

const defaultSettings = {
  notificationsEnabled: true,
  maxHistoryItems: 50,
  defaultMode: 'audio',
  defaultAudioFormat: 'mp3',
  defaultVideoFormat: 'mp4',
  defaultQuality: 'best',
  theme: 'dark',
  defaultSearchSite: 'youtube',
  defaultSearchLimit: 15,
  discogsToken: '',
};

/**
 * @param {Partial<typeof defaultSettings>} settingsPatch
 * @returns {typeof defaultSettings}
 */
function cloneSettings(settingsPatch = {}) {
  return { ...defaultSettings, ...settingsPatch };
}

/**
 * Builds a `window.api` object aligned with preload.js for renderer tests.
 * @param {object} [options]
 * @param {Partial<typeof defaultSettings>} [options.initialSettings]
 * @param {Array<{ id: string, fileName?: string, url?: string, format?: string, mode?: string, timestamp?: string }>} [options.historyItems]
 */
export function createRendererApiMock(options = {}) {
  let settings = cloneSettings(options.initialSettings);
  let historyItems = Array.isArray(options.historyItems) ? [...options.historyItems] : [];

  const progressCallbacks = new Set();

  const api = {
    ping: vi.fn(() => Promise.resolve('pong')),
    getAppVersion: vi.fn(() => Promise.resolve('0.0.0-test')),

    convert: vi.fn(() => Promise.resolve({ success: true, fileName: 'out.mp3' })),
    cancel: vi.fn(() => Promise.resolve()),

    onProgress: vi.fn((cb) => {
      if (typeof cb === 'function') progressCallbacks.add(cb);
    }),
    offProgress: vi.fn((cb) => {
      if (cb) progressCallbacks.delete(cb);
      else progressCallbacks.clear();
    }),

    chooseOutput: vi.fn(() => Promise.resolve({ success: false, cancelled: true })),
    getOutputFolder: vi.fn(() => Promise.resolve('/tmp/stream-studio-test-output')),
    openFileLocation: vi.fn(() => Promise.resolve({ success: true })),

    checkFfmpeg: vi.fn(() => Promise.resolve({ available: true })),

    getSettings: vi.fn(() => Promise.resolve({ ...settings })),
    saveSettings: vi.fn((patch) => {
      settings = cloneSettings({ ...settings, ...patch });
      return Promise.resolve({ ...settings });
    }),

    getHistory: vi.fn(() => Promise.resolve({ success: true, items: [...historyItems] })),
    clearHistory: vi.fn(() => {
      historyItems = [];
      return Promise.resolve([]);
    }),
    removeHistoryItem: vi.fn((id) => {
      historyItems = historyItems.filter((item) => item.id !== id);
      return Promise.resolve([...historyItems]);
    }),

    openExternal: vi.fn(() => Promise.resolve({ success: true })),

    getVideoInfo: vi.fn(() => Promise.resolve({ success: false })),
    getPlaylistInfo: vi.fn(() => Promise.resolve({ success: false, isPlaylist: false })),
    getChapterInfo: vi.fn(() => Promise.resolve({ success: false })),

    searchYouTube: vi.fn(() => Promise.resolve({ success: true, results: [] })),
    searchMultiSite: vi.fn(() => Promise.resolve({ success: true, results: [] })),

    selectLocalFile: vi.fn(() => Promise.resolve({ success: false, cancelled: true })),
    selectLocalFiles: vi.fn(() => Promise.resolve({ success: false, cancelled: true })),
    selectLocalFolder: vi.fn(() => Promise.resolve({ success: false, cancelled: true })),
    convertLocalFile: vi.fn(() => Promise.resolve({ success: true })),
    enumerateLocalMedia: vi.fn(() => Promise.resolve({ success: true, items: [] })),
    readMetadataBatch: vi.fn(() => Promise.resolve({ success: true, items: [] })),
    applyMetadataBatch: vi.fn(() => Promise.resolve({ success: true })),
    dryRunLocalBatch: vi.fn(() => Promise.resolve({ success: true, items: [] })),
    cancelBatchJob: vi.fn(() => Promise.resolve()),
    convertLocalBatch: vi.fn(() => Promise.resolve({ success: true })),
    onBatchJobProgress: vi.fn(),
    offBatchJobProgress: vi.fn(),

    getPathForFile: vi.fn((file) => file?.path || ''),
    saveFileToTemp: vi.fn(() => Promise.resolve({ success: true, path: '/tmp/x' })),

    saveQueueFile: vi.fn(() => Promise.resolve({ success: true })),
    openQueueFile: vi.fn(() => Promise.resolve({ success: false, cancelled: true })),

    getAudioStreamUrl: vi.fn(() => Promise.resolve({ success: false })),

    selectImageFile: vi.fn(() => Promise.resolve({ success: false, cancelled: true })),
    fetchImageAsDataUrl: vi.fn(() => Promise.resolve({ success: false })),
    fetchCatalogMetadataFromUrl: vi.fn(() => Promise.resolve({ success: false })),
  };

  return {
    api,
    /** @param {typeof defaultSettings} next */
    setSettingsState(next) {
      settings = cloneSettings(next);
    },
    /** @param {typeof historyItems} items */
    setHistoryState(items) {
      historyItems = [...items];
    },
    emitProgress(data) {
      progressCallbacks.forEach((cb) => {
        try {
          cb(data);
        } catch {
          /* ignore */
        }
      });
    },
  };
}

/**
 * Assigns `api` to `globalThis.window.api` and returns teardown.
 * @param {ReturnType<typeof createRendererApiMock>['api']} api
 */
export function installWindowApi(api) {
  const prev = globalThis.window.api;
  globalThis.window.api = api;
  return () => {
    if (prev === undefined) {
      delete globalThis.window.api;
    } else {
      globalThis.window.api = prev;
    }
  };
}
