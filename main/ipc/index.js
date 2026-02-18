/**
 * IPC handler registration
 */
const basicHandlers = require('./handlers/basic');
const videoInfoHandlers = require('./handlers/videoInfo');
const conversionHandlers = require('./handlers/conversion');

/**
 * Register all IPC handlers
 * @param {Electron.IpcMain} ipcMain
 */
function registerAllHandlers(ipcMain) {
  basicHandlers.registerHandlers(ipcMain);
  videoInfoHandlers.registerHandlers(ipcMain);
  conversionHandlers.registerHandlers(ipcMain);
}

module.exports = { registerAllHandlers };
