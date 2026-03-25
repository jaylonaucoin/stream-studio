/**
 * IPC handlers for batch local files
 */
const batchLocal = require('../../services/batch-local');
const conversionService = require('../../services/conversion');

function registerHandlers(ipcMain) {
  ipcMain.handle('enumerateLocalMedia', async (event, inputPaths, options) => {
    try {
      const paths = Array.isArray(inputPaths) ? inputPaths : [];
      return batchLocal.enumeratePaths(paths, options || {});
    } catch (error) {
      console.error('enumerateLocalMedia error:', error);
      return { paths: [], truncated: false, error: error.message };
    }
  });

  ipcMain.handle('readMetadataBatch', async (event, paths) => {
    try {
      const list = Array.isArray(paths) ? paths : [];
      return await batchLocal.readMetadataBatch(list);
    } catch (error) {
      console.error('readMetadataBatch error:', error);
      return { results: [], error: error.message };
    }
  });

  ipcMain.handle('applyMetadataBatch', async (event, payload) => {
    try {
      const { paths, patch, thumbnailDataUrl, strategy } = payload || {};
      const list = Array.isArray(paths) ? paths : [];
      return await batchLocal.applyMetadataBatch({
        paths: list,
        patch: patch || {},
        thumbnailDataUrl,
        strategy: strategy || 'merge',
      });
    } catch (error) {
      console.error('applyMetadataBatch error:', error);
      return { results: [], cancelled: false, error: error.message };
    }
  });

  ipcMain.handle('dryRunLocalBatch', async (event, paths) => {
    try {
      const list = Array.isArray(paths) ? paths : [];
      return batchLocal.dryRunLocalBatch(list);
    } catch (error) {
      console.error('dryRunLocalBatch error:', error);
      return { results: [], error: error.message };
    }
  });

  ipcMain.handle('cancelBatchJob', async () => {
    batchLocal.cancelBatchJob();
    conversionService.cancelConversion();
    return { success: true };
  });

  ipcMain.handle('convertLocalBatch', async (event, payload) => {
    try {
      const {
        paths,
        outputFolder,
        mode,
        format,
        quality,
        metadataPatch,
        thumbnailDataUrl,
        metadataStrategy,
        startTime,
        endTime,
      } = payload || {};
      const list = Array.isArray(paths) ? paths : [];
      return await batchLocal.convertLocalBatch(list, {
        outputFolder,
        mode,
        format,
        quality,
        metadataPatch,
        thumbnailDataUrl,
        metadataStrategy,
        startTime,
        endTime,
      });
    } catch (error) {
      console.error('convertLocalBatch error:', error);
      return { results: [], cancelled: false, error: error.message };
    }
  });
}

module.exports = { registerHandlers };
