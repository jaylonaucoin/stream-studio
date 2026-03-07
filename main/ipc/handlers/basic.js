/**
 * Basic IPC handlers
 */
const { app, shell, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const { getMainWindow } = require('../../window');
const os = require('os');
const https = require('https');
const http = require('http');
const urlModule = require('url');
const { checkFfmpegAvailable } = require('../../services/ffmpeg');
const settingsService = require('../../services/settings');
const historyService = require('../../services/history');
const { AppError, ErrorCodes, errorResponse } = require('../../utils/errors');

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
    try {
      const available = await checkFfmpegAvailable();
      return { available };
    } catch (error) {
      console.error('FFmpeg check error:', error);
      return { available: false, error: error.message };
    }
  });

  // Settings handlers
  ipcMain.handle('getSettings', () => {
    try {
      return settingsService.getSettings();
    } catch (error) {
      console.error('Get settings error:', error);
      return errorResponse('Failed to load settings', ErrorCodes.UNKNOWN_ERROR);
    }
  });

  ipcMain.handle('saveSettings', (event, settings) => {
    try {
      if (!settings || typeof settings !== 'object') {
        throw new AppError('Invalid settings object', ErrorCodes.VALIDATION_ERROR);
      }
      return settingsService.saveSettings(settings);
    } catch (error) {
      console.error('Save settings error:', error);
      return errorResponse(error.message || 'Failed to save settings', error.code || ErrorCodes.UNKNOWN_ERROR);
    }
  });

  // History handlers
  ipcMain.handle('getHistory', () => {
    try {
      return historyService.getHistory();
    } catch (error) {
      console.error('Get history error:', error);
      return [];
    }
  });

  ipcMain.handle('clearHistory', () => {
    try {
      return historyService.clearHistory();
    } catch (error) {
      console.error('Clear history error:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('removeHistoryItem', (event, id) => {
    try {
      if (!id) {
        throw new AppError('History item ID is required', ErrorCodes.VALIDATION_ERROR);
      }
      return historyService.removeHistoryItem(id);
    } catch (error) {
      console.error('Remove history item error:', error);
      return { success: false, error: error.message };
    }
  });

  // Open external link
  ipcMain.handle('openExternal', async (event, url) => {
    try {
      if (!url || typeof url !== 'string') {
        throw new AppError('URL is required', ErrorCodes.VALIDATION_ERROR);
      }
      
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        throw new AppError('Only HTTP/HTTPS URLs are allowed', ErrorCodes.INVALID_URL);
      }
      
      await shell.openExternal(url);
      return { success: true };
    } catch (error) {
      console.error('Open external error:', error);
      return { success: false, error: error.message };
    }
  });

  // Get output folder
  ipcMain.handle('getOutputFolder', () => {
    try {
      const folder = settingsService.getOutputFolder();
      return folder || path.join(os.homedir(), 'Downloads');
    } catch (error) {
      console.error('Get output folder error:', error);
      return path.join(os.homedir(), 'Downloads');
    }
  });

  // Choose output folder
  ipcMain.handle('chooseOutput', async () => {
    try {
      const result = await dialog.showOpenDialog({
        properties: ['openDirectory', 'createDirectory'],
        title: 'Select Output Folder',
      });

      if (!result.canceled && result.filePaths.length > 0) {
        const folder = result.filePaths[0];
        settingsService.setOutputFolder(folder);
        return { success: true, folder };
      }

      return { success: false, cancelled: true };
    } catch (error) {
      console.error('Choose output folder error:', error);
      return { success: false, error: error.message };
    }
  });

  // Open file location
  ipcMain.handle('openFileLocation', async (event, filePath) => {
    try {
      if (!filePath || typeof filePath !== 'string') {
        throw new AppError('File path is required', ErrorCodes.VALIDATION_ERROR);
      }
      
      if (!fs.existsSync(filePath)) {
        throw new AppError('File not found', ErrorCodes.FILE_NOT_FOUND);
      }
      
      await shell.showItemInFolder(filePath);
      return { success: true };
    } catch (error) {
      console.error('Open file location error:', error);
      return { success: false, error: error.message };
    }
  });

  // Select image file
  ipcMain.handle('selectImageFile', async () => {
    try {
      const result = await dialog.showOpenDialog({
        properties: ['openFile'],
        filters: [{ name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'webp', 'gif'] }],
        title: 'Select Image',
      });

      if (!result.canceled && result.filePaths.length > 0) {
        const filePath = result.filePaths[0];
        
        if (!fs.existsSync(filePath)) {
          throw new AppError('Selected file not found', ErrorCodes.FILE_NOT_FOUND);
        }
        
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

      return { success: false, cancelled: true };
    } catch (error) {
      console.error('Select image file error:', error);
      return { success: false, error: error.message };
    }
  });

  // Fetch image as data URL (to avoid CORS)
  ipcMain.handle('fetchImageAsDataUrl', async (event, imageUrl) => {
    return new Promise((resolve) => {
      try {
        if (!imageUrl || typeof imageUrl !== 'string') {
          resolve({ success: false, error: 'Image URL is required' });
          return;
        }
        
        const parsedUrl = urlModule.parse(imageUrl);
        if (!parsedUrl.protocol || !['http:', 'https:'].includes(parsedUrl.protocol)) {
          resolve({ success: false, error: 'Invalid URL protocol' });
          return;
        }
        
        const client = parsedUrl.protocol === 'https:' ? https : http;

        const req = client.get(imageUrl, (res) => {
          // Handle redirects
          if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
            // For redirects, recursively fetch
            resolve({ success: false, error: 'Redirects not supported' });
            return;
          }
          
          if (res.statusCode !== 200) {
            resolve({ success: false, error: `HTTP ${res.statusCode}` });
            return;
          }
          
          const chunks = [];
          res.on('data', (chunk) => chunks.push(chunk));
          res.on('end', () => {
            const buffer = Buffer.concat(chunks);
            const contentType = res.headers['content-type'] || 'image/jpeg';
            const base64 = buffer.toString('base64');
            resolve({ success: true, dataUrl: `data:${contentType};base64,${base64}` });
          });
          res.on('error', (err) => {
            resolve({ success: false, error: err.message });
          });
        });

        req.on('error', (err) => {
          resolve({ success: false, error: err.message });
        });

        req.setTimeout(10000, () => {
          req.destroy();
          resolve({ success: false, error: 'Request timeout' });
        });
      } catch (err) {
        resolve({ success: false, error: err.message });
      }
    });
  });

  // Save file buffer to temp (fallback when getPathForFile returns empty)
  ipcMain.handle('saveFileToTemp', async (event, { buffer, filename }) => {
    try {
      if (!buffer || !filename) return { success: false, error: 'Missing buffer or filename' };
      const ext = path.extname(filename) || '';
      const base = path.basename(filename, ext) || 'media';
      const tempPath = path.join(os.tmpdir(), `media-converter-${Date.now()}-${base}${ext}`);
      const nodeBuffer = Buffer.from(buffer);
      fs.writeFileSync(tempPath, nodeBuffer);
      return { success: true, filePath: tempPath };
    } catch (error) {
      console.error('Save file to temp error:', error);
      return { success: false, error: error.message };
    }
  });

  // Select local media file for conversion
  ipcMain.handle('selectLocalFile', async () => {
    try {
      const win = getMainWindow();
      const result = await dialog.showOpenDialog(win || undefined, {
        properties: ['openFile'],
        filters: [
          { name: 'Audio & Video', extensions: ['mp3', 'm4a', 'flac', 'wav', 'aac', 'ogg', 'opus', 'mp4', 'mkv', 'webm', 'mov', 'avi', 'flv'] },
          { name: 'All Files', extensions: ['*'] },
        ],
        title: 'Select File to Convert',
      });

      if (!result.canceled && result.filePaths.length > 0) {
        const filePath = result.filePaths[0];
        if (fs.existsSync(filePath)) {
          return { success: true, filePath };
        }
        return { success: false, error: 'File not found' };
      }
      return { success: false, cancelled: true };
    } catch (error) {
      console.error('Select local file error:', error);
      return { success: false, error: error.message };
    }
  });

  // Save queue to file (export)
  ipcMain.handle('saveQueueFile', async (event, data) => {
    try {
      const result = await dialog.showSaveDialog({
        defaultPath: 'media-converter-queue.json',
        filters: [{ name: 'JSON', extensions: ['json'] }],
        title: 'Export Queue',
      });

      if (!result.canceled && result.filePath) {
        fs.writeFileSync(result.filePath, JSON.stringify(data, null, 2), 'utf8');
        return { success: true, filePath: result.filePath };
      }
      return { success: false, cancelled: true };
    } catch (error) {
      console.error('Save queue file error:', error);
      return { success: false, error: error.message };
    }
  });

  // Open queue from file (import)
  ipcMain.handle('openQueueFile', async () => {
    try {
      const result = await dialog.showOpenDialog({
        properties: ['openFile'],
        filters: [{ name: 'JSON', extensions: ['json'] }],
        title: 'Import Queue',
      });

      if (!result.canceled && result.filePaths.length > 0) {
        const content = fs.readFileSync(result.filePaths[0], 'utf8');
        const data = JSON.parse(content);
        return { success: true, data };
      }
      return { success: false, cancelled: true };
    } catch (error) {
      console.error('Open queue file error:', error);
      return { success: false, error: error.message };
    }
  });
}

module.exports = { registerHandlers };
