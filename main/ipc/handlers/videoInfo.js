/**
 * Video info IPC handlers
 */
const videoInfoService = require('../../services/videoInfo');

/**
 * Register video info IPC handlers
 * @param {Electron.IpcMain} ipcMain
 */
function registerHandlers(ipcMain) {
  // Get video info
  ipcMain.handle('getVideoInfo', async (event, url) => {
    try {
      return await videoInfoService.getVideoInfo(url);
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Get playlist info
  ipcMain.handle('getPlaylistInfo', async (event, url) => {
    try {
      return await videoInfoService.getPlaylistInfo(url);
    } catch (error) {
      return { success: false, isPlaylist: false, error: error.message };
    }
  });

  // Get chapter info
  ipcMain.handle('getChapterInfo', async (event, url) => {
    try {
      return await videoInfoService.getChapterInfo(url);
    } catch (error) {
      return { success: false, hasChapters: false, error: error.message };
    }
  });
}

module.exports = { registerHandlers };
