const fs = require('fs');
const path = require('path');
const os = require('os');

const userDataRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'stream-studio-vitest-'));
fs.mkdirSync(userDataRoot, { recursive: true });

module.exports = {
  app: {
    getVersion: () => '1.0.0',
    getPath: (name) =>
      name === 'userData' ? userDataRoot : path.join(userDataRoot, String(name)),
  },
  shell: {
    openExternal: async () => {},
    showItemInFolder: async () => {},
  },
  dialog: {
    showOpenDialog: async () => ({ canceled: true, filePaths: [] }),
    showSaveDialog: async () => ({ canceled: true, filePath: undefined }),
  },
  safeStorage: {
    isEncryptionAvailable: () => false,
    encryptString: () => Buffer.from('x'),
    decryptString: () => '',
  },
  BrowserWindow: function BrowserWindow() {},
  ipcMain: {
    handle: () => {},
    on: () => {},
  },
  webUtils: {
    getPathForFile: () => '',
  },
};
