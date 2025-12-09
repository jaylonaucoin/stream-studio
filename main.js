const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const Store = require('electron-store');

// Initialize electron-store for preferences
const store = new Store();

let mainWindow;
let currentConversionProcess = null;
let currentOutputPath = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 900,
    height: 700,
    minWidth: 700,
    minHeight: 500,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    },
    icon: path.join(__dirname, 'assets', 'icon.png')
  });

  // Load from Vite dev server in development, from build in production
  const isDev = !app.isPackaged;
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    // Open DevTools in development
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, 'dist-renderer', 'index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC Handlers
ipcMain.handle('ping', () => {
  return 'pong';
});

ipcMain.handle('getAppVersion', () => {
  return app.getVersion();
});

// Check FFmpeg availability
ipcMain.handle('checkFfmpeg', async () => {
  const available = await checkFfmpegAvailable();
  return { available };
});

// Get yt-dlp binary path
function getYtDlpPath() {
  const isDev = !app.isPackaged;
  const platform = process.platform;
  
  if (isDev) {
    // Development: check bin folder
    const devPath = path.join(__dirname, 'bin', platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp');
    if (fs.existsSync(devPath)) {
      return devPath;
    }
  } else {
    // Production: check extraResources
    const prodPath = path.join(process.resourcesPath, 'bin', platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp');
    if (fs.existsSync(prodPath)) {
      return prodPath;
    }
  }
  
  // Fallback: try system PATH
  return platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp';
}

// Get FFmpeg binary path
function getFfmpegPath() {
  const platform = process.platform;
  
  // On Windows, check for bundled ffmpeg
  if (platform === 'win32') {
    const isDev = !app.isPackaged;
    
    if (isDev) {
      // Development: check bin folder
      const devPath = path.join(__dirname, 'bin', 'ffmpeg.exe');
      if (fs.existsSync(devPath)) {
        return devPath;
      }
    } else {
      // Production: check extraResources
      const prodPath = path.join(process.resourcesPath, 'bin', 'ffmpeg.exe');
      if (fs.existsSync(prodPath)) {
        return prodPath;
      }
    }
  }
  
  // On Mac/Linux, ffmpeg should be in system PATH
  // On Windows, fallback to system PATH
  return platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg';
}

// Check if FFmpeg is available
async function checkFfmpegAvailable() {
  return new Promise((resolve) => {
    const ffmpegPath = getFfmpegPath();
    const testProc = spawn(ffmpegPath, ['-version'], {
      stdio: 'ignore'
    });
    
    testProc.on('close', (code) => {
      resolve(code === 0);
    });
    
    testProc.on('error', () => {
      resolve(false);
    });
    
    // Timeout after 5 seconds
    setTimeout(() => {
      testProc.kill();
      resolve(false);
    }, 5000);
  });
}

// Sanitize URL input
function sanitizeUrl(url) {
  // Remove any shell metacharacters and validate it's a URL
  if (typeof url !== 'string') {
    throw new Error('Invalid URL type');
  }
  
  const trimmed = url.trim();
  // Basic URL validation - should start with http:// or https://
  if (!/^https?:\/\//.test(trimmed)) {
    throw new Error('URL must start with http:// or https://');
  }
  
  return trimmed;
}

// Convert handler
ipcMain.handle('convert', async (event, url, options = {}) => {
  // Cancel any existing conversion
  if (currentConversionProcess) {
    currentConversionProcess.kill();
    currentConversionProcess = null;
  }
  
  try {
    // Check FFmpeg availability first
    const ffmpegAvailable = await checkFfmpegAvailable();
    if (!ffmpegAvailable) {
      const platform = process.platform;
      let errorMessage = 'FFmpeg is not available. ';
      
      if (platform === 'win32') {
        errorMessage += 'Please ensure ffmpeg.exe is bundled in the bin/ folder or available in system PATH.\n\n';
        errorMessage += 'To install FFmpeg:\n';
        errorMessage += '1. Download from https://ffmpeg.org/download.html\n';
        errorMessage += '2. Extract and place ffmpeg.exe in the bin/ folder\n';
        errorMessage += 'Or add FFmpeg to your system PATH';
      } else {
        errorMessage += 'Please install FFmpeg on your system.\n\n';
        errorMessage += 'To install FFmpeg:\n';
        errorMessage += '• macOS: brew install ffmpeg\n';
        errorMessage += '• Ubuntu/Debian: sudo apt install ffmpeg\n';
        errorMessage += '• Fedora: sudo dnf install ffmpeg\n';
        errorMessage += 'Visit https://ffmpeg.org/download.html for more information';
      }
      
      throw new Error(errorMessage);
    }
    
    // Sanitize URL
    const sanitizedUrl = sanitizeUrl(url);
    
    // Get output folder (default to Downloads)
    const outputFolder = options.outputFolder || path.join(os.homedir(), 'Downloads');
    
    // Check and create output folder with permission checks
    try {
      if (!fs.existsSync(outputFolder)) {
        fs.mkdirSync(outputFolder, { recursive: true });
      }
      
      // Test write permissions
      const testFile = path.join(outputFolder, '.write-test');
      try {
        fs.writeFileSync(testFile, 'test');
        fs.unlinkSync(testFile);
      } catch (writeError) {
        throw new Error(`No write permission for output folder: ${outputFolder}\n\nPlease choose a different folder or fix folder permissions.`);
      }
    } catch (folderError) {
      if (folderError.message.includes('permission')) {
        throw folderError;
      }
      throw new Error(`Failed to access output folder: ${folderError.message}\n\nPlease choose a different folder.`);
    }
    
    // Create simple output template - just the video title
    // Filename will be: %(title)s.mp3
    const outputTemplate = path.join(outputFolder, '%(title)s.%(ext)s');
    
    // Get yt-dlp path
    const ytDlpPath = getYtDlpPath();
    
    // Prepare args array (secure - no shell injection)
    const args = [
      '-x',                    // Extract audio
      '--audio-format', 'mp3', // Convert to MP3
      '--audio-quality', '0',  // Best quality
      '--no-playlist',         // Don't download playlists
      '--embed-metadata',      // Embed all available metadata (artist, album, title, date, etc.)
      '--embed-thumbnail',     // Embed thumbnail as album art
      '--output', outputTemplate,
      sanitizedUrl
    ];
    
    // Spawn yt-dlp process
    currentConversionProcess = spawn(ytDlpPath, args, {
      cwd: outputFolder,
      stdio: ['ignore', 'pipe', 'pipe']
    });
    
    let outputFilePath = null;
    let errorOutput = '';
    
    // Handle stdout (info messages)
    currentConversionProcess.stdout.on('data', (data) => {
      const message = data.toString();
      // Send progress updates to renderer
      mainWindow?.webContents.send('conversion-progress', {
        type: 'info',
        message: message.trim()
      });
    });
    
    // Handle stderr (progress and errors)
    currentConversionProcess.stderr.on('data', (data) => {
      const message = data.toString();
      errorOutput += message;
      
      // Parse progress from yt-dlp output
      const progressMatch = message.match(/\[download\]\s+(\d+(?:\.\d+)?)%/);
      if (progressMatch) {
        const percent = parseFloat(progressMatch[1]);
        mainWindow?.webContents.send('conversion-progress', {
          type: 'progress',
          percent: percent,
          message: message.trim()
        });
      } else {
        // Send other messages
        mainWindow?.webContents.send('conversion-progress', {
          type: 'status',
          message: message.trim()
        });
      }
    });
    
    // Handle process completion with timeout
    const CONVERSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes timeout
    let timeoutId = null;
    
    return new Promise((resolve, reject) => {
      // Set timeout for long-running conversions
      timeoutId = setTimeout(() => {
        if (currentConversionProcess) {
          currentConversionProcess.kill();
          currentConversionProcess = null;
          reject(new Error('Conversion timed out after 30 minutes. The video may be very long or there may be a network issue. Please try again.'));
        }
      }, CONVERSION_TIMEOUT);
      
      currentConversionProcess.on('close', (code) => {
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }
        
        const process = currentConversionProcess;
        currentConversionProcess = null;
        
        if (code === 0) {
          // Success - find the created file
          // yt-dlp typically creates files with the pattern we specified
          // We need to search for the most recent MP3 file in the output folder
          try {
            const files = fs.readdirSync(outputFolder);
            const mp3Files = files
              .filter(f => f.endsWith('.mp3'))
              .map(f => ({
                name: f,
                path: path.join(outputFolder, f),
                time: fs.statSync(path.join(outputFolder, f)).mtime.getTime()
              }))
              .sort((a, b) => b.time - a.time);
            
            if (mp3Files.length > 0) {
              outputFilePath = mp3Files[0].path;
              currentOutputPath = outputFilePath;
              resolve({
                success: true,
                filePath: outputFilePath,
                fileName: mp3Files[0].name
              });
            } else {
              reject(new Error('Conversion completed but output file not found'));
            }
          } catch (err) {
            reject(new Error(`Failed to find output file: ${err.message}`));
          }
        } else {
          // Process failed - parse error message
          let errorMsg = `Conversion failed (exit code ${code}).\n\n`;
          
          // Check for common error types
          const errorLower = errorOutput.toLowerCase();
          
          if (errorLower.includes('winerror 32') || errorLower.includes('cannot access the file') || errorLower.includes('being used by another process')) {
            errorMsg += 'File is locked: The output file is being used by another process.\n\n';
            errorMsg += 'This usually happens when:\n';
            errorMsg += '• The file is open in a media player or file explorer\n';
            errorMsg += '• iCloud Drive or OneDrive is syncing the file\n';
            errorMsg += '• Another application has the file open\n\n';
            errorMsg += 'Please close any applications using the file and try again.';
          } else if (errorLower.includes('network') || errorLower.includes('connection') || errorLower.includes('unreachable')) {
            errorMsg += 'Network error: Could not connect to YouTube or download the video.\n';
            errorMsg += 'Please check your internet connection and try again.';
          } else if (errorLower.includes('private') || errorLower.includes('unavailable')) {
            errorMsg += 'Video is private, unavailable, or has been removed.';
          } else if (errorLower.includes('sign in') || errorLower.includes('login')) {
            errorMsg += 'This video requires sign-in to access.';
          } else if (errorLower.includes('age')) {
            errorMsg += 'This video is age-restricted and cannot be downloaded.';
          } else {
            errorMsg += 'Details:\n';
            errorMsg += errorOutput.slice(-1000); // Last 1000 chars of error
          }
          
          reject(new Error(errorMsg));
        }
      });
      
      currentConversionProcess.on('error', (error) => {
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }
        
        const process = currentConversionProcess;
        currentConversionProcess = null;
        
        if (error.code === 'ENOENT') {
          reject(new Error('yt-dlp binary not found. Please ensure yt-dlp is installed or bundled with the app.'));
        } else if (error.code === 'EACCES') {
          reject(new Error('Permission denied. Please ensure yt-dlp has execute permissions.'));
        } else {
          reject(new Error(`Failed to start conversion: ${error.message}`));
        }
      });
    });
  } catch (error) {
    currentConversionProcess = null;
    throw error;
  }
});

