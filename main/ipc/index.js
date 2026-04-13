/**
 * IPC handler registration
 */
const basicHandlers = require('./handlers/basic');
const videoInfoHandlers = require('./handlers/videoInfo');
const conversionHandlers = require('./handlers/conversion');
const batchLocalHandlers = require('./handlers/batch-local');
const catalogMetadataHandlers = require('./handlers/catalog-metadata');

/**
 * Register all IPC handlers
 * @param {Electron.IpcMain} ipcMain
 */
function registerAllHandlers(ipcMain) {
  basicHandlers.registerHandlers(ipcMain);
  videoInfoHandlers.registerHandlers(ipcMain);
  conversionHandlers.registerHandlers(ipcMain);
  batchLocalHandlers.registerHandlers(ipcMain);
  catalogMetadataHandlers.registerHandlers(ipcMain);
}

module.exports = { registerAllHandlers };
