/**
 * Main process entry point
 * Stream Studio - Electron Application
 * 
 * This file serves as the entry point and delegates to the modular structure in /main/
 */
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

// Import modular components
const { createWindow, getMainWindow } = require('./main/window');
const { registerAllHandlers } = require('./main/ipc');

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

// Export for use by other modules that may need the main window
module.exports = {
  getMainWindow,
};