// Cancel handler
ipcMain.handle('cancel', () => {
  if (currentConversionProcess) {
    // Try graceful shutdown first, then force kill
    currentConversionProcess.kill('SIGTERM');
    
    // Force kill after 3 seconds if still running
    const forceKillTimeout = setTimeout(() => {
      if (currentConversionProcess) {
        currentConversionProcess.kill('SIGKILL');
      }
    }, 3000);
    
    currentConversionProcess.on('close', () => {
      clearTimeout(forceKillTimeout);
    });
    
    // Clean up partial files in output folder
    try {
      const outputFolder = getDefaultOutputFolder();
      if (fs.existsSync(outputFolder)) {
        const files = fs.readdirSync(outputFolder);
        // Look for incomplete files (very small .mp3 files or .part files)
        files.forEach(file => {
          if (file.endsWith('.part') || (file.endsWith('.mp3') && file.includes(' - '))) {
            const filePath = path.join(outputFolder, file);
            try {
              const stats = fs.statSync(filePath);
              const now = Date.now();
              const fileTime = stats.mtime.getTime();
              // If file was modified in the last 5 minutes and is small, it might be incomplete
              if (now - fileTime < 5 * 60 * 1000 && stats.size < 50 * 1024) { // Less than 50KB
                fs.unlinkSync(filePath);
              }
            } catch (err) {
              // Ignore cleanup errors
            }
          }
        });
      }
    } catch (err) {
      console.error('Failed to clean up partial files:', err);
    }
    
    currentConversionProcess = null;
    currentOutputPath = null;
    
    mainWindow?.webContents.send('conversion-progress', {
      type: 'cancelled',
      message: 'Conversion cancelled'
    });
    
    return { cancelled: true };
  }
  return { cancelled: false };
});

