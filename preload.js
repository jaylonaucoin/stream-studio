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
});

