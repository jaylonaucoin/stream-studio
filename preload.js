const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('api', {
  // Basic IPC
  ping: () => ipcRenderer.invoke('ping'),
  getAppVersion: () => ipcRenderer.invoke('getAppVersion'),
  
  // Conversion API
  convert: (url, options) => ipcRenderer.invoke('convert', url, options),
  cancel: () => ipcRenderer.invoke('cancel'),
  
  // Progress events
  onProgress: (callback) => {
    ipcRenderer.on('conversion-progress', (event, data) => callback(data));
  },
  offProgress: () => {
    ipcRenderer.removeAllListeners('conversion-progress');
  },
  
  // Folder selection
  chooseOutput: () => ipcRenderer.invoke('chooseOutput'),
  getOutputFolder: () => ipcRenderer.invoke('getOutputFolder'),
  openFileLocation: (filePath) => ipcRenderer.invoke('openFileLocation', filePath),
  
  // FFmpeg check
  checkFfmpeg: () => ipcRenderer.invoke('checkFfmpeg'),
  
  // Settings
  getSettings: () => ipcRenderer.invoke('getSettings'),
  saveSettings: (settings) => ipcRenderer.invoke('saveSettings', settings),
  
  // History
  getHistory: () => ipcRenderer.invoke('getHistory'),
  clearHistory: () => ipcRenderer.invoke('clearHistory'),
  removeHistoryItem: (id) => ipcRenderer.invoke('removeHistoryItem', id),
  
  // External links
  openExternal: (url) => ipcRenderer.invoke('openExternal', url),
  
  // Video info (for preview)
  getVideoInfo: (url) => ipcRenderer.invoke('getVideoInfo', url),
  
  // Playlist info (for playlist detection)
  getPlaylistInfo: (url) => ipcRenderer.invoke('getPlaylistInfo', url),
  
  // Chapter info (for chapter selection)
  getChapterInfo: (url) => ipcRenderer.invoke('getChapterInfo', url),

  // Search (YouTube and multi-site)
  searchYouTube: (query, limit) => ipcRenderer.invoke('searchYouTube', query, limit),
  searchMultiSite: (siteId, query, limit) => ipcRenderer.invoke('searchMultiSite', siteId, query, limit),

  // Local file conversion
  selectLocalFile: () => ipcRenderer.invoke('selectLocalFile'),
  convertLocalFile: (filePath, options) => ipcRenderer.invoke('convertLocalFile', filePath, options),

  // Queue import/export
  saveQueueFile: (content) => ipcRenderer.invoke('saveQueueFile', content),
  openQueueFile: () => ipcRenderer.invoke('openQueueFile'),

  // Get direct audio stream URL for in-app preview
  getAudioStreamUrl: (videoUrl) => ipcRenderer.invoke('getAudioStreamUrl', videoUrl),
  
  // Image selection (for thumbnail replacement)
  selectImageFile: () => ipcRenderer.invoke('selectImageFile'),
  
  // Fetch image as data URL (for thumbnail cropping - avoids CORS)
  fetchImageAsDataUrl: (imageUrl) => ipcRenderer.invoke('fetchImageAsDataUrl', imageUrl),
});

