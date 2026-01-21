/**
 * Conversion IPC handlers
 */
const conversionService = require('../../services/conversion');

/**
 * Register conversion IPC handlers
 * @param {Electron.IpcMain} ipcMain
 */
function registerHandlers(ipcMain) {
  // Main conversion handler
  ipcMain.handle('convert', async (event, url, options) => {
    try {
      return await conversionService.convert(url, options);
    } catch (error) {
      throw error;
    }
  });

  // Cancel conversion handler
  ipcMain.handle('cancel', () => {
    return conversionService.cancelConversion();
  });
}

module.exports = { registerHandlers };
