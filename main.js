const { app, BrowserWindow, ipcMain, dialog, Notification, shell } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const Store = require('electron-store');

// Initialize electron-store for preferences and history
const store = new Store({
  defaults: {
    windowBounds: { width: 900, height: 700 },
    outputFolder: null,
    conversionHistory: [],
    settings: {
      notificationsEnabled: true,
      maxHistoryItems: 50,
      defaultMode: 'audio',
      defaultAudioFormat: 'mp3',
      defaultVideoFormat: 'mp4',
      defaultQuality: 'best',
    }
  }
});

let mainWindow;
let currentConversionProcess = null;
let currentOutputPath = null;

function createWindow() {
  // Restore window bounds from store
  const { width, height, x, y } = store.get('windowBounds');
  
  mainWindow = new BrowserWindow({
    width,
    height,
    x,
    y,
    minWidth: 700,
    minHeight: 500,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    },
    icon: path.join(__dirname, 'assets', 'icon.png'),
    show: false, // Don't show until ready
  });

  // Show window when ready to prevent visual flash
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Save window bounds on resize/move
  const saveBounds = () => {
    if (!mainWindow.isMinimized() && !mainWindow.isMaximized()) {
      store.set('windowBounds', mainWindow.getBounds());
    }
  };
  
  mainWindow.on('resize', saveBounds);
  mainWindow.on('move', saveBounds);

  // Load from Vite dev server in development, from build in production
  const isDev = !app.isPackaged;
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    mainWindow.loadFile(path.join(__dirname, 'dist-renderer', 'index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Show system notification
function showNotification(title, body, onClick) {
  const settings = store.get('settings');
  if (!settings.notificationsEnabled) return;
  
  if (Notification.isSupported()) {
    const notification = new Notification({
      title,
      body,
      icon: path.join(__dirname, 'assets', 'icon.png'),
      silent: false
    });
    
    if (onClick) {
      notification.on('click', onClick);
    }
    
    notification.show();
  }
}

// Add item to conversion history
function addToHistory(item) {
  const history = store.get('conversionHistory') || [];
  const settings = store.get('settings');
  
  // Add new item at the beginning
  history.unshift({
    id: Date.now().toString(),
    ...item,
    timestamp: new Date().toISOString()
  });
  
  // Limit history size
  const maxItems = settings.maxHistoryItems || 50;
  if (history.length > maxItems) {
    history.splice(maxItems);
  }
  
  store.set('conversionHistory', history);
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

// Settings handlers
ipcMain.handle('getSettings', () => {
  return store.get('settings');
});

ipcMain.handle('saveSettings', (event, settings) => {
  store.set('settings', { ...store.get('settings'), ...settings });
  return store.get('settings');
});

// History handlers
ipcMain.handle('getHistory', () => {
  return store.get('conversionHistory') || [];
});

ipcMain.handle('clearHistory', () => {
  store.set('conversionHistory', []);
  return [];
});

ipcMain.handle('removeHistoryItem', (event, id) => {
  const history = store.get('conversionHistory') || [];
  const filtered = history.filter(item => item.id !== id);
  store.set('conversionHistory', filtered);
  return filtered;
});

// Open external link
ipcMain.handle('openExternal', async (event, url) => {
  if (url.startsWith('http://') || url.startsWith('https://')) {
    await shell.openExternal(url);
    return { success: true };
  }
  throw new Error('Invalid URL');
});

// Get yt-dlp binary path
function getYtDlpPath() {
  const isDev = !app.isPackaged;
  const platform = process.platform;
  const binaryName = platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp';
  
  if (isDev) {
    // Development: check bin folder
    const devPath = path.join(__dirname, 'bin', binaryName);
    if (fs.existsSync(devPath)) {
      return path.normalize(devPath);
    }
  } else {
    // Production: check extraResources - try multiple possible locations
    const possiblePaths = [
      path.join(process.resourcesPath, 'bin', binaryName),
      path.join(process.resourcesPath, '..', 'bin', binaryName),
      path.join(__dirname, '..', 'bin', binaryName),
      path.join(app.getAppPath(), 'bin', binaryName)
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
        return path.normalize(devPath);
      }
    } else {
      // Production: check extraResources
      // Try multiple possible locations
      const possiblePaths = [
        path.join(process.resourcesPath, 'bin', 'ffmpeg.exe'),
        path.join(process.resourcesPath, '..', 'bin', 'ffmpeg.exe'),
        path.join(__dirname, '..', 'bin', 'ffmpeg.exe'),
        path.join(app.getAppPath(), 'bin', 'ffmpeg.exe')
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

// Check if FFmpeg is available
async function checkFfmpegAvailable() {
  return new Promise((resolve) => {
    const ffmpegPath = getFfmpegPath();
    
    // First check if the file exists (for absolute paths)
    if (ffmpegPath.includes(path.sep)) {
      const normalizedPath = path.normalize(ffmpegPath);
      if (!fs.existsSync(normalizedPath)) {
        resolve(false);
        return;
      }
      
      // Use the normalized absolute path - same pattern as yt-dlp spawn
      const testProc = spawn(normalizedPath, ['-version'], {
        stdio: ['ignore', 'pipe', 'pipe'],
        cwd: path.dirname(normalizedPath) // Set working directory to ffmpeg's directory
      });
      
      let hasOutput = false;
      
      testProc.stdout.on('data', () => {
        hasOutput = true;
      });
      
      testProc.stderr.on('data', () => {
        hasOutput = true; // FFmpeg version info goes to stderr
      });
      
      testProc.on('close', (code) => {
        // FFmpeg returns 0 on success, or we got output which means it's working
        resolve(code === 0 || hasOutput);
      });
      
      testProc.on('error', () => {
        resolve(false);
      });
      
      // Timeout after 3 seconds
      setTimeout(() => {
        if (!testProc.killed) {
          testProc.kill();
          resolve(false);
        }
      }, 3000);
    } else {
      // Relative path - try to find in PATH
      const testProc = spawn(ffmpegPath, ['-version'], {
        stdio: ['ignore', 'pipe', 'pipe'],
        shell: true
      });
      
      let hasOutput = false;
      
      testProc.stdout.on('data', () => {
        hasOutput = true;
      });
      
      testProc.stderr.on('data', () => {
        hasOutput = true;
      });
      
      testProc.on('close', (code) => {
        resolve(code === 0 || hasOutput);
      });
      
      testProc.on('error', () => {
        resolve(false);
      });
      
      setTimeout(() => {
        if (!testProc.killed) {
          testProc.kill();
          resolve(false);
        }
      }, 3000);
    }
  });
}

// Format to extension mapping
function getFormatExtension(format, mode) {
  const formatMap = {
    // Audio formats
    'mp3': 'mp3',
    'm4a': 'm4a',
    'flac': 'flac',
    'wav': 'wav',
    'aac': 'aac',
    'opus': 'opus',
    'vorbis': 'ogg',
    'alac': 'm4a',
    'best': null, // yt-dlp will choose the best format
    // Video formats
    'mp4': 'mp4',
    'mkv': 'mkv',
    'webm': 'webm',
    'mov': 'mov',
    'avi': 'avi',
    'flv': 'flv',
    'gif': 'gif'
  };
  
  const extension = formatMap[format];
  if (extension) {
    return extension;
  }
  
  // Default fallback based on mode
  return mode === 'audio' ? 'mp3' : 'mp4';
}

// Generate unique filename by adding number suffix if file exists
function getUniqueFilename(filePath) {
  if (!fs.existsSync(filePath)) {
    return filePath;
  }
  
  const dir = path.dirname(filePath);
  const ext = path.extname(filePath);
  const baseName = path.basename(filePath, ext);
  
  let counter = 1;
  let newPath;
  
  do {
    const newName = `${baseName} (${counter})${ext}`;
    newPath = path.join(dir, newName);
    counter++;
  } while (fs.existsSync(newPath) && counter < 1000); // Safety limit
  
  return newPath;
}

// Normalize URL - add protocol if missing
function normalizeUrl(url) {
  let normalized = url.trim();
  
  // Remove any leading/trailing whitespace and newlines
  normalized = normalized.replace(/[\r\n]/g, '').trim();
  
  // If URL doesn't have a protocol, add https://
  if (normalized && !normalized.match(/^https?:\/\//i)) {
    // Check if it looks like a domain (has a dot and no spaces)
    if (normalized.includes('.') && !normalized.includes(' ')) {
      normalized = 'https://' + normalized;
    }
  }
  
  return normalized;
}

// Sanitize and validate URL input
function sanitizeUrl(url) {
  // Validate input type
  if (typeof url !== 'string') {
    throw new Error('Invalid URL type');
  }
  
  // Normalize the URL (add protocol if missing)
  const normalized = normalizeUrl(url);
  
  // Basic URL validation
  if (!normalized || normalized.length === 0) {
    throw new Error('URL cannot be empty');
  }
  
  // Ensure it starts with http:// or https://
  if (!/^https?:\/\//i.test(normalized)) {
    throw new Error('URL must start with http:// or https://');
  }
  
  // Validate URL structure
  try {
    const urlObj = new URL(normalized);
    
    // Must have a valid hostname with at least one dot
    if (!urlObj.hostname || !urlObj.hostname.includes('.')) {
      throw new Error('Invalid URL format');
    }
    
    // Block obviously invalid hostnames
    if (urlObj.hostname.length < 4) {
      throw new Error('Invalid URL hostname');
    }
    
  } catch (e) {
    if (e.message.includes('Invalid URL')) {
      throw e;
    }
    throw new Error('Invalid URL format');
  }
  
  return normalized;
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
    
    // Get mode, format, and quality from options (default to audio/mp3/best for backward compatibility)
    const mode = options.mode || 'audio';
    const format = options.format || 'mp3';
    const quality = options.quality || 'best';
    
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
    
    // Get file extension for the selected format
    const fileExtension = getFormatExtension(format, mode);
    
    // Use a temporary filename during conversion to avoid overwriting
    // We'll rename it to the final name after conversion, checking for duplicates
    const tempTemplate = fileExtension 
      ? path.join(outputFolder, `%(title)s.temp.${fileExtension}`)
      : path.join(outputFolder, '%(title)s.temp.%(ext)s');
    
    // Also store the final template for renaming after conversion
    const finalTemplate = fileExtension 
      ? path.join(outputFolder, `%(title)s.${fileExtension}`)
      : path.join(outputFolder, '%(title)s.%(ext)s');
    
    const outputTemplate = tempTemplate;
    
    // Get yt-dlp path
    const ytDlpPath = getYtDlpPath();
    const ffmpegPath = getFfmpegPath();
    
    // Prepare args array based on mode (secure - no shell injection)
    const args = [
      '--no-playlist',         // Don't download playlists
      '--embed-metadata',      // Embed all available metadata (artist, album, title, date, etc.)
      '--ffmpeg-location', path.dirname(ffmpegPath), // Tell yt-dlp where to find ffmpeg
      '--output', outputTemplate,
      sanitizedUrl
    ];
    
    // Quality settings mapping
    const audioQualityMap = {
      'best': { quality: '0', bitrate: null },      // Best quality, no bitrate limit
      'high': { quality: '0', bitrate: '192k' },    // High quality
      'medium': { quality: '5', bitrate: '128k' },  // Medium quality
      'low': { quality: '9', bitrate: '96k' },      // Low quality
    };
    
    const videoHeightMap = {
      'best': null,    // No height limit
      'high': 1080,    // 1080p
      'medium': 720,   // 720p
      'low': 480,      // 480p
    };
    
    const audioBitrateMap = {
      'best': '192k',
      'high': '192k',
      'medium': '128k',
      'low': '96k',
    };
    
    if (mode === 'audio') {
      // Audio mode: extract audio and convert to specified format
      args.push('-x');                    // Extract audio
      args.push('--audio-format', format); // Convert to specified format
      
      const audioSettings = audioQualityMap[quality] || audioQualityMap['best'];
      args.push('--audio-quality', audioSettings.quality);
      
      // Add bitrate limit for non-best quality (applied during post-processing)
      if (audioSettings.bitrate && quality !== 'best') {
        args.push('--postprocessor-args', `ffmpeg:-b:a ${audioSettings.bitrate}`);
      }
      
      args.push('--embed-thumbnail');      // Embed thumbnail as album art
    } else {
      // Video mode: download video+audio and merge to specified format
      const heightLimit = videoHeightMap[quality];
      const audioBitrate = audioBitrateMap[quality] || '192k';
      
      // Build format selector based on quality
      let formatSelector;
      if (heightLimit) {
        formatSelector = `bestvideo[height<=${heightLimit}]+bestaudio/best[height<=${heightLimit}]/best`;
      } else {
        formatSelector = 'bestvideo+bestaudio/best';
      }
      
      if (format === 'mp4') {
        // For MP4, prefer AAC audio (native to MP4) and avoid Opus
        if (heightLimit) {
          formatSelector = `bestvideo[height<=${heightLimit}]+bestaudio[acodec!=opus]/bestvideo[height<=${heightLimit}]+bestaudio/best[height<=${heightLimit}]/best`;
        } else {
          formatSelector = 'bestvideo+bestaudio[acodec!=opus]/bestvideo+bestaudio/best';
        }
        args.push('-f', formatSelector);
        args.push('--merge-output-format', 'mp4');
        // Force AAC audio codec when merging to ensure compatibility
        args.push('--postprocessor-args', `ffmpeg:-c:a aac -b:a ${audioBitrate}`);
      } else if (format === 'webm') {
        // For WebM, Opus is fine (it's the native audio codec for WebM)
        args.push('-f', formatSelector);
        args.push('--merge-output-format', 'webm');
        // Apply audio bitrate for non-best quality
        if (quality !== 'best') {
          args.push('--postprocessor-args', `ffmpeg:-b:a ${audioBitrate}`);
        }
      } else {
        // For other formats (mkv, mov, avi, etc.)
        args.push('-f', formatSelector);
        args.push('--merge-output-format', format);
        // For MOV, prefer AAC audio; apply bitrate for all
        if (format === 'mov') {
          args.push('--postprocessor-args', `ffmpeg:-c:a aac -b:a ${audioBitrate}`);
        } else if (quality !== 'best') {
          args.push('--postprocessor-args', `ffmpeg:-b:a ${audioBitrate}`);
        }
      }
    }
    
    // Spawn yt-dlp process
    currentConversionProcess = spawn(ytDlpPath, args, {
      cwd: outputFolder,
      stdio: ['ignore', 'pipe', 'pipe']
    });
    
    let outputFilePath = null;
    let errorOutput = '';
    let lastProgressPercent = 0;
    const conversionStartTime = Date.now();
    
    /**
     * Parse progress from yt-dlp output
     * Handles multiple progress formats:
     * - [download] X%
     * - [download] X.X% of Y.YMiB
     * - [ExtractAudio] X%
     * - [Merger] X%
     * - [ffmpeg] X%
     */
    const parseProgress = (message) => {
      // Try multiple progress patterns
      const patterns = [
        /\[download\]\s+(\d+(?:\.\d+)?)%/i,           // [download] 45.2%
        /\[ExtractAudio\]\s+(\d+(?:\.\d+)?)%/i,        // [ExtractAudio] 50%
        /\[Merger\]\s+(\d+(?:\.\d+)?)%/i,              // [Merger] 75%
        /\[ffmpeg\]\s+(\d+(?:\.\d+)?)%/i,               // [ffmpeg] 80%
        /\[PostProcessor\]\s+(\d+(?:\.\d+)?)%/i,        // [PostProcessor] 90%
        /(\d+(?:\.\d+)?)%\s+of\s+[\d.]+[KMGT]?i?B/i,   // 45.2% of 123.45MiB
        /(\d+(?:\.\d+)?)%\s+at\s+[\d.]+[KMGT]?i?B\/s/i, // 45.2% at 1.23MiB/s
      ];
      
      for (const pattern of patterns) {
        const match = message.match(pattern);
        if (match) {
          const percent = parseFloat(match[1]);
          if (!isNaN(percent) && percent >= 0 && percent <= 100) {
            return percent;
          }
        }
      }
      
      return null;
    };
    
    /**
     * Extract additional info from progress message (speed, ETA, file size)
     */
    const parseProgressInfo = (message) => {
      const info = {};
      
      // Extract download speed (e.g., "at 1.23MiB/s")
      const speedMatch = message.match(/at\s+([\d.]+)\s*([KMGT]?i?B)\/s/i);
      if (speedMatch) {
        info.speed = `${speedMatch[1]} ${speedMatch[2]}/s`;
      }
      
      // Extract ETA (e.g., "ETA 00:45" or "ETA 1:23:45")
      const etaMatch = message.match(/ETA\s+(\d{1,2}:\d{2}(?::\d{2})?)/i);
      if (etaMatch) {
        info.eta = etaMatch[1];
      }
      
      // Extract file size (e.g., "of 123.45MiB")
      const sizeMatch = message.match(/of\s+([\d.]+)\s*([KMGT]?i?B)/i);
      if (sizeMatch) {
        info.size = `${sizeMatch[1]} ${sizeMatch[2]}`;
      }
      
      return info;
    };
    
    // Handle stdout (info messages and sometimes progress)
    currentConversionProcess.stdout.on('data', (data) => {
      const message = data.toString();
      const lines = message.split('\n').filter(line => line.trim());
      
      for (const line of lines) {
        // Check for progress in stdout too
        const progressPercent = parseProgress(line);
        if (progressPercent !== null) {
          lastProgressPercent = progressPercent;
          const progressInfo = parseProgressInfo(line);
          mainWindow?.webContents.send('conversion-progress', {
            type: 'progress',
            percent: progressPercent,
            speed: progressInfo.speed,
            eta: progressInfo.eta,
            size: progressInfo.size,
            message: line.trim()
          });
        } else {
          // Send other messages as info
          mainWindow?.webContents.send('conversion-progress', {
            type: 'info',
            message: line.trim()
          });
        }
      }
    });
    
    // Handle stderr (progress and errors)
    currentConversionProcess.stderr.on('data', (data) => {
      const message = data.toString();
      errorOutput += message;
      const lines = message.split('\n').filter(line => line.trim());
      
      for (const line of lines) {
        // Parse progress from stderr
        const progressPercent = parseProgress(line);
        if (progressPercent !== null) {
          lastProgressPercent = progressPercent;
          const progressInfo = parseProgressInfo(line);
          mainWindow?.webContents.send('conversion-progress', {
            type: 'progress',
            percent: progressPercent,
            speed: progressInfo.speed,
            eta: progressInfo.eta,
            size: progressInfo.size,
            message: line.trim()
          });
        } else {
          // Send other messages as status
          mainWindow?.webContents.send('conversion-progress', {
            type: 'status',
            message: line.trim()
          });
        }
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
          // We need to search for the most recent file with the correct extension
          try {
            // Use the mode and format captured from the outer scope (these are defined in the parent convert handler)
            const expectedExtension = getFormatExtension(format, mode);
            const videoUrl = sanitizedUrl; // Capture for history
            
            const files = fs.readdirSync(outputFolder);
            
            // Filter files by extension
            // For 'best' format, we need to check multiple possible extensions
            let matchingFiles = [];
            if (format === 'best') {
              // For 'best' format, check common extensions for the mode
              const possibleExtensions = mode === 'audio' 
                ? ['.mp3', '.m4a', '.webm', '.opus', '.ogg']
                : ['.mp4', '.webm', '.mkv', '.mov'];
              
              // Also check for .temp versions
              const tempExtensions = possibleExtensions.map(ext => `.temp${ext}`);
              const allExtensions = [...possibleExtensions, ...tempExtensions];
              
              matchingFiles = files
                .filter(f => allExtensions.some(ext => f.toLowerCase().endsWith(ext)))
                .map(f => ({
                  name: f,
                  path: path.join(outputFolder, f),
                  time: fs.statSync(path.join(outputFolder, f)).mtime.getTime()
                }));
            } else {
              // For specific formats, check the expected extension
              // Also look for .temp files (our temporary files during conversion)
              const extension = `.${expectedExtension}`;
              const tempExtension = `.temp.${expectedExtension}`;
              matchingFiles = files
                .filter(f => {
                  const lower = f.toLowerCase();
                  return lower.endsWith(extension) || lower.endsWith(tempExtension);
                })
                .map(f => ({
                  name: f,
                  path: path.join(outputFolder, f),
                  time: fs.statSync(path.join(outputFolder, f)).mtime.getTime()
                }));
            }
            
            // Sort by modification time (most recent first)
            matchingFiles.sort((a, b) => b.time - a.time);
            
            if (matchingFiles.length > 0) {
              // Find the temp file we created (should be the most recent .temp.* file)
              const tempFiles = matchingFiles.filter(f => f.name.includes('.temp.'));
              
              if (tempFiles.length > 0) {
                // Get the temp file (most recent)
                const tempFile = tempFiles[0];
                const tempFilePath = tempFile.path;
                const tempFileName = tempFile.name;
                
                // Extract the base name from temp file (remove .temp extension)
                // Format: title.temp.ext -> title.ext
                const tempNameMatch = tempFileName.match(/^(.+)\.temp(\.[^.]+)$/);
                if (tempNameMatch) {
                  const [, baseName, extension] = tempNameMatch;
                  const finalFileName = `${baseName}${extension}`;
                  const finalFilePath = path.join(outputFolder, finalFileName);
                  
                  // Check if final file already exists - if so, get unique name
                  const uniqueFilePath = getUniqueFilename(finalFilePath);
                  
                  try {
                    // Rename temp file to final name (or unique name if duplicate)
                    fs.renameSync(tempFilePath, uniqueFilePath);
                    outputFilePath = uniqueFilePath;
                    currentOutputPath = outputFilePath;
                    
                    const fileName = path.basename(uniqueFilePath);
                    
                    // Add to history
                    addToHistory({
                      url: videoUrl,
                      fileName,
                      filePath: outputFilePath,
                      mode,
                      format,
                      quality,
                      status: 'completed'
                    });
                    
                    // Show notification
                    showNotification(
                      'Conversion Complete',
                      `${fileName} has been saved`,
                      () => {
                        shell.showItemInFolder(outputFilePath);
                      }
                    );
                    
                    resolve({
                      success: true,
                      filePath: outputFilePath,
                      fileName
                    });
                  } catch (renameError) {
                    // If rename fails, return the temp file
                    console.warn('Failed to rename temp file to final name:', renameError);
                    outputFilePath = tempFilePath;
                    currentOutputPath = outputFilePath;
                    resolve({
                      success: true,
                      filePath: outputFilePath,
                      fileName: tempFileName
                    });
                  }
                } else {
                  // Couldn't parse temp filename, use as-is
                  outputFilePath = tempFilePath;
                  currentOutputPath = outputFilePath;
                  resolve({
                    success: true,
                    filePath: outputFilePath,
                    fileName: tempFileName
                  });
                }
              } else {
                // No temp file found, use the most recent matching file
                // (might be from a previous conversion that didn't use temp)
                outputFilePath = matchingFiles[0].path;
                let finalFileName = matchingFiles[0].name;
                
                // Check if yt-dlp added a number suffix (format: filename.1.ext)
                // and convert it to our preferred format: filename (1).ext
                const fileNameMatch = finalFileName.match(/^(.+)\.(\d+)(\.[^.]+)$/);
                if (fileNameMatch) {
                  const [, nameBase, number, ext] = fileNameMatch;
                  const newName = `${nameBase} (${number})${ext}`;
                  const newPath = path.join(outputFolder, newName);
                  
                  try {
                    if (!fs.existsSync(newPath)) {
                      fs.renameSync(outputFilePath, newPath);
                      outputFilePath = newPath;
                      finalFileName = newName;
                    }
                  } catch (renameError) {
                    console.warn('Failed to rename file to preferred format:', renameError);
                  }
                }
                
                currentOutputPath = outputFilePath;
                resolve({
                  success: true,
                  filePath: outputFilePath,
                  fileName: finalFileName
                });
              }
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

// Video info cache to avoid repeated calls
const videoInfoCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Get video info handler (for preview)
ipcMain.handle('getVideoInfo', async (event, url) => {
  try {
    // Sanitize URL
    const sanitizedUrl = sanitizeUrl(url);
    
    // Check cache first
    const cacheKey = sanitizedUrl;
    const cached = videoInfoCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.data;
    }
    
    // Get yt-dlp path
    const ytDlpPath = getYtDlpPath();
    
    // Use yt-dlp to extract video info without downloading
    const args = [
      '--dump-json',      // Output JSON metadata
      '--no-playlist',    // Don't download playlists
      '--no-warnings',    // Suppress warnings
      sanitizedUrl
    ];
    
    return new Promise((resolve, reject) => {
      const infoProcess = spawn(ytDlpPath, args, {
        stdio: ['ignore', 'pipe', 'pipe']
      });
      
      let stdout = '';
      let stderr = '';
      let timeoutId = null;
      
      // Set timeout (10 seconds for info extraction)
      timeoutId = setTimeout(() => {
        infoProcess.kill();
        reject(new Error('Video info extraction timed out. The URL may be invalid or the video may be unavailable.'));
      }, 10000);
      
      infoProcess.stdout.on('data', (data) => {
        stdout += data.toString();
      });
      
      infoProcess.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      
      infoProcess.on('close', (code) => {
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }
        
        if (code === 0 && stdout) {
          try {
            const info = JSON.parse(stdout);
            
            // Extract relevant information
            const videoInfo = {
              title: info.title || 'Unknown Title',
              thumbnail: info.thumbnail || info.thumbnails?.[0]?.url || null,
              duration: info.duration || null,
              uploader: info.uploader || info.channel || null,
              viewCount: info.view_count || null,
              uploadDate: info.upload_date || null,
              description: info.description || null,
              webpageUrl: info.webpage_url || sanitizedUrl,
            };
            
            // Format duration as MM:SS or HH:MM:SS
            if (videoInfo.duration) {
              const hours = Math.floor(videoInfo.duration / 3600);
              const minutes = Math.floor((videoInfo.duration % 3600) / 60);
              const seconds = Math.floor(videoInfo.duration % 60);
              
              if (hours > 0) {
                videoInfo.durationFormatted = `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
              } else {
                videoInfo.durationFormatted = `${minutes}:${seconds.toString().padStart(2, '0')}`;
              }
            }
            
            // Cache the result
            videoInfoCache.set(cacheKey, {
              data: { success: true, ...videoInfo },
              timestamp: Date.now()
            });
            
            resolve({ success: true, ...videoInfo });
          } catch (parseError) {
            reject(new Error(`Failed to parse video info: ${parseError.message}`));
          }
        } else {
          // Parse error from stderr
          const errorLower = stderr.toLowerCase();
          let errorMsg = 'Failed to get video info. ';
          
          if (errorLower.includes('private') || errorLower.includes('unavailable')) {
            errorMsg += 'Video is private or unavailable.';
          } else if (errorLower.includes('sign in') || errorLower.includes('login')) {
            errorMsg += 'This video requires sign-in to access.';
          } else if (errorLower.includes('age')) {
            errorMsg += 'This video is age-restricted.';
          } else if (errorLower.includes('not found') || errorLower.includes('does not exist')) {
            errorMsg += 'Video not found.';
          } else {
            errorMsg += 'Please check the URL and try again.';
          }
          
          reject(new Error(errorMsg));
        }
      });
      
      infoProcess.on('error', (error) => {
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }
        
        if (error.code === 'ENOENT') {
          reject(new Error('yt-dlp binary not found. Please ensure yt-dlp is installed.'));
        } else {
          reject(new Error(`Failed to get video info: ${error.message}`));
        }
      });
    });
  } catch (error) {
    throw new Error(`Invalid URL: ${error.message}`);
  }
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

