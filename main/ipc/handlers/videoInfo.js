/**
 * Video info IPC handlers
 */
const videoInfoService = require('../../services/videoInfo');
const { AppError, ErrorCodes, errorResponse, validateUrl } = require('../../utils/errors');

/**
 * Register video info IPC handlers
 * @param {Electron.IpcMain} ipcMain
 */
function registerHandlers(ipcMain) {
  // Get video info
  ipcMain.handle('getVideoInfo', async (event, url) => {
    try {
      if (!url || typeof url !== 'string') {
        throw new AppError('URL is required', ErrorCodes.VALIDATION_ERROR);
      }
      
      validateUrl(url);
      
      return await videoInfoService.getVideoInfo(url);
    } catch (error) {
      console.error('Get video info error:', error);
      
      if (error instanceof AppError) {
        return { success: false, error: error.message, code: error.code };
      }
      
      return { success: false, error: error.message || 'Failed to get video info' };
    }
  });

  // Get playlist info
  ipcMain.handle('getPlaylistInfo', async (event, url) => {
    try {
      if (!url || typeof url !== 'string') {
        throw new AppError('URL is required', ErrorCodes.VALIDATION_ERROR);
      }
      
      validateUrl(url);
      
      return await videoInfoService.getPlaylistInfo(url);
    } catch (error) {
      console.error('Get playlist info error:', error);
      
      if (error instanceof AppError) {
        return { success: false, isPlaylist: false, error: error.message, code: error.code };
      }
      
      return { success: false, isPlaylist: false, error: error.message || 'Failed to get playlist info' };
    }
  });

  // Get chapter info
  ipcMain.handle('getChapterInfo', async (event, url) => {
    try {
      if (!url || typeof url !== 'string') {
        throw new AppError('URL is required', ErrorCodes.VALIDATION_ERROR);
      }
      
      validateUrl(url);
      
      return await videoInfoService.getChapterInfo(url);
    } catch (error) {
      console.error('Get chapter info error:', error);
      
      if (error instanceof AppError) {
        return { success: false, hasChapters: false, error: error.message, code: error.code };
      }
      
      return { success: false, hasChapters: false, error: error.message || 'Failed to get chapter info' };
    }
  });
}

module.exports = { registerHandlers };
