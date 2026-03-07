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
      // Return error in the same format as original
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

  // Search YouTube — streams each result to the renderer as it arrives, then
  // silently pre-warms audio stream URLs for the top results in the background.
  ipcMain.handle('searchYouTube', async (event, query, limit) => {
    try {
      const onPartialResult = (item) => {
        if (!event.sender.isDestroyed()) {
          event.sender.send('search-result-item', item);
        }
      };

      const result = await videoInfoService.searchYouTube(query, limit, onPartialResult);

      // Pre-warm audio stream URLs for the top results so the first click is near-instant.
      // Stagger spawns to avoid competing for CPU/network simultaneously.
      if (result.success && result.results.length > 0) {
        const topUrls = result.results.slice(0, 3).map((r) => r.webpageUrl).filter(Boolean);
        topUrls.forEach((url, i) => {
          setTimeout(() => {
            videoInfoService.getAudioStreamUrl(url).catch(() => {});
          }, i * 1500);
        });
      }

      return result;
    } catch (error) {
      return { success: false, results: [], error: error.message };
    }
  });

  // Get direct audio stream URL for previewing a YouTube video
  ipcMain.handle('getAudioStreamUrl', async (event, videoUrl) => {
    try {
      return await videoInfoService.getAudioStreamUrl(videoUrl);
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
}

module.exports = { registerHandlers };
