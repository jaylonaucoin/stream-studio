/**
 * Electron store configuration
 */
const StoreModule = require('electron-store');
const Store = StoreModule.default || StoreModule;

const store = new Store({
  // Fallback when not running under Electron (e.g. unit tests).
  projectName: 'stream-studio',
  defaults: {
    windowBounds: { width: 900, height: 700 },
    outputFolder: null,
    conversionHistory: [],
    settings: {
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
    },
  },
});

module.exports = store;
