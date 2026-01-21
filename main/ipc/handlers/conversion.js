/**
 * Conversion IPC handlers
 */
const conversionService = require('../../services/conversion');
const { AppError, ErrorCodes, errorResponse, validateUrl } = require('../../utils/errors');

/**
 * Register conversion IPC handlers
 * @param {Electron.IpcMain} ipcMain
 */
function registerHandlers(ipcMain) {
  // Main conversion handler
  ipcMain.handle('convert', async (event, url, options) => {
    try {
      // Validate URL
      if (!url || typeof url !== 'string') {
        throw new AppError('URL is required', ErrorCodes.VALIDATION_ERROR);
      }
      
      validateUrl(url);
      
      // Validate options
      if (!options || typeof options !== 'object') {
        throw new AppError('Options are required', ErrorCodes.VALIDATION_ERROR);
      }
      
      const { mode, format, quality } = options;
      
      if (!mode || !['audio', 'video'].includes(mode)) {
        throw new AppError('Invalid mode. Must be "audio" or "video"', ErrorCodes.VALIDATION_ERROR);
      }
      
      if (!format || typeof format !== 'string') {
        throw new AppError('Format is required', ErrorCodes.VALIDATION_ERROR);
      }
      
      if (!quality || typeof quality !== 'string') {
        throw new AppError('Quality is required', ErrorCodes.VALIDATION_ERROR);
      }
      
      return await conversionService.convert(url, options);
    } catch (error) {
      console.error('Conversion error:', error);
      
      // Handle cancellation separately
      if (error.message && error.message.includes('cancelled')) {
        return errorResponse('Conversion cancelled by user', ErrorCodes.CONVERSION_CANCELLED);
      }
      
      // Handle AppError instances
      if (error instanceof AppError) {
        return errorResponse(error.message, error.code, error.details);
      }
      
      // Return generic error response
      return errorResponse(
        error.message || 'Conversion failed',
        ErrorCodes.CONVERSION_FAILED
      );
    }
  });

  // Cancel conversion handler
  ipcMain.handle('cancel', () => {
    try {
      return conversionService.cancelConversion();
    } catch (error) {
      console.error('Cancel conversion error:', error);
      return { success: false, error: error.message };
    }
  });
}

module.exports = { registerHandlers };
