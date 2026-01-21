/**
 * Basic IPC handlers
 */
const { app, shell, dialog } = require('electron');
const path = require('path');
const os = require('os');
const https = require('https');
const http = require('http');
const urlModule = require('url');
const { checkFfmpegAvailable } = require('../../services/ffmpeg');
const settingsService = require('../../services/settings');
const historyService = require('../../services/history');

/**
 * Register basic IPC handlers
 * @param {Electron.IpcMain} ipcMain
 */
function registerHandlers(ipcMain) {
  // Ping handler for testing
  ipcMain.handle('ping', () => {
    return 'pong';
  });

  // Get app version
  ipcMain.handle('getAppVersion', () => {
    return app.getVersion();
  });

  // Check FFmpeg availability
  ipcMain.handle('checkFfmpeg', async () => {
    const available = await checkFfmpegAvailable();
    return { available };
  });

  // Settings handlers
  ipcMain.handle('getSettings', () => {
    return settingsService.getSettings();
  });

  ipcMain.handle('saveSettings', (event, settings) => {
    return settingsService.saveSettings(settings);
  });

  // History handlers
  ipcMain.handle('getHistory', () => {
    return historyService.getHistory();
  });

  ipcMain.handle('clearHistory', () => {
    return historyService.clearHistory();
  });

  ipcMain.handle('removeHistoryItem', (event, id) => {
    return historyService.removeHistoryItem(id);
  });

  // Open external link
  ipcMain.handle('openExternal', async (event, url) => {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      await shell.openExternal(url);
      return { success: true };
    }
    throw new Error('Invalid URL');
  });

  // Get output folder
  ipcMain.handle('getOutputFolder', () => {
    const folder = settingsService.getOutputFolder();
    return folder || path.join(os.homedir(), 'Downloads');
  });

  // Choose output folder
  ipcMain.handle('chooseOutput', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory', 'createDirectory'],
      title: 'Select Output Folder',
    });

    if (!result.canceled && result.filePaths.length > 0) {
      const folder = result.filePaths[0];
      settingsService.setOutputFolder(folder);
      return { success: true, folder };
    }

    return { success: false };
  });

  // Open file location
  ipcMain.handle('openFileLocation', async (event, filePath) => {
    try {
      await shell.showItemInFolder(filePath);
      return { success: true };
    } catch (error) {
      throw new Error(`Failed to open file location: ${error.message}`);
    }
  });

  // Select image file
  ipcMain.handle('selectImageFile', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [{ name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'webp', 'gif'] }],
      title: 'Select Image',
    });

    if (!result.canceled && result.filePaths.length > 0) {
      const filePath = result.filePaths[0];
      const fs = require('fs');
      const ext = path.extname(filePath).toLowerCase();
      const mimeTypes = {
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.webp': 'image/webp',
        '.gif': 'image/gif',
      };
      const mimeType = mimeTypes[ext] || 'image/jpeg';
      const imageBuffer = fs.readFileSync(filePath);
      const base64 = imageBuffer.toString('base64');
      return { success: true, dataUrl: `data:${mimeType};base64,${base64}` };
    }

    return { success: false };
  });

  // Fetch image as data URL (to avoid CORS)
  ipcMain.handle('fetchImageAsDataUrl', async (event, imageUrl) => {
    return new Promise((resolve) => {
      try {
        const parsedUrl = urlModule.parse(imageUrl);
        const client = parsedUrl.protocol === 'https:' ? https : http;

        const req = client.get(imageUrl, (res) => {
          const chunks = [];
          res.on('data', (chunk) => chunks.push(chunk));
          res.on('end', () => {
            const buffer = Buffer.concat(chunks);
            const contentType = res.headers['content-type'] || 'image/jpeg';
            const base64 = buffer.toString('base64');
            resolve({ success: true, dataUrl: `data:${contentType};base64,${base64}` });
          });
        });

        req.on('error', (err) => {
          resolve({ success: false, error: err.message });
        });

        req.setTimeout(10000, () => {
          req.destroy();
          resolve({ success: false, error: 'Timeout' });
        });
      } catch (err) {
        resolve({ success: false, error: err.message });
      }
    });
  });
}

module.exports = { registerHandlers };
