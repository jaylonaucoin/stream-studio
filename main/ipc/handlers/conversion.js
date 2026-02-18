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
  // Note: URL and options validation is done in the conversion service
  // to match the original behavior
  ipcMain.handle('convert', async (event, url, options = {}) => {
    return await conversionService.convert(url, options);
  });

  // Cancel conversion handler
  ipcMain.handle('cancel', () => {
    return conversionService.cancelConversion();
  });
}

module.exports = { registerHandlers };
