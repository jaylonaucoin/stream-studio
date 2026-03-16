/**
 * Main process entry point
 * Stream Studio - Electron Application
 */
const { app, BrowserWindow, ipcMain } = require('electron');
const { createWindow, getMainWindow } = require('./window');
const { registerAllHandlers } = require('./ipc');

// Handle app ready
app.whenReady().then(() => {
  createWindow();

  // Register all IPC handlers
  registerAllHandlers(ipcMain);

  // macOS: Re-create window when dock icon is clicked
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Quit when all windows are closed (Windows-style behavior on all platforms including macOS)
app.on('window-all-closed', () => {
  app.quit();
});

// Export for use by other modules
module.exports = {
  getMainWindow,
};
