/**
 * Window management module
 */
const { BrowserWindow } = require('electron');
const path = require('path');
const { isDev, getAppRoot, getIconPath } = require('./utils/paths');
const { getWindowBounds, saveWindowBounds } = require('./services/settings');

let mainWindow = null;

/**
 * Create the main application window
 */
function createWindow() {
  const { width, height, x, y } = getWindowBounds();

  mainWindow = new BrowserWindow({
    width,
    height,
    x,
    y,
    minWidth: 700,
    minHeight: 500,
    webPreferences: {
      preload: path.join(getAppRoot(), 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
    icon: getIconPath(),
    show: false, // Don't show until ready
  });

  // Show window when ready to prevent visual flash
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Save window bounds on resize/move
  const saveBounds = () => {
    if (!mainWindow.isMinimized() && !mainWindow.isMaximized()) {
      saveWindowBounds(mainWindow.getBounds());
    }
  };

  mainWindow.on('resize', saveBounds);
  mainWindow.on('move', saveBounds);

  // Load from Vite dev server in development, from build in production
  if (isDev()) {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    mainWindow.loadFile(path.join(getAppRoot(), 'dist-renderer', 'index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

/**
 * Get the main window instance
 * @returns {BrowserWindow|null}
 */
function getMainWindow() {
  return mainWindow;
}

module.exports = {
  createWindow,
  getMainWindow,
};
