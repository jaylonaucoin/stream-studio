/**
 * Path utilities for locating binaries and resources
 */
const { app } = require('electron');
const path = require('path');
const fs = require('fs');

/**
 * Check if running in development mode
 */
function isDev() {
  return !app.isPackaged;
}

/**
 * Get the application root directory
 */
function getAppRoot() {
  if (isDev()) {
    // In development, we're in /workspace/main/utils, so go up to /workspace
    return path.join(__dirname, '..', '..');
  }
  return app.getAppPath();
}

/**
 * Get yt-dlp binary path
 */
function getYtDlpPath() {
  const platform = process.platform;
  const binaryName = platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp';

  if (isDev()) {
    // Development: check bin folder
    const devPath = path.join(getAppRoot(), 'bin', binaryName);
    if (fs.existsSync(devPath)) {
      return path.normalize(devPath);
    }
  } else {
    // Production: check extraResources - try multiple possible locations
    const possiblePaths = [
      path.join(process.resourcesPath, 'bin', binaryName),
      path.join(process.resourcesPath, '..', 'bin', binaryName),
      path.join(getAppRoot(), '..', 'bin', binaryName),
      path.join(app.getAppPath(), 'bin', binaryName),
    ];

    for (const prodPath of possiblePaths) {
      const normalized = path.normalize(prodPath);
      if (fs.existsSync(normalized)) {
        return normalized;
      }
    }
  }

  // Fallback: try system PATH
  return binaryName;
}

/**
 * Get FFmpeg binary path
 */
function getFfmpegPath() {
  const platform = process.platform;

  // On Windows, check for bundled ffmpeg
  if (platform === 'win32') {
    if (isDev()) {
      // Development: check bin folder
      const devPath = path.join(getAppRoot(), 'bin', 'ffmpeg.exe');
      if (fs.existsSync(devPath)) {
        return path.normalize(devPath);
      }
    } else {
      // Production: check extraResources
      const possiblePaths = [
        path.join(process.resourcesPath, 'bin', 'ffmpeg.exe'),
        path.join(process.resourcesPath, '..', 'bin', 'ffmpeg.exe'),
        path.join(getAppRoot(), '..', 'bin', 'ffmpeg.exe'),
        path.join(app.getAppPath(), 'bin', 'ffmpeg.exe'),
      ];

      for (const prodPath of possiblePaths) {
        const normalized = path.normalize(prodPath);
        if (fs.existsSync(normalized)) {
          return normalized;
        }
      }
    }
  }

  // On Mac/Linux, ffmpeg should be in system PATH
  // On Windows, fallback to system PATH
  return platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg';
}

/**
 * Get application icon path
 */
function getIconPath() {
  return path.join(getAppRoot(), 'assets', 'icon.png');
}

module.exports = {
  isDev,
  getAppRoot,
  getYtDlpPath,
  getFfmpegPath,
  getIconPath,
};
