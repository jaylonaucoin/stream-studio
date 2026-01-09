const { app, BrowserWindow, ipcMain, dialog, Notification, shell } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const https = require('https');
const http = require('http');
const urlModule = require('url');
const Store = require('electron-store');
const NodeID3 = require('node-id3');
const treeKill = require('tree-kill');

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
let isCancelling = false; // Flag to track cancellation state

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

// Helper function to apply metadata to a file
async function applyMetadataToFile(filePath, metadata, thumbnailDataUrl) {
  try {
    const ext = path.extname(filePath).toLowerCase();
    
    // Convert base64 data URL to buffer for thumbnail
    let thumbnailBuffer = null;
    if (thumbnailDataUrl) {
      // Check if it's a data URL or regular URL
      if (thumbnailDataUrl.startsWith('data:image/')) {
        const base64Data = thumbnailDataUrl.replace(/^data:image\/\w+;base64,/, '');
        try {
          thumbnailBuffer = Buffer.from(base64Data, 'base64');
        } catch (e) {
          thumbnailBuffer = null;
        }
      } else {
        // It's a regular URL, need to fetch and convert to buffer
        try {
          const parsedUrl = urlModule.parse(thumbnailDataUrl);
          const client = parsedUrl.protocol === 'https:' ? https : http;
          
          thumbnailBuffer = await new Promise((resolve, reject) => {
            const req = client.get(thumbnailDataUrl, (res) => {
              const chunks = [];
              res.on('data', (chunk) => chunks.push(chunk));
              res.on('end', () => {
                const buffer = Buffer.concat(chunks);
                resolve(buffer);
              });
            });
            req.on('error', reject);
            req.setTimeout(10000, () => {
              req.destroy();
              reject(new Error('Timeout fetching thumbnail'));
            });
          });
        } catch (fetchError) {
          thumbnailBuffer = null;
        }
      }
    }

    if (ext === '.mp3') {
      // Use node-id3 for MP3 files
      const tags = {
        title: metadata.title || '',
        artist: metadata.artist || '',
        album: metadata.album || '',
        performerInfo: metadata.albumArtist || '',
        genre: metadata.genre || '',
        year: metadata.year || '',
        trackNumber: metadata.trackNumber || '',
        composer: metadata.composer || '',
        publisher: metadata.publisher || '',
        comment: {
          language: metadata.language || 'eng',
          text: metadata.comment || metadata.description || '',
        },
        copyright: metadata.copyright || '',
        bpm: metadata.bpm ? parseInt(metadata.bpm, 10) : undefined,
      };

      // Add thumbnail if provided
      if (thumbnailBuffer) {
        // Detect MIME type from buffer signature
        let mimeType = 'image/jpeg'; // default
        if (thumbnailBuffer[0] === 0x89 && thumbnailBuffer[1] === 0x50 && thumbnailBuffer[2] === 0x4E && thumbnailBuffer[3] === 0x47) {
          mimeType = 'image/png';
        } else if (thumbnailBuffer[0] === 0xFF && thumbnailBuffer[1] === 0xD8) {
          mimeType = 'image/jpeg';
        } else if (thumbnailBuffer[0] === 0x52 && thumbnailBuffer[1] === 0x49 && thumbnailBuffer[2] === 0x46 && thumbnailBuffer[3] === 0x46) {
          mimeType = 'image/webp';
        }
        tags.image = {
          mime: mimeType,
          type: { id: 3, name: 'front cover' },
          description: 'Cover',
          imageBuffer: thumbnailBuffer,
        };
      }

      // Remove undefined values
      Object.keys(tags).forEach(key => {
        if (tags[key] === undefined || tags[key] === '') {
          delete tags[key];
        }
      });

      const success = NodeID3.write(tags, filePath);
      if (!success) {
        throw new Error('Failed to write ID3 tags');
      }
    } else if (ext === '.m4a' || ext === '.mp4') {
      // Use ffmpeg for M4A/MP4 files (iTunes tags)
      const ffmpegPath = getFfmpegPath();
      const args = ['-i', filePath, '-c', 'copy'];
      
      // Add metadata
      if (metadata.title) args.push('-metadata', `title=${metadata.title}`);
      if (metadata.artist) args.push('-metadata', `artist=${metadata.artist}`);
      if (metadata.album) args.push('-metadata', `album=${metadata.album}`);
      if (metadata.albumArtist) args.push('-metadata', `album_artist=${metadata.albumArtist}`);
      if (metadata.genre) args.push('-metadata', `genre=${metadata.genre}`);
      if (metadata.year) args.push('-metadata', `date=${metadata.year}`);
      if (metadata.trackNumber) args.push('-metadata', `track=${metadata.trackNumber}${metadata.totalTracks ? `/${metadata.totalTracks}` : ''}`);
      if (metadata.composer) args.push('-metadata', `composer=${metadata.composer}`);
      if (metadata.publisher) args.push('-metadata', `publisher=${metadata.publisher}`);
      if (metadata.comment || metadata.description) args.push('-metadata', `comment=${metadata.comment || metadata.description}`);
      if (metadata.copyright) args.push('-metadata', `copyright=${metadata.copyright}`);
      if (metadata.bpm) args.push('-metadata', `TBPM=${metadata.bpm}`);

      // Add thumbnail/cover art
      if (thumbnailBuffer) {
        const tempThumbnailPath = path.join(os.tmpdir(), `thumb_${Date.now()}.jpg`);
        fs.writeFileSync(tempThumbnailPath, thumbnailBuffer);
        args.push('-i', tempThumbnailPath, '-map', '0', '-map', '1', '-c', 'copy', '-c:v:1', 'mjpeg', '-disposition:v:1', 'attached_pic');
        
        const outputPath = filePath.replace(ext, `.temp${ext}`);
        args.push(outputPath);
        
        await new Promise((resolve, reject) => {
          const ffmpegProc = spawn(ffmpegPath, args, { stdio: 'ignore' });
          ffmpegProc.on('close', (code) => {
            if (code === 0) {
              fs.renameSync(outputPath, filePath);
              fs.unlinkSync(tempThumbnailPath);
              resolve();
            } else {
              fs.unlinkSync(tempThumbnailPath);
              reject(new Error(`FFmpeg failed with code ${code}`));
            }
          });
          ffmpegProc.on('error', reject);
        });
      } else {
        const outputPath = filePath.replace(ext, `.temp${ext}`);
        args.push(outputPath);
        
        await new Promise((resolve, reject) => {
          const ffmpegProc = spawn(ffmpegPath, args, { stdio: 'ignore' });
          ffmpegProc.on('close', (code) => {
            if (code === 0) {
              fs.renameSync(outputPath, filePath);
              resolve();
            } else {
              reject(new Error(`FFmpeg failed with code ${code}`));
            }
          });
          ffmpegProc.on('error', reject);
        });
      }
    } else {
      // For other formats, use ffmpeg with generic metadata
      const ffmpegPath = getFfmpegPath();
      const args = ['-i', filePath, '-c', 'copy'];
      
      if (metadata.title) args.push('-metadata', `title=${metadata.title}`);
      if (metadata.artist) args.push('-metadata', `artist=${metadata.artist}`);
      if (metadata.album) args.push('-metadata', `album=${metadata.album}`);
      if (metadata.genre) args.push('-metadata', `genre=${metadata.genre}`);
      if (metadata.year) args.push('-metadata', `date=${metadata.year}`);
      
      const outputPath = filePath.replace(ext, `.temp${ext}`);
      args.push(outputPath);
      
      await new Promise((resolve, reject) => {
        const ffmpegProc = spawn(ffmpegPath, args, { stdio: 'ignore' });
        ffmpegProc.on('close', (code) => {
          if (code === 0) {
            fs.renameSync(outputPath, filePath);
            resolve();
          } else {
            reject(new Error(`FFmpeg failed with code ${code}`));
          }
        });
        ffmpegProc.on('error', reject);
      });
    }
    
    return { success: true };
  } catch (error) {
    console.error('Failed to apply metadata:', error);
    return { success: false, error: error.message };
  }
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
    
    // Get mode, format, quality, playlistMode, chapters, chapterDownloadMode, selectedVideos, and customMetadata from options
    const mode = options.mode || 'audio';
    const format = options.format || 'mp3';
    const quality = options.quality || 'best';
    const playlistMode = options.playlistMode || 'single'; // 'single', 'full', or 'selected'
    const selectedChapters = options.chapters || null; // Array of chapter indices or null for full video
    const chapterDownloadMode = options.chapterDownloadMode || 'split'; // 'full' or 'split'
    const selectedVideos = options.selectedVideos || null; // Array of video indices (1-based) for playlist selection
    const customMetadata = options.customMetadata || null; // Custom metadata object
    
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
    
    // Determine output template based on playlist mode and chapters
    let outputTemplate;
    let playlistSubfolder = null;
    let isChapterDownload = false;
    
    if (playlistMode === 'full' || playlistMode === 'selected') {
      // For playlists (full or selected): save in subfolder with numbered files
      // Sanitize folder name function (remove invalid characters for file system)
      const sanitizeFolderName = (name) => {
        // Remove invalid characters for folder names
        return name.replace(/[<>:"/\\|?*]/g, '_').trim();
      };
      
      // Create output template with playlist subfolder (no numbered prefix, using metadata track numbers)
      if (fileExtension) {
        // Template: PlaylistName/%(title)s.%(ext)s
        outputTemplate = path.join(outputFolder, '%(playlist_title)s', `%(title)s.${fileExtension}`);
      } else {
        outputTemplate = path.join(outputFolder, '%(playlist_title)s', '%(title)s.%(ext)s');
      }
    } else if (chapterDownloadMode === 'split' && selectedChapters && Array.isArray(selectedChapters) && selectedChapters.length > 0) {
      // For chapter downloads: --split-chapters creates files in output folder
      // We'll move them to a subfolder and rename them after download
      isChapterDownload = true;
      // Use simple template in output folder - --split-chapters will create files with pattern:
      // "Title - 001 Chapter Name [ID].ext" in the output folder
      if (fileExtension) {
        outputTemplate = path.join(outputFolder, `%(title)s.${fileExtension}`);
      } else {
        outputTemplate = path.join(outputFolder, '%(title)s.%(ext)s');
      }
    } else {
      // For single videos: use temporary filename during conversion to avoid overwriting
      outputTemplate = fileExtension 
        ? path.join(outputFolder, `%(title)s.temp.${fileExtension}`)
        : path.join(outputFolder, '%(title)s.temp.%(ext)s');
    }
    
    // Get yt-dlp path
    const ytDlpPath = getYtDlpPath();
    const ffmpegPath = getFfmpegPath();
    
    // Prepare args array based on mode (secure - no shell injection)
    const args = [
      '--embed-metadata',      // Embed all available metadata (artist, album, title, date, etc.)
      '--ffmpeg-location', path.dirname(ffmpegPath), // Tell yt-dlp where to find ffmpeg
      '--output', outputTemplate,
    ];
    
    // Handle chapter downloads - use --split-chapters to create separate files for each chapter
    let chapterInfoForDownload = null;
    if (isChapterDownload && selectedChapters && Array.isArray(selectedChapters) && selectedChapters.length > 0) {
      // Get chapter info to know which files to keep after download
      try {
        const cacheKey = sanitizedUrl;
        const cached = chapterInfoCache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < CHAPTER_CACHE_TTL && cached.data.hasChapters) {
          chapterInfoForDownload = cached.data;
        } else {
          // Fetch chapter info if not cached
          const infoArgs = [
            '--dump-json',
            '--no-playlist',
            '--no-warnings',
            sanitizedUrl
          ];
          
          const infoResult = await new Promise((resolve, reject) => {
            const infoProcess = spawn(ytDlpPath, infoArgs, {
              stdio: ['ignore', 'pipe', 'pipe']
            });
            
            let stdout = '';
            let stderr = '';
            const timeoutId = setTimeout(() => {
              infoProcess.kill();
              reject(new Error('Failed to get chapter info for download'));
            }, 10000);
            
            infoProcess.stdout.on('data', (data) => {
              stdout += data.toString();
            });
            
            infoProcess.on('close', (code) => {
              clearTimeout(timeoutId);
              if (code === 0 && stdout) {
                try {
                  const info = JSON.parse(stdout);
                  const chapters = info.chapters || [];
                  if (chapters.length > 0) {
                    // Format chapters
                    const formattedChapters = chapters.map((chapter, index) => {
                      const startTime = chapter.start_time || 0;
                      const endTime = chapter.end_time || (info.duration || 0);
                      const title = chapter.title || `Chapter ${index + 1}`;
                      
                      return {
                        index,
                        title,
                        startTime,
                        endTime
                      };
                    });
                    
                    resolve({
                      success: true,
                      hasChapters: true,
                      chapters: formattedChapters
                    });
                  } else {
                    resolve({ success: true, hasChapters: false, chapters: [] });
                  }
                } catch (e) {
                  reject(new Error('Failed to parse chapter info'));
                }
              } else {
                reject(new Error('Failed to get chapter info'));
              }
            });
            
            infoProcess.on('error', () => {
              clearTimeout(timeoutId);
              reject(new Error('Failed to get chapter info'));
            });
          });
          
          if (infoResult.hasChapters) {
            chapterInfoForDownload = infoResult;
            // Cache it
            chapterInfoCache.set(cacheKey, {
              data: infoResult,
              timestamp: Date.now()
            });
          }
        }
        
        // Use --split-chapters to split all chapters into separate files
        // We'll delete unselected chapter files after download
        if (chapterInfoForDownload && chapterInfoForDownload.hasChapters) {
          args.push('--split-chapters');
        }
      } catch (error) {
        // If chapter info fetch fails, fall back to full video download
        console.warn('Failed to get chapter info, downloading full video:', error);
        isChapterDownload = false;
      }
    }
    
    // Add playlist option based on mode
    if (playlistMode === 'full') {
      args.push('--yes-playlist');  // Explicitly download playlists
    } else if (playlistMode === 'selected' && selectedVideos && Array.isArray(selectedVideos) && selectedVideos.length > 0) {
      // For selected videos mode, use --playlist-items with comma-separated indices
      // yt-dlp uses 1-based indexing for --playlist-items
      const playlistItems = selectedVideos.sort((a, b) => a - b).join(',');
      args.push('--playlist-items', playlistItems);
      args.push('--yes-playlist');  // Need to enable playlist mode to use --playlist-items
    } else {
      args.push('--no-playlist');   // Don't download playlists (default behavior)
    }
    
    args.push(sanitizedUrl);
    
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
     * Parse playlist progress from yt-dlp output
     * Handles patterns like:
     * - [download] Downloading item X of Y
     * - [download] [PlaylistName] Downloading video X of Y
     */
    const parsePlaylistProgress = (message) => {
      // Pattern: [download] Downloading item X of Y
      let match = message.match(/\[download\]\s+Downloading\s+item\s+(\d+)\s+of\s+(\d+)/i);
      if (match) {
        return {
          current: parseInt(match[1], 10),
          total: parseInt(match[2], 10)
        };
      }
      
      // Pattern: [download] [PlaylistName] Downloading video X of Y
      match = message.match(/\[download\]\s+\[.*?\]\s+Downloading\s+video\s+(\d+)\s+of\s+(\d+)/i);
      if (match) {
        return {
          current: parseInt(match[1], 10),
          total: parseInt(match[2], 10)
        };
      }
      
      // Pattern: [download] Downloading video X of Y
      match = message.match(/\[download\]\s+Downloading\s+video\s+(\d+)\s+of\s+(\d+)/i);
      if (match) {
        return {
          current: parseInt(match[1], 10),
          total: parseInt(match[2], 10)
        };
      }
      
      return null;
    };
    
    /**
     * Extract video title from progress message
     */
    const extractVideoTitle = (message) => {
      // Try to extract video title from various patterns
      // This is approximate - yt-dlp doesn't always show the title in progress
      // But we can try to extract it from info messages
      return null; // Will be updated from status messages if available
    };
    
    // Track playlist progress state
    let playlistProgress = null;
    let currentVideoTitle = null;
    
    /**
     * Extract additional info from progress message (speed, ETA, file size)
     */
    const parseProgressInfo = (message) => {
      const info = {};
      
      // Check for playlist progress
      if (playlistMode === 'full') {
        const playlistInfo = parsePlaylistProgress(message);
        if (playlistInfo) {
          playlistProgress = playlistInfo;
          info.playlistInfo = playlistInfo;
        } else if (playlistProgress) {
          // Keep existing playlist info if available
          info.playlistInfo = playlistProgress;
        }
      }
      
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
      
      // Try to extract video title from status messages
      const titleMatch = message.match(/\[download\]\s+(.+?)\s+has already been downloaded/i) ||
                        message.match(/\[download\]\s+Destination:\s+(.+)/i);
      if (titleMatch && playlistMode === 'full') {
        currentVideoTitle = titleMatch[1];
        if (info.playlistInfo) {
          info.playlistInfo.currentTitle = currentVideoTitle;
        }
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
        const progressInfo = parseProgressInfo(line);
        
        if (progressPercent !== null) {
          lastProgressPercent = progressPercent;
          
          // Calculate overall progress for playlists and chapters
          let finalPercent = progressPercent;
          if ((playlistMode === 'full' || playlistMode === 'selected') && progressInfo.playlistInfo) {
            const { current, total } = progressInfo.playlistInfo;
            // For selected videos mode, use selected count instead of total
            const effectiveTotal = playlistMode === 'selected' && selectedVideos && selectedVideos.length > 0 
              ? selectedVideos.length 
              : total;
            // Overall progress = (completed videos / effective total) * 100 + (current video progress / 100) / effective total
            const completedVideos = current - 1;
            const overallProgress = (completedVideos / effectiveTotal) * 100 + (progressPercent / 100) / effectiveTotal * 100;
            finalPercent = Math.min(overallProgress, 100);
          } else if (isChapterDownload && selectedChapters) {
            // For chapters, we can't easily track individual chapter progress
            // Just use the overall progress
            finalPercent = progressPercent;
          }
          
          const progressType = (playlistMode === 'full' || playlistMode === 'selected') && progressInfo.playlistInfo 
            ? 'playlist-progress' 
            : isChapterDownload 
              ? 'chapter-progress' 
              : 'progress';
          
          mainWindow?.webContents.send('conversion-progress', {
            type: progressType,
            percent: finalPercent,
            videoPercent: progressPercent, // Individual video progress
            speed: progressInfo.speed,
            eta: progressInfo.eta,
            size: progressInfo.size,
            playlistInfo: progressInfo.playlistInfo || null,
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
        const progressInfo = parseProgressInfo(line);
        
        if (progressPercent !== null) {
          lastProgressPercent = progressPercent;
          
          // Calculate overall progress for playlists and chapters
          let finalPercent = progressPercent;
          if ((playlistMode === 'full' || playlistMode === 'selected') && progressInfo.playlistInfo) {
            const { current, total } = progressInfo.playlistInfo;
            // For selected videos mode, use selected count instead of total
            const effectiveTotal = playlistMode === 'selected' && selectedVideos && selectedVideos.length > 0 
              ? selectedVideos.length 
              : total;
            // Overall progress = (completed videos / effective total) * 100 + (current video progress / 100) / effective total
            const completedVideos = current - 1;
            const overallProgress = (completedVideos / effectiveTotal) * 100 + (progressPercent / 100) / effectiveTotal * 100;
            finalPercent = Math.min(overallProgress, 100);
          } else if (isChapterDownload && selectedChapters) {
            // For chapters, we can't easily track individual chapter progress
            // Just use the overall progress
            finalPercent = progressPercent;
          }
          
          const progressType = (playlistMode === 'full' || playlistMode === 'selected') && progressInfo.playlistInfo 
            ? 'playlist-progress' 
            : isChapterDownload 
              ? 'chapter-progress' 
              : 'progress';
          
          mainWindow?.webContents.send('conversion-progress', {
            type: progressType,
            percent: finalPercent,
            videoPercent: progressPercent, // Individual video progress
            speed: progressInfo.speed,
            eta: progressInfo.eta,
            size: progressInfo.size,
            playlistInfo: progressInfo.playlistInfo || null,
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
    // Longer timeout for playlists and chapter downloads
    const CONVERSION_TIMEOUT = (playlistMode === 'full' || playlistMode === 'selected')
      ? 120 * 60 * 1000  // 2 hours for playlists
      : isChapterDownload
        ? 60 * 60 * 1000  // 1 hour for chapter downloads
        : 30 * 60 * 1000;   // 30 minutes for single videos
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
          // Success - find the created file(s)
          try {
            // Use the mode and format captured from the outer scope
            const expectedExtension = getFormatExtension(format, mode);
            const videoUrl = sanitizedUrl; // Capture for history
            
            // Handle chapter downloads
            if (isChapterDownload && chapterInfoForDownload && chapterInfoForDownload.hasChapters) {
              console.log('Starting chapter file processing...');
              // Make this async to allow for retries
              (async () => {
                try {
                  console.log('Inside async chapter handler');
                  // --split-chapters creates files in the output folder with format:
              // "Video Title - 001 Chapter Name [videoID].ext"
              // We need to find them, move them to a folder, and rename to just "Chapter Name.ext"
              
              // Get video title from chapter files or cache
              let videoTitle = 'Video';
              try {
                // Try to get title from video info cache
                const cacheKey = sanitizedUrl;
                const videoInfoCached = videoInfoCache.get(cacheKey);
                if (videoInfoCached && videoInfoCached.data && videoInfoCached.data.title) {
                  videoTitle = videoInfoCached.data.title;
                } else {
                  // Extract from first chapter file name if available
                  // Pattern: "Video Title - 001 Chapter Name [ID].ext"
                  const files = fs.readdirSync(outputFolder);
                  const chapterFilePattern = files.find(f => 
                    f.includes(' - ') && f.match(/\[[A-Za-z0-9_-]+\]\./) && 
                    (format === 'best' ? ['.mp3', '.m4a', '.mp4', '.webm'].some(ext => f.toLowerCase().endsWith(ext)) : f.toLowerCase().endsWith(`.${expectedExtension}`))
                  );
                  if (chapterFilePattern) {
                    const match = chapterFilePattern.match(/^(.+?)\s+-\s+\d+/);
                    if (match) {
                      videoTitle = match[1].trim();
                    }
                  }
                }
              } catch (err) {
                console.warn('Failed to get video title:', err);
              }
              
              // Sanitize folder name
              const sanitizeFolderName = (name) => {
                return name.replace(/[<>:"/\\|?*]/g, '_').trim();
              };
              
              const sanitizedVideoTitle = sanitizeFolderName(videoTitle);
              const chapterFolder = path.join(outputFolder, sanitizedVideoTitle);
              
              // Create chapter folder if it doesn't exist
              if (!fs.existsSync(chapterFolder)) {
                fs.mkdirSync(chapterFolder, { recursive: true });
              }
              
              // Helper function to find chapter files with retry
              const findChapterFiles = (retries = 5, delay = 3000) => {
                return new Promise((resolve, reject) => {
                  // Wait a bit first - yt-dlp might still be writing files
                  const attempt = (attemptNumber = 0) => {
                    try {
                      console.log(`Attempt ${attemptNumber + 1}: Reading output folder: ${outputFolder}`);
                      const entries = fs.readdirSync(outputFolder, { withFileTypes: true });
                      const files = entries.filter(e => e.isFile()).map(e => e.name);
                      
                      console.log(`Attempting to find chapter files. Total files in folder: ${files.length}`);
                      console.log('All files in folder:', files);
                      
                      // Find and delete the full-length video file (the one without chapter number)
                      // Pattern: "Video Title.ext" (no " - 001" pattern, no [ID])
                      const fullVideoFile = files.find(f => {
                        const lower = f.toLowerCase();
                        const hasExtension = lower.endsWith(`.${expectedExtension}`);
                        if (!hasExtension) return false;
                        // Must NOT have chapter pattern (no " - 001" or "[ID]")
                        const hasChapterPattern = f.includes(' - ') && f.match(/\s+-\s+\d{3}\s+/) && f.match(/\[.+\]/);
                        return !hasChapterPattern;
                      });
                      
                      if (fullVideoFile) {
                        try {
                          fs.unlinkSync(path.join(outputFolder, fullVideoFile));
                          console.log(`Deleted full-length video file: ${fullVideoFile}`);
                        } catch (err) {
                          console.warn(`Failed to delete full video file:`, err);
                        }
                      }
                      
                      // Also delete thumbnail and other temp files
                      const thumbnailFile = files.find(f => f.toLowerCase().endsWith('.webp'));
                      if (thumbnailFile) {
                        try {
                          fs.unlinkSync(path.join(outputFolder, thumbnailFile));
                        } catch (err) {
                          // Ignore
                        }
                      }
                      
                      // Find chapter files - they match pattern: "Video Title - 001 Chapter Name [ID].ext"
                      // Pattern: has " - " followed by 3 digits, then chapter name, then [ID]
                      let chapterFiles = [];
                      if (format === 'best') {
                        const possibleExtensions = mode === 'audio' 
                          ? ['.mp3', '.m4a', '.webm', '.opus', '.ogg']
                          : ['.mp4', '.webm', '.mkv', '.mov'];
                        chapterFiles = files
                          .filter(f => {
                            const hasValidExtension = possibleExtensions.some(ext => f.toLowerCase().endsWith(ext));
                            if (!hasValidExtension) return false;
                            // Check if it matches chapter pattern: contains " - " followed by digits, space, chapter name, and [ID]
                            // Pattern: " - 001 Chapter Name [ID].ext"
                            const hasDashSpace = f.includes(' - ');
                            const hasDigitPattern = f.match(/\s+-\s+\d+\s+/);
                            const hasIdPattern = f.match(/\[[A-Za-z0-9_-]+\]\./);
                            const hasChapterPattern = hasDashSpace && hasDigitPattern && hasIdPattern;
                            
                            if (!hasChapterPattern) {
                              console.log(`File "${f}" doesn't match chapter pattern. hasDashSpace: ${hasDashSpace}, hasDigitPattern: ${!!hasDigitPattern}, hasIdPattern: ${!!hasIdPattern}`);
                              return false;
                            }
                            console.log(`File "${f}" matches chapter pattern!`);
                            // Check if file exists and is readable
                            const filePath = path.join(outputFolder, f);
                            if (!fs.existsSync(filePath)) return false;
                            try {
                              const stats = fs.statSync(filePath);
                              return stats.size > 0; // File must have content
                            } catch (err) {
                              return false;
                            }
                          })
                          .map(f => ({
                            fileName: f,
                            filePath: path.join(outputFolder, f),
                            time: fs.statSync(path.join(outputFolder, f)).mtime.getTime()
                          }));
                      } else {
                        const extension = `.${expectedExtension}`;
                        chapterFiles = files
                          .filter(f => {
                            const lower = f.toLowerCase();
                            if (!lower.endsWith(extension)) return false;
                            // Check if it matches chapter pattern: contains " - " followed by digits, space, chapter name, and [ID]
                            // Pattern: " - 001 Chapter Name [ID].ext"
                            const hasDashSpace = f.includes(' - ');
                            const hasDigitPattern = f.match(/\s+-\s+\d+\s+/);
                            const hasIdPattern = f.match(/\[[A-Za-z0-9_-]+\]\./);
                            const hasChapterPattern = hasDashSpace && hasDigitPattern && hasIdPattern;
                            
                            if (!hasChapterPattern) {
                              console.log(`File "${f}" doesn't match chapter pattern. hasDashSpace: ${hasDashSpace}, hasDigitPattern: ${!!hasDigitPattern}, hasIdPattern: ${!!hasIdPattern}`);
                              return false;
                            }
                            console.log(`File "${f}" matches chapter pattern!`);
                            // Check if file exists and is readable
                            const filePath = path.join(outputFolder, f);
                            if (!fs.existsSync(filePath)) return false;
                            try {
                              const stats = fs.statSync(filePath);
                              return stats.size > 0; // File must have content
                            } catch (err) {
                              return false;
                            }
                          })
                          .map(f => ({
                            fileName: f,
                            filePath: path.join(outputFolder, f),
                            time: fs.statSync(path.join(outputFolder, f)).mtime.getTime()
                          }));
                      }
                      
                      console.log(`Found ${chapterFiles.length} chapter files in output folder`);
                      if (chapterFiles.length > 0) {
                        console.log('Chapter files found:', chapterFiles.map(f => f.fileName));
                        resolve(chapterFiles);
                      } else if (attemptNumber < retries) {
                        console.log(`No chapter files found, retrying in ${delay}ms... (${retries - attemptNumber} retries left)`);
                        setTimeout(() => attempt(attemptNumber + 1), delay);
                      } else {
                        // Log all files for debugging
                        console.log('All files in output folder:', files);
                        console.log('Looking for pattern: " - " followed by digits and "[ID]"');
                        reject(new Error('No chapter files found after retries. Files in folder: ' + files.slice(0, 10).join(', ')));
                      }
                    } catch (err) {
                      console.error('Error in findChapterFiles attempt:', err);
                      if (attemptNumber < retries) {
                        console.log(`Error finding files, retrying in ${delay}ms... (${retries - attemptNumber} retries left)`);
                        setTimeout(() => attempt(attemptNumber + 1), delay);
                      } else {
                        reject(err);
                      }
                    }
                  };
                  // Start with a small delay to let files finish writing
                  setTimeout(() => attempt(0), 1000);
                });
              };
              
              // Wait a bit for files to be written, then find them
              const chapterFiles = await findChapterFiles(3, 2000);
              
              // Match chapter files to selected chapters and rename/move them
              // File format: "Video Title - 001 Chapter Name [videoID].ext"
              // We want: "Video Title/Chapter Name.ext"
              const selectedChapterTitles = selectedChapters
                .map(idx => chapterInfoForDownload.chapters[idx]?.title)
                .filter(Boolean);
              
              const keptFiles = [];
              const filesToDelete = [];
              
              // Sort chapter files by chapter number to maintain order
              chapterFiles.sort((a, b) => {
                const numA = a.fileName.match(/\s+-\s+(\d{3})/);
                const numB = b.fileName.match(/\s+-\s+(\d{3})/);
                if (numA && numB) {
                  return parseInt(numA[1], 10) - parseInt(numB[1], 10);
                }
                return 0;
              });
              
              for (const file of chapterFiles) {
                // Extract chapter name from filename
                // Pattern: "Video Title - 001 Chapter Name [videoID].ext"
                // Actual pattern: "Video Title - 001 A1： Chapter Name [videoID].ext" (note full-width colon)
                // We need to extract "A1： Chapter Name" part (everything between the 3-digit number and the [videoID])
                let chapterNameFromFile = null;
                // Pattern: " - 001 " followed by chapter name, then " [ID]"
                // Example: "Video Title - 001 A1： Le Temps Que J'étais Jeune [O74eE8aVwU0].mp3"
                let match = file.fileName.match(/\s+-\s+\d{3}\s+(.+?)\s+\[.+\]\.[^.]+$/);
                if (match) {
                  chapterNameFromFile = match[1].trim();
                } else {
                  // Try pattern without space before [: " - 001 Chapter Name[ID].ext"
                  match = file.fileName.match(/\s+-\s+\d{3}\s+(.+?)\[.+\]\.[^.]+$/);
                  if (match) {
                    chapterNameFromFile = match[1].trim();
                  } else {
                    // Try pattern: " - 001Chapter Name [ID].ext" (no space after number)
                    match = file.fileName.match(/\s+-\s+\d{3}(.+?)\s+\[.+\]\.[^.]+$/);
                    if (match) {
                      chapterNameFromFile = match[1].trim();
                    } else {
                      console.warn(`Could not extract chapter name from: ${file.fileName}`);
                    }
                  }
                }
                
                if (chapterNameFromFile) {
                  console.log(`Extracted chapter name: "${chapterNameFromFile}" from file: ${file.fileName}`);
                  
                  // Check if this chapter is in our selected list
                  // Note: Filenames may contain full-width colons (：) that need to be normalized
                  const normalizedChapterName = chapterNameFromFile.replace(/：/g, ':').replace(/\s+/g, ' ').trim();
                  const isSelected = selectedChapterTitles.some(title => {
                    // Match by chapter name
                    const sanitizedChapterName = normalizedChapterName.replace(/[<>:"/\\|?*]/g, '_');
                    const sanitizedTitle = title.replace(/[<>:"/\\|?*]/g, '_');
                    const normalizedTitle = title.replace(/\s+/g, ' ').trim();
                    
                    return normalizedChapterName === normalizedTitle || 
                           sanitizedChapterName === sanitizedTitle ||
                           normalizedChapterName.includes(normalizedTitle) || 
                           normalizedTitle.includes(normalizedChapterName);
                  });
                  
                  if (isSelected) {
                    // Find the matching chapter to get the exact title
                    const matchingChapter = chapterInfoForDownload.chapters.find((ch, idx) => 
                      selectedChapters.includes(idx) && (
                        ch.title === chapterNameFromFile ||
                        ch.title.includes(chapterNameFromFile) ||
                        chapterNameFromFile.includes(ch.title)
                      )
                    );
                    
                    const finalChapterName = matchingChapter ? matchingChapter.title : chapterNameFromFile;
                    const sanitizedChapterName = sanitizeFolderName(finalChapterName);
                    const newFileName = `${sanitizedChapterName}.${expectedExtension}`;
                    const newFilePath = path.join(chapterFolder, newFileName);
                    const uniqueFilePath = getUniqueFilename(newFilePath);
                    
                    try {
                      // Move and rename file to folder with just chapter name
                      fs.renameSync(file.filePath, uniqueFilePath);
                      keptFiles.push({
                        fileName: path.basename(uniqueFilePath),
                        filePath: uniqueFilePath
                      });
                    } catch (renameError) {
                      console.warn(`Failed to move/rename chapter file ${file.fileName}:`, renameError);
                      // Keep original if rename fails
                      keptFiles.push({
                        fileName: file.fileName,
                        filePath: file.filePath
                      });
                    }
                  } else {
                    filesToDelete.push(file);
                  }
                } else {
                  // Can't parse, delete it (shouldn't happen but safety check)
                  filesToDelete.push(file);
                }
              }
              
              // Delete unselected chapter files
              for (const fileToDelete of filesToDelete) {
                try {
                  fs.unlinkSync(fileToDelete.filePath);
                  console.log(`Deleted unselected chapter file: ${fileToDelete.fileName}`);
                } catch (err) {
                  console.warn(`Failed to delete unselected chapter file ${fileToDelete.fileName}:`, err);
                }
              }
              
                  if (keptFiles.length > 0) {
                    // Apply custom metadata if provided (async - already in async IIFE, but keeping structure consistent)
                    if (customMetadata && customMetadata.type === 'chapter' && customMetadata.chapterMetadata) {
                      try {
                        const albumMeta = customMetadata.chapterMetadata.albumMetadata || {};
                        const template = customMetadata.chapterMetadata.chapterTitleTemplate || '{chapterTitle}';
                        const useChapterTitles = customMetadata.chapterMetadata.useChapterTitles !== false;
                        
                        // Sort keptFiles to match chapter order
                        const sortedFiles = [...keptFiles].sort((a, b) => {
                          const numA = a.fileName.match(/\s+-\s+(\d{3})/);
                          const numB = b.fileName.match(/\s+-\s+(\d{3})/);
                          if (numA && numB) {
                            return parseInt(numA[1], 10) - parseInt(numB[1], 10);
                          }
                          return 0;
                        });
                        
                        // Apply metadata to each chapter file
                        for (let i = 0; i < sortedFiles.length; i++) {
                          const file = sortedFiles[i];
                          const chapterIndex = selectedChapters[i];
                          const chapter = chapterInfoForDownload.chapters[chapterIndex];
                          
                          // Build title from template
                          let title = chapter?.title || `Chapter ${i + 1}`;
                          if (!useChapterTitles && template) {
                            title = template
                              .replace('{chapterTitle}', chapter?.title || `Chapter ${i + 1}`)
                              .replace('{album}', albumMeta.album || '')
                              .replace('{trackNumber}', (i + 1).toString());
                          }
                          
                          const metadata = {
                            ...albumMeta,
                            title: title,
                            trackNumber: (i + 1).toString(),
                            totalTracks: sortedFiles.length.toString(),
                          };
                          
                          await applyMetadataToFile(file.filePath, metadata, customMetadata.thumbnail);
                        }
                      } catch (metaError) {
                        console.warn('Failed to apply chapter metadata:', metaError);
                        // Continue even if metadata fails
                      }
                    }
                    
                    // Add to history with chapter info
                    addToHistory({
                      url: videoUrl,
                      fileName: `${sanitizedVideoTitle} (${keptFiles.length} chapters)`,
                      filePath: chapterFolder,
                      mode,
                      format,
                      quality,
                      status: 'completed',
                      isChapters: true,
                      chapterFiles: keptFiles,
                      chapterCount: keptFiles.length,
                      chapterFolderName: sanitizedVideoTitle
                    });
                    
                    // Show notification
                    showNotification(
                      'Chapter Download Complete',
                      `${keptFiles.length} chapter${keptFiles.length > 1 ? 's' : ''} downloaded to ${sanitizedVideoTitle}`,
                      () => {
                        shell.showItemInFolder(chapterFolder);
                      }
                    );
                    
                    resolve({
                      success: true,
                      isChapters: true,
                      chapterFolder: chapterFolder,
                      chapterFolderName: sanitizedVideoTitle,
                      files: keptFiles,
                      fileCount: keptFiles.length
                    });
                  } else {
                    // Fallback: couldn't find chapter files
                    reject(new Error('Chapter download completed but chapter files not found'));
                  }
                } catch (err) {
                  reject(err);
                }
              })();
              return; // Return early, async handler will resolve/reject
            }
            
            // Handle playlist mode differently
            if (playlistMode === 'full' || playlistMode === 'selected') {
              // For playlists, find the playlist subfolder and collect all files
              // Look for directories in output folder that were recently created/modified
              const entries = fs.readdirSync(outputFolder, { withFileTypes: true });
              const directories = entries
                .filter(entry => entry.isDirectory())
                .map(entry => ({
                  name: entry.name,
                  path: path.join(outputFolder, entry.name),
                  time: fs.statSync(path.join(outputFolder, entry.name)).mtime.getTime()
                }))
                .sort((a, b) => b.time - a.time); // Most recent first
              
              if (directories.length > 0) {
                // Use the most recently modified directory (should be our playlist folder)
                const playlistFolder = directories[0].path;
                const playlistFolderName = directories[0].name;
                
                // Get all files in the playlist folder
                const playlistFiles = fs.readdirSync(playlistFolder)
                  .filter(f => {
                    if (format === 'best') {
                      const possibleExtensions = mode === 'audio' 
                        ? ['.mp3', '.m4a', '.webm', '.opus', '.ogg']
                        : ['.mp4', '.webm', '.mkv', '.mov'];
                      return possibleExtensions.some(ext => f.toLowerCase().endsWith(ext));
                    } else {
                      return f.toLowerCase().endsWith(`.${expectedExtension}`);
                    }
                  })
                  .map(f => {
                    const filePath = path.join(playlistFolder, f);
                    const stats = fs.statSync(filePath);
                    return {
                      fileName: f,
                      filePath: filePath,
                      mtime: stats.mtime.getTime()
                    };
                  });
                playlistFiles.sort((a, b) => a.mtime - b.mtime); // Sort by modification time to preserve playlist order
                
                if (playlistFiles.length > 0) {
                  // Apply custom metadata if provided (await to ensure it completes)
                  if (customMetadata && customMetadata.type === 'playlist') {
                    (async () => {
                      try {
                        if (customMetadata.mode === 'bulk' && customMetadata.bulkMetadata) {
                          // Apply bulk metadata to all files with auto-incremented track numbers
                          // Use totalTracks from metadata if provided (for selected videos mode), otherwise use file count
                          const totalTracks = customMetadata.totalTracks || playlistFiles.length;
                          for (let i = 0; i < playlistFiles.length; i++) {
                            const file = playlistFiles[i];
                            const metadata = {
                              ...customMetadata.bulkMetadata,
                              trackNumber: (i + 1).toString(),
                              totalTracks: totalTracks.toString(),
                            };
                            await applyMetadataToFile(file.filePath, metadata, customMetadata.thumbnail);
                          }
                        } else if (customMetadata.mode === 'individual' && customMetadata.perFileMetadata) {
                          // Apply per-file metadata (shared thumbnail applies to all)
                          for (let i = 0; i < playlistFiles.length && i < customMetadata.perFileMetadata.length; i++) {
                            const file = playlistFiles[i];
                            const metadata = customMetadata.perFileMetadata[i];
                            await applyMetadataToFile(file.filePath, metadata, customMetadata.thumbnail);
                          }
                        }
                      } catch (metaError) {
                        console.warn('Failed to apply playlist metadata:', metaError);
                        // Continue even if metadata fails
                      }
                    })().then(() => {
                      // Add to history with playlist info
                      addToHistory({
                        url: videoUrl,
                        fileName: `${playlistFolderName} (${playlistFiles.length} files)`,
                        filePath: playlistFolder,
                        mode,
                        format,
                        quality,
                        status: 'completed',
                        isPlaylist: true,
                        playlistFiles: playlistFiles.map(f => ({
                          fileName: f.fileName,
                          filePath: f.filePath
                        })),
                        playlistFolderName
                      });
                      
                      // Show notification
                      showNotification(
                        'Playlist Download Complete',
                        `${playlistFiles.length} videos downloaded to ${playlistFolderName}`,
                        () => {
                          shell.showItemInFolder(playlistFolder);
                        }
                      );
                      
                      resolve({
                        success: true,
                        isPlaylist: true,
                        playlistFolder: playlistFolder,
                        playlistFolderName: playlistFolderName,
                        files: playlistFiles,
                        fileCount: playlistFiles.length
                      });
                    }).catch((err) => {
                      console.error('Error in playlist metadata application:', err);
                      // Still resolve even if metadata fails
                      addToHistory({
                        url: videoUrl,
                        fileName: `${playlistFolderName} (${playlistFiles.length} files)`,
                        filePath: playlistFolder,
                        mode,
                        format,
                        quality,
                        status: 'completed',
                        isPlaylist: true,
                        playlistFiles: playlistFiles.map(f => ({
                          fileName: f.fileName,
                          filePath: f.filePath
                        })),
                        playlistFolderName
                      });
                      
                      showNotification(
                        'Playlist Download Complete',
                        `${playlistFiles.length} videos downloaded to ${playlistFolderName}`,
                        () => {
                          shell.showItemInFolder(playlistFolder);
                        }
                      );
                      
                      resolve({
                        success: true,
                        isPlaylist: true,
                        playlistFolder: playlistFolder,
                        playlistFolderName: playlistFolderName,
                        files: playlistFiles,
                        fileCount: playlistFiles.length
                      });
                    });
                  } else {
                    // No metadata to apply, proceed immediately
                    addToHistory({
                      url: videoUrl,
                      fileName: `${playlistFolderName} (${playlistFiles.length} files)`,
                      filePath: playlistFolder,
                      mode,
                      format,
                      quality,
                      status: 'completed',
                      isPlaylist: true,
                      playlistFiles: playlistFiles.map(f => ({
                        fileName: f.fileName,
                        filePath: f.filePath
                      })),
                      playlistFolderName
                    });
                    
                    showNotification(
                      'Playlist Download Complete',
                      `${playlistFiles.length} videos downloaded to ${playlistFolderName}`,
                      () => {
                        shell.showItemInFolder(playlistFolder);
                      }
                    );
                    
                    resolve({
                      success: true,
                      isPlaylist: true,
                      playlistFolder: playlistFolder,
                      playlistFolderName: playlistFolderName,
                      files: playlistFiles,
                      fileCount: playlistFiles.length
                    });
                  }
                  return;
                }
              }
              
              // Fallback: couldn't find playlist folder
              reject(new Error('Playlist download completed but playlist folder not found'));
              return;
            }
            
            // Single video mode - existing logic
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
                    
                    // Apply custom metadata if provided (await to ensure it completes)
                    if (customMetadata && customMetadata.type === 'single' && customMetadata.metadata) {
                      (async () => {
                        try {
                          await applyMetadataToFile(outputFilePath, customMetadata.metadata, customMetadata.thumbnail);
                        } catch (metaError) {
                          console.warn('Failed to apply metadata:', metaError);
                          // Continue even if metadata fails, but log the error
                        }
                      })().then(() => {
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
                      }).catch((err) => {
                        console.error('Error in metadata application:', err);
                        // Still resolve even if metadata fails
                        const fileName = path.basename(uniqueFilePath);
                        
                        addToHistory({
                          url: videoUrl,
                          fileName,
                          filePath: outputFilePath,
                          mode,
                          format,
                          quality,
                          status: 'completed'
                        });
                        
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
                      });
                    } else {
                      // No metadata to apply, proceed immediately
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
                    }
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

// Cancel handler - uses tree-kill to terminate the entire process tree
ipcMain.handle('cancel', async () => {
  if (currentConversionProcess && !isCancelling) {
    isCancelling = true;
    const pid = currentConversionProcess.pid;
    
    console.log(`Cancelling conversion process (PID: ${pid})...`);
    
    // Send immediate feedback to UI
    mainWindow?.webContents.send('conversion-progress', {
      type: 'status',
      message: 'Cancelling download...'
    });
    
    return new Promise((resolve) => {
      // Use tree-kill to kill the entire process tree (yt-dlp + ffmpeg children)
      treeKill(pid, 'SIGKILL', (err) => {
        if (err) {
          console.error('tree-kill error:', err);
          // Fallback: try direct kill
          try {
            currentConversionProcess.kill('SIGKILL');
          } catch (killErr) {
            console.error('Fallback kill error:', killErr);
          }
        }
        
        console.log('Process tree terminated');
        
        // Clean up partial files in output folder
        try {
          const outputFolder = getDefaultOutputFolder();
          if (fs.existsSync(outputFolder)) {
            const files = fs.readdirSync(outputFolder);
            const now = Date.now();
            
            // Look for incomplete files
            files.forEach(file => {
              const filePath = path.join(outputFolder, file);
              try {
                const stats = fs.statSync(filePath);
                const fileTime = stats.mtime.getTime();
                const isRecent = now - fileTime < 5 * 60 * 1000; // Modified in last 5 minutes
                
                // Delete partial/temp files
                const shouldDelete = 
                  file.endsWith('.part') || 
                  file.endsWith('.ytdl') ||
                  file.includes('.temp.') ||
                  (isRecent && (
                    // Very small audio files that are likely incomplete
                    (file.match(/\.(mp3|m4a|opus|ogg)$/i) && stats.size < 50 * 1024) ||
                    // Very small video files
                    (file.match(/\.(mp4|webm|mkv|mov)$/i) && stats.size < 100 * 1024)
                  ));
                  
                if (shouldDelete) {
                  fs.unlinkSync(filePath);
                  console.log(`Cleaned up incomplete file: ${file}`);
                }
              } catch (err) {
                // Ignore cleanup errors for individual files
              }
            });
            
            // Also check for and clean up recently created empty subdirectories
            const entries = fs.readdirSync(outputFolder, { withFileTypes: true });
            entries.forEach(entry => {
              if (entry.isDirectory()) {
                const dirPath = path.join(outputFolder, entry.name);
                try {
                  const dirStats = fs.statSync(dirPath);
                  const dirTime = dirStats.mtime.getTime();
                  const isRecent = now - dirTime < 5 * 60 * 1000;
                  
                  if (isRecent) {
                    const dirContents = fs.readdirSync(dirPath);
                    // Check if directory only contains partial/incomplete files
                    const allPartial = dirContents.every(f => 
                      f.endsWith('.part') || f.endsWith('.ytdl') || f.includes('.temp.')
                    );
                    
                    if (dirContents.length === 0 || allPartial) {
                      // Clean up empty or all-partial directory
                      dirContents.forEach(f => {
                        try {
                          fs.unlinkSync(path.join(dirPath, f));
                        } catch (e) {}
                      });
                      fs.rmdirSync(dirPath);
                      console.log(`Cleaned up partial directory: ${entry.name}`);
                    }
                  }
                } catch (err) {
                  // Ignore
                }
              }
            });
          }
        } catch (err) {
          console.error('Failed to clean up partial files:', err);
        }
        
        currentConversionProcess = null;
        currentOutputPath = null;
        isCancelling = false;
        
        mainWindow?.webContents.send('conversion-progress', {
          type: 'cancelled',
          message: 'Download cancelled'
        });
        
        resolve({ cancelled: true });
      });
      
      // Timeout: force resolve after 5 seconds even if tree-kill hangs
      setTimeout(() => {
        if (isCancelling) {
          console.log('Cancel timeout - force cleanup');
          currentConversionProcess = null;
          currentOutputPath = null;
          isCancelling = false;
          
          mainWindow?.webContents.send('conversion-progress', {
            type: 'cancelled',
            message: 'Download cancelled'
          });
          
          resolve({ cancelled: true });
        }
      }, 5000);
    });
  }
  
  return { cancelled: !isCancelling };
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

// Playlist info cache
const playlistInfoCache = new Map();
const PLAYLIST_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Get playlist info handler
ipcMain.handle('getPlaylistInfo', async (event, url) => {
  try {
    // Sanitize URL
    const sanitizedUrl = sanitizeUrl(url);
    
    // Check cache first
    const cacheKey = sanitizedUrl;
    const cached = playlistInfoCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < PLAYLIST_CACHE_TTL) {
      return cached.data;
    }
    
    // Get yt-dlp path
    const ytDlpPath = getYtDlpPath();
    
    // First, try to get info with --yes-playlist to check if it's a playlist
    const playlistArgs = [
      '--flat-playlist',   // Don't download, just list items
      '--dump-json',       // Output JSON metadata
      '--yes-playlist',    // Force playlist mode
      '--no-warnings',     // Suppress warnings
      sanitizedUrl
    ];
    
    return new Promise((resolve, reject) => {
      const playlistProcess = spawn(ytDlpPath, playlistArgs, {
        stdio: ['ignore', 'pipe', 'pipe']
      });
      
      let stdout = '';
      let stderr = '';
      let timeoutId = null;
      
      // Set timeout (15 seconds for playlist info extraction)
      timeoutId = setTimeout(() => {
        playlistProcess.kill();
        reject(new Error('Playlist info extraction timed out.'));
      }, 15000);
      
      playlistProcess.stdout.on('data', (data) => {
        stdout += data.toString();
      });
      
      playlistProcess.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      
      playlistProcess.on('close', (code) => {
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }
        
        if (code === 0 && stdout) {
          try {
            // Parse all JSON lines (one per video in playlist)
            const lines = stdout.trim().split('\n').filter(line => line.trim());
            
            if (lines.length === 0) {
              // Not a playlist or empty
              const result = { success: true, isPlaylist: false };
              playlistInfoCache.set(cacheKey, {
                data: result,
                timestamp: Date.now()
              });
              resolve(result);
              return;
            }
            
            // Parse first entry to get playlist metadata
            const firstEntry = JSON.parse(lines[0]);
            
            // Check if this is actually a playlist or just a single video
            const isPlaylist = lines.length > 1 || firstEntry.playlist || firstEntry.playlist_index !== undefined;
            
            if (!isPlaylist) {
              const result = { success: true, isPlaylist: false };
              playlistInfoCache.set(cacheKey, {
                data: result,
                timestamp: Date.now()
              });
              resolve(result);
              return;
            }
            
            // Parse all videos and calculate total duration
            let totalDuration = 0;
            const videos = [];
            
            lines.forEach((line, lineIndex) => {
              try {
                const entry = JSON.parse(line);
                
                // Extract video details
                const videoId = entry.id || entry.url?.split('/').pop() || null;
                const videoTitle = entry.title || `Video ${lineIndex + 1}`;
                const videoDuration = entry.duration || 0;
                const videoUrl = entry.url || entry.webpage_url || null;
                const videoThumbnail = entry.thumbnail || entry.thumbnails?.[0]?.url || null;
                const playlistIndex = entry.playlist_index !== undefined ? entry.playlist_index + 1 : lineIndex + 1; // 1-based index
                
                // Format duration
                let durationFormatted = '';
                if (videoDuration > 0) {
                  const hours = Math.floor(videoDuration / 3600);
                  const minutes = Math.floor((videoDuration % 3600) / 60);
                  const seconds = Math.floor(videoDuration % 60);
                  
                  if (hours > 0) {
                    durationFormatted = `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
                  } else {
                    durationFormatted = `${minutes}:${seconds.toString().padStart(2, '0')}`;
                  }
                }
                
                videos.push({
                  id: videoId,
                  title: videoTitle,
                  duration: videoDuration,
                  durationFormatted: durationFormatted,
                  index: playlistIndex,
                  url: videoUrl,
                  thumbnail: videoThumbnail,
                });
                
                if (entry.duration) {
                  totalDuration += entry.duration;
                }
              } catch (e) {
                // Skip invalid entries
                console.warn('Failed to parse playlist entry:', e);
              }
            });
            
            // Format total duration
            let totalDurationFormatted = '';
            if (totalDuration > 0) {
              const hours = Math.floor(totalDuration / 3600);
              const minutes = Math.floor((totalDuration % 3600) / 60);
              
              if (hours > 0) {
                totalDurationFormatted = `${hours}h ${minutes}m`;
              } else {
                totalDurationFormatted = `${minutes}m`;
              }
            }
            
            const playlistInfo = {
              success: true,
              isPlaylist: true,
              playlistTitle: firstEntry.playlist || firstEntry.playlist_title || 'Untitled Playlist',
              playlistId: firstEntry.playlist_id || null,
              playlistVideoCount: lines.length,
              playlistTotalDuration: totalDuration,
              playlistTotalDurationFormatted: totalDurationFormatted,
              playlistUploader: firstEntry.playlist_uploader || firstEntry.channel || null,
              videos: videos, // Array of individual video details
            };
            
            // Cache the result
            playlistInfoCache.set(cacheKey, {
              data: playlistInfo,
              timestamp: Date.now()
            });
            
            resolve(playlistInfo);
          } catch (parseError) {
            // If parsing fails, it might not be a playlist
            const result = { success: true, isPlaylist: false };
            playlistInfoCache.set(cacheKey, {
              data: result,
              timestamp: Date.now()
            });
            resolve(result);
          }
        } else {
          // Try single video mode to check if URL is valid at all
          const singleArgs = [
            '--dump-json',
            '--no-playlist',
            '--no-warnings',
            sanitizedUrl
          ];
          
          const singleProcess = spawn(ytDlpPath, singleArgs, {
        stdio: ['ignore', 'pipe', 'pipe']
          });
          
          let singleStdout = '';
          let singleStderr = '';
          
          const singleTimeout = setTimeout(() => {
            singleProcess.kill();
            reject(new Error('Failed to get playlist info. URL may be invalid.'));
          }, 10000);
          
          singleProcess.stdout.on('data', (data) => {
            singleStdout += data.toString();
          });
          
          singleProcess.stderr.on('data', (data) => {
            singleStderr += data.toString();
          });
          
          singleProcess.on('close', (singleCode) => {
            clearTimeout(singleTimeout);
            if (singleCode === 0 && singleStdout) {
              // It's a valid single video, not a playlist
              const result = { success: true, isPlaylist: false };
              playlistInfoCache.set(cacheKey, {
                data: result,
                timestamp: Date.now()
              });
              resolve(result);
            } else {
              reject(new Error('Failed to get playlist info. Please check the URL.'));
            }
          });
        }
      });
      
      playlistProcess.on('error', (error) => {
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }
        
        if (error.code === 'ENOENT') {
          reject(new Error('yt-dlp binary not found. Please ensure yt-dlp is installed.'));
        } else {
          reject(new Error(`Failed to get playlist info: ${error.message}`));
        }
      });
    });
  } catch (error) {
    throw new Error(`Invalid URL: ${error.message}`);
  }
});

// Chapter info cache
const chapterInfoCache = new Map();
const CHAPTER_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Get chapter info handler
ipcMain.handle('getChapterInfo', async (event, url) => {
  try {
    // Sanitize URL
    const sanitizedUrl = sanitizeUrl(url);
    
    // Check cache first
    const cacheKey = sanitizedUrl;
    const cached = chapterInfoCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CHAPTER_CACHE_TTL) {
      return cached.data;
    }
    
    // Get yt-dlp path
    const ytDlpPath = getYtDlpPath();
    
    // Use yt-dlp to extract chapter info
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
        reject(new Error('Chapter info extraction timed out.'));
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
            
            // Extract chapters from info
            const chapters = info.chapters || [];
            
            if (chapters.length === 0) {
              // No chapters available
              const result = { success: true, hasChapters: false, chapters: [] };
              chapterInfoCache.set(cacheKey, {
                data: result,
                timestamp: Date.now()
              });
              resolve(result);
              return;
            }
            
            // Format chapters with time ranges
            const formattedChapters = chapters.map((chapter, index) => {
              const startTime = chapter.start_time || 0;
              const endTime = chapter.end_time || (info.duration || 0);
              const title = chapter.title || `Chapter ${index + 1}`;
              
              // Format time as MM:SS or HH:MM:SS
              const formatTime = (seconds) => {
                const hours = Math.floor(seconds / 3600);
                const minutes = Math.floor((seconds % 3600) / 60);
                const secs = Math.floor(seconds % 60);
                
                if (hours > 0) {
                  return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
                } else {
                  return `${minutes}:${secs.toString().padStart(2, '0')}`;
                }
              };
              
              const duration = endTime - startTime;
              
              return {
                index,
                title,
                startTime,
                endTime,
                duration,
                startTimeFormatted: formatTime(startTime),
                endTimeFormatted: formatTime(endTime),
                durationFormatted: formatTime(duration),
                timeRange: `${formatTime(startTime)} - ${formatTime(endTime)}`
              };
            });
            
            const chapterInfo = {
              success: true,
              hasChapters: true,
              chapters: formattedChapters,
              totalChapters: formattedChapters.length
            };
            
            // Cache the result
            chapterInfoCache.set(cacheKey, {
              data: chapterInfo,
              timestamp: Date.now()
            });
            
            resolve(chapterInfo);
          } catch (parseError) {
            // If parsing fails or no chapters, return empty result
            const result = { success: true, hasChapters: false, chapters: [] };
            chapterInfoCache.set(cacheKey, {
              data: result,
              timestamp: Date.now()
            });
            resolve(result);
          }
        } else {
          // Parse error from stderr
          const errorLower = stderr.toLowerCase();
          let errorMsg = 'Failed to get chapter info. ';
          
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
          reject(new Error(`Failed to get chapter info: ${error.message}`));
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

// Fetch and convert remote image to base64 data URL (for thumbnail cropping)
ipcMain.handle('fetchImageAsDataUrl', async (event, imageUrl) => {
  try {
    if (!imageUrl) {
      return { success: false, error: 'No image URL provided' };
    }

    // If it's already a data URL, return it as-is
    if (imageUrl.startsWith('data:')) {
      return { success: true, dataUrl: imageUrl };
    }

    // Fetch the image from the remote URL
    const parsedUrl = urlModule.parse(imageUrl);
    const client = parsedUrl.protocol === 'https:' ? https : http;

    return new Promise((resolve) => {
      const req = client.get(imageUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      }, (res) => {
        // Handle redirects
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          const redirectUrl = res.headers.location;
          const redirectParsed = urlModule.parse(redirectUrl);
          const redirectClient = redirectParsed.protocol === 'https:' ? https : http;
          
          redirectClient.get(redirectUrl, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
          }, (redirectRes) => {
            const chunks = [];
            redirectRes.on('data', (chunk) => chunks.push(chunk));
            redirectRes.on('end', () => {
              const buffer = Buffer.concat(chunks);
              const contentType = redirectRes.headers['content-type'] || 'image/jpeg';
              const base64 = buffer.toString('base64');
              const dataUrl = `data:${contentType};base64,${base64}`;
              resolve({ success: true, dataUrl });
            });
          }).on('error', (err) => {
            resolve({ success: false, error: `Failed to fetch redirected image: ${err.message}` });
          });
          return;
        }

        if (res.statusCode !== 200) {
          resolve({ success: false, error: `Failed to fetch image: HTTP ${res.statusCode}` });
          return;
        }

        const chunks = [];
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () => {
          const buffer = Buffer.concat(chunks);
          const contentType = res.headers['content-type'] || 'image/jpeg';
          const base64 = buffer.toString('base64');
          const dataUrl = `data:${contentType};base64,${base64}`;
          resolve({ success: true, dataUrl });
        });
      });

      req.on('error', (err) => {
        resolve({ success: false, error: `Failed to fetch image: ${err.message}` });
      });

      req.setTimeout(15000, () => {
        req.destroy();
        resolve({ success: false, error: 'Image fetch timed out' });
      });
    });
  } catch (error) {
    return { success: false, error: `Failed to fetch image: ${error.message}` };
  }
});

// Select image file handler (for thumbnail replacement)
ipcMain.handle('selectImageFile', async () => {
  try {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openFile'],
      filters: [
        { name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'] },
        { name: 'All Files', extensions: ['*'] }
      ],
      title: 'Select Image File'
    });

    if (!result.canceled && result.filePaths.length > 0) {
      const imagePath = result.filePaths[0];
      // Read image file and convert to base64 data URL
      const imageBuffer = fs.readFileSync(imagePath);
      const base64 = imageBuffer.toString('base64');
      const ext = path.extname(imagePath).toLowerCase().substring(1);
      const mimeType = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' :
                       ext === 'png' ? 'image/png' :
                       ext === 'gif' ? 'image/gif' :
                       ext === 'bmp' ? 'image/bmp' :
                       ext === 'webp' ? 'image/webp' : 'image/jpeg';
      const dataUrl = `data:${mimeType};base64,${base64}`;
      return { success: true, dataUrl };
    }

    return { success: false, dataUrl: null };
  } catch (error) {
    throw new Error(`Failed to select image file: ${error.message}`);
  }
});

