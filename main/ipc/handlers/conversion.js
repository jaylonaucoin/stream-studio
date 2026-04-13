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
    if (
      process.env.STREAM_STUDIO_E2E === '1' &&
      process.env.STREAM_STUDIO_E2E_MOCK_CONVERT === '1'
    ) {
      return {
        success: true,
        fileName: 'e2e-mock-output.mp3',
      };
    }
    return await conversionService.convert(url, options);
  });

  // Local file conversion
  ipcMain.handle('convertLocalFile', async (event, filePath, options = {}) => {
    return await conversionService.convertLocalFile(filePath, options);
  });

  // Cancel conversion handler
  ipcMain.handle('cancel', () => {
    return conversionService.cancelConversion();
  });
}

module.exports = { registerHandlers };
