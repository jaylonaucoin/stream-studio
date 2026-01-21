/**
 * Electron store configuration
 */
const Store = require('electron-store');

const store = new Store({
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
    },
  },
});

module.exports = store;