// Get default output folder
function getDefaultOutputFolder() {
  const saved = store.get('outputFolder');
  if (saved && fs.existsSync(saved)) {
    return saved;
  }
  return path.join(os.homedir(), 'Downloads');
}

// Choose output folder handler
ipcMain.handle('chooseOutput', async () => {
  try {
    const defaultPath = getDefaultOutputFolder();
    
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory'],
      defaultPath: defaultPath,
      title: 'Select Output Folder'
    });
    
    if (!result.canceled && result.filePaths.length > 0) {
      const selectedFolder = result.filePaths[0];
      // Save preference
      store.set('outputFolder', selectedFolder);
      return { success: true, folder: selectedFolder };
    }
    
    return { success: false, folder: null };
  } catch (error) {
    throw new Error(`Failed to choose output folder: ${error.message}`);
  }
});

// Get output folder handler (for UI display)
ipcMain.handle('getOutputFolder', () => {
  return getDefaultOutputFolder();
});

// Open file location handler
ipcMain.handle('openFileLocation', async (event, filePath) => {
  const { shell } = require('electron');
  try {
    if (fs.existsSync(filePath)) {
      shell.showItemInFolder(filePath);
      return { success: true };
    } else {
      throw new Error('File not found');
    }
  } catch (error) {
    throw new Error(`Failed to open file location: ${error.message}`);
  }
});

