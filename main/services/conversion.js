/**
 * Conversion service - handles video/audio conversion
 */
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { getYtDlpPath, getFfmpegPath } = require('../utils/paths');
const { sanitizeUrl } = require('../utils/url');
const {
  getFormatExtension,
  getUniqueFilename,
  sanitizeFolderName,
  sanitizeFileName,
} = require('../utils/filename');
const {
  checkFfmpegAvailable,
  getFfmpegUnavailableError,
  splitAudioByTime,
  buildMetadataArgs,
  convertLocalFile: ffmpegConvertLocalFile,
} = require('./ffmpeg');
const { applyMetadataToFile } = require('./metadata');
const { addToHistory } = require('./history');
const { showNotification } = require('./notifications');
const { getMainWindow } = require('../window');
const videoInfoService = require('./videoInfo');

// Conversion state
let currentConversionProcess = null;
let conversionCancelled = false;

// Quality settings mapping
const AUDIO_QUALITY_MAP = {
  best: { quality: '0', bitrate: null },
  high: { quality: '0', bitrate: '192k' },
  medium: { quality: '5', bitrate: '128k' },
  low: { quality: '9', bitrate: '96k' },
};

const VIDEO_HEIGHT_MAP = {
  best: null,
  high: 1080,
  medium: 720,
  low: 480,
};

const AUDIO_BITRATE_MAP = {
  best: '192k',
  high: '192k',
  medium: '128k',
  low: '96k',
};

/**
 * Send progress to renderer
 * @param {Object} data - Progress data
 */
function sendProgress(data) {
  const mainWindow = getMainWindow();
  if (mainWindow && mainWindow.webContents) {
    mainWindow.webContents.send('conversion-progress', data);
  }
}

/**
 * Parse progress from yt-dlp output
 * @param {string} message - Output message
 * @returns {number|null} Progress percentage or null
 */
function parseProgress(message) {
  const patterns = [
    /\[download\]\s+(\d+(?:\.\d+)?)%/i,
    /\[ExtractAudio\]\s+(\d+(?:\.\d+)?)%/i,
    /\[Merger\]\s+(\d+(?:\.\d+)?)%/i,
    /\[ffmpeg\]\s+(\d+(?:\.\d+)?)%/i,
    /\[PostProcessor\]\s+(\d+(?:\.\d+)?)%/i,
    /(\d+(?:\.\d+)?)%\s+of\s+[\d.]+[KMGT]?i?B/i,
    /(\d+(?:\.\d+)?)%\s+at\s+[\d.]+[KMGT]?i?B\/s/i,
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
}

/**
 * Parse playlist progress from yt-dlp output
 * @param {string} message - Output message
 * @returns {Object|null} Playlist progress info or null
 */
function parsePlaylistProgress(message) {
  let match = message.match(/\[download\]\s+Downloading\s+item\s+(\d+)\s+of\s+(\d+)/i);
  if (match) {
    return { current: parseInt(match[1], 10), total: parseInt(match[2], 10) };
  }

  match = message.match(/\[download\]\s+\[.*?\]\s+Downloading\s+video\s+(\d+)\s+of\s+(\d+)/i);
  if (match) {
    return { current: parseInt(match[1], 10), total: parseInt(match[2], 10) };
  }

  match = message.match(/\[download\]\s+Downloading\s+video\s+(\d+)\s+of\s+(\d+)/i);
  if (match) {
    return { current: parseInt(match[1], 10), total: parseInt(match[2], 10) };
  }

  return null;
}

/**
 * Extract additional info from progress message
 * @param {string} message - Progress message
 * @param {string} playlistMode - Playlist mode
 * @param {Object|null} currentPlaylistProgress - Current playlist progress
 * @returns {Object} Extracted info
 */
function parseProgressInfo(message, playlistMode, currentPlaylistProgress) {
  const info = {};

  if (playlistMode === 'full' || playlistMode === 'selected') {
    const playlistInfo = parsePlaylistProgress(message);
    if (playlistInfo) {
      info.playlistInfo = playlistInfo;
    } else if (currentPlaylistProgress) {
      info.playlistInfo = currentPlaylistProgress;
    }
  }

  // Extract download speed
  const speedMatch = message.match(/at\s+([\d.]+)\s*([KMGT]?i?B)\/s/i);
  if (speedMatch) {
    info.speed = `${speedMatch[1]} ${speedMatch[2]}/s`;
  }

  // Extract ETA
  const etaMatch = message.match(/ETA\s+(\d{1,2}:\d{2}(?::\d{2})?)/i);
  if (etaMatch) {
    info.eta = etaMatch[1];
  }

  // Extract file size
  const sizeMatch = message.match(/of\s+([\d.]+)\s*([KMGT]?i?B)/i);
  if (sizeMatch) {
    info.size = `${sizeMatch[1]} ${sizeMatch[2]}`;
  }

  return info;
}

/**
 * Build yt-dlp arguments for conversion
 * @param {Object} options - Conversion options
 * @returns {string[]} Arguments array
 */
function buildYtDlpArgs(options) {
  const { outputTemplate, mode, format, quality, playlistMode, selectedVideos, ffmpegPath } =
    options;

  const args = [
    '--embed-metadata',
    '--ffmpeg-location',
    path.dirname(ffmpegPath),
    '--output',
    outputTemplate,
  ];

  // Clip/trim: download only a portion of the video
  if (
    options.startTime != null &&
    options.startTime !== '' &&
    options.endTime != null &&
    options.endTime !== ''
  ) {
    const startFormatted = formatTimeForYtDlp(options.startTime);
    const endFormatted = formatTimeForYtDlp(options.endTime);
    if (startFormatted != null && endFormatted != null) {
      args.push('--download-sections', `*${startFormatted}-${endFormatted}`);
    }
  }

  // Add playlist option based on mode
  if (playlistMode === 'full') {
    args.push('--yes-playlist');
  } else if (playlistMode === 'selected' && selectedVideos && selectedVideos.length > 0) {
    const playlistItems = selectedVideos.sort((a, b) => a - b).join(',');
    args.push('--playlist-items', playlistItems);
    args.push('--yes-playlist');
  } else {
    args.push('--no-playlist');
  }

  if (mode === 'audio') {
    args.push('-x');
    args.push('--audio-format', format);

    const audioSettings = AUDIO_QUALITY_MAP[quality] || AUDIO_QUALITY_MAP['best'];
    args.push('--audio-quality', audioSettings.quality);

    if (audioSettings.bitrate && quality !== 'best') {
      args.push('--postprocessor-args', `ffmpeg:-b:a ${audioSettings.bitrate}`);
    }

    if (!options.customMetadata || !options.customMetadata.thumbnail) {
      args.push('--embed-thumbnail');
    }
  } else {
    const heightLimit = VIDEO_HEIGHT_MAP[quality];
    const audioBitrate = AUDIO_BITRATE_MAP[quality] || '192k';

    let formatSelector;
    if (heightLimit) {
      formatSelector = `bestvideo[height<=${heightLimit}]+bestaudio/best[height<=${heightLimit}]/best`;
    } else {
      formatSelector = 'bestvideo+bestaudio/best';
    }

    if (format === 'mp4') {
      if (heightLimit) {
        formatSelector = `bestvideo[height<=${heightLimit}]+bestaudio[acodec!=opus]/bestvideo[height<=${heightLimit}]+bestaudio/best[height<=${heightLimit}]/best`;
      } else {
        formatSelector = 'bestvideo+bestaudio[acodec!=opus]/bestvideo+bestaudio/best';
      }
      args.push('-f', formatSelector);
      args.push('--merge-output-format', 'mp4');
      args.push('--postprocessor-args', `ffmpeg:-c:a aac -b:a ${audioBitrate}`);
    } else if (format === 'webm') {
      args.push('-f', formatSelector);
      args.push('--merge-output-format', 'webm');
      if (quality !== 'best') {
        args.push('--postprocessor-args', `ffmpeg:-b:a ${audioBitrate}`);
      }
    } else {
      args.push('-f', formatSelector);
      args.push('--merge-output-format', format);
      if (format === 'mov') {
        args.push('--postprocessor-args', `ffmpeg:-c:a aac -b:a ${audioBitrate}`);
      } else if (quality !== 'best') {
        args.push('--postprocessor-args', `ffmpeg:-b:a ${audioBitrate}`);
      }
    }
  }

  return args;
}

/**
 * Cancel current conversion
 */
function cancelConversion() {
  conversionCancelled = true;
  if (currentConversionProcess) {
    if (process.platform === 'win32') {
      spawn('taskkill', ['/pid', currentConversionProcess.pid.toString(), '/f', '/t']);
    } else {
      try {
        process.kill(-currentConversionProcess.pid, 'SIGTERM');
      } catch (e) {
        currentConversionProcess.kill('SIGTERM');
      }
    }
    currentConversionProcess = null;
    sendProgress({ type: 'cancelled', message: 'Conversion cancelled' });
    return { success: true, cancelled: true };
  }
  return { success: false, message: 'No conversion in progress' };
}

/**
 * Run conversion process
 * @param {string} url - URL to convert
 * @param {Object} options - Conversion options
 * @returns {Promise<Object>} Conversion result
 */
async function convert(url, options = {}) {
  conversionCancelled = false;

  // Cancel any existing conversion
  if (currentConversionProcess) {
    currentConversionProcess.kill();
    currentConversionProcess = null;
  }

  // Check FFmpeg availability
  const ffmpegAvailable = await checkFfmpegAvailable();
  if (!ffmpegAvailable) {
    throw new Error(getFfmpegUnavailableError());
  }

  // Sanitize URL
  const sanitizedUrl = sanitizeUrl(url);

  // Extract options
  const mode = options.mode || 'audio';
  const format = options.format || 'mp3';
  const quality = options.quality || 'best';
  const playlistMode = options.playlistMode || 'single';
  const selectedChapters = options.chapters || null;
  const chapterDownloadMode = options.chapterDownloadMode || 'split';
  const selectedVideos = options.selectedVideos || null;
  const manualSegments = options.manualSegments || null;
  const useSharedArtistForSegments = options.useSharedArtistForSegments !== false;
  const customMetadata = options.customMetadata || null;
  const outputFolder = options.outputFolder || path.join(os.homedir(), 'Downloads');

  // Check and create output folder
  try {
    if (!fs.existsSync(outputFolder)) {
      fs.mkdirSync(outputFolder, { recursive: true });
    }
    const testFile = path.join(outputFolder, '.write-test');
    fs.writeFileSync(testFile, 'test');
    fs.unlinkSync(testFile);
  } catch (folderError) {
    if (folderError.message.includes('permission')) {
      throw folderError;
    }
    throw new Error(
      `Failed to access output folder: ${folderError.message}\n\nPlease choose a different folder.`
    );
  }

  const fileExtension = getFormatExtension(format, mode);
  const ffmpegPath = getFfmpegPath();
  const ytDlpPath = getYtDlpPath();

  // Determine if this is a manual segment download
  const isManualSegmentDownload =
    manualSegments && Array.isArray(manualSegments) && manualSegments.length > 0;

  // Build output template
  let outputTemplate;
  if (playlistMode === 'full') {
    if (fileExtension) {
      outputTemplate = path.join(outputFolder, '%(playlist_title)s', `%(title)s.${fileExtension}`);
    } else {
      outputTemplate = path.join(outputFolder, '%(playlist_title)s', '%(title)s.%(ext)s');
    }
  } else if (isManualSegmentDownload) {
    if (fileExtension) {
      outputTemplate = path.join(outputFolder, `%(title)s.full-temp.${fileExtension}`);
    } else {
      outputTemplate = path.join(outputFolder, '%(title)s.full-temp.%(ext)s');
    }
  } else {
    outputTemplate = fileExtension
      ? path.join(outputFolder, `%(title)s.temp.${fileExtension}`)
      : path.join(outputFolder, '%(title)s.temp.%(ext)s');
  }

  // Build yt-dlp arguments
  const startTime = options.startTime ?? null;
  const endTime = options.endTime ?? null;
  const args = buildYtDlpArgs({
    outputTemplate,
    mode,
    format,
    quality,
    playlistMode,
    selectedVideos,
    ffmpegPath,
    customMetadata,
    startTime,
    endTime,
  });

  args.push(sanitizedUrl);

  // Spawn yt-dlp process
  const spawnOptions = {
    cwd: outputFolder,
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: process.platform !== 'win32',
  };

  currentConversionProcess = spawn(ytDlpPath, args, spawnOptions);

  let errorOutput = '';
  let lastProgressPercent = 0;
  let playlistProgress = null;

  // Handle stdout
  currentConversionProcess.stdout.on('data', (data) => {
    const message = data.toString();
    const lines = message.split('\n').filter((line) => line.trim());

    for (const line of lines) {
      const progressPercent = parseProgress(line);
      const progressInfo = parseProgressInfo(line, playlistMode, playlistProgress);

      if (progressInfo.playlistInfo) {
        playlistProgress = progressInfo.playlistInfo;
      }

      if (progressPercent !== null) {
        lastProgressPercent = progressPercent;
        let finalPercent = progressPercent;

        if ((playlistMode === 'full' || playlistMode === 'selected') && progressInfo.playlistInfo) {
          const { current, total } = progressInfo.playlistInfo;
          const effectiveTotal =
            playlistMode === 'selected' && selectedVideos && selectedVideos.length > 0
              ? selectedVideos.length
              : total;
          const completedVideos = current - 1;
          const overallProgress =
            (completedVideos / effectiveTotal) * 100 +
            (progressPercent / 100 / effectiveTotal) * 100;
          finalPercent = Math.min(overallProgress, 100);
        }

        sendProgress({
          type:
            playlistMode === 'full' || playlistMode === 'selected'
              ? 'playlist-progress'
              : 'progress',
          percent: finalPercent,
          videoPercent: progressPercent,
          speed: progressInfo.speed,
          eta: progressInfo.eta,
          size: progressInfo.size,
          playlistInfo: progressInfo.playlistInfo || null,
          message: line.trim(),
        });
      } else {
        sendProgress({ type: 'info', message: line.trim() });
      }
    }
  });

  // Handle stderr
  currentConversionProcess.stderr.on('data', (data) => {
    const message = data.toString();
    errorOutput += message;
    const lines = message.split('\n').filter((line) => line.trim());

    for (const line of lines) {
      const progressPercent = parseProgress(line);
      const progressInfo = parseProgressInfo(line, playlistMode, playlistProgress);

      if (progressInfo.playlistInfo) {
        playlistProgress = progressInfo.playlistInfo;
      }

      if (progressPercent !== null) {
        lastProgressPercent = progressPercent;
        let finalPercent = progressPercent;

        if (playlistMode === 'full' && progressInfo.playlistInfo) {
          const { current, total } = progressInfo.playlistInfo;
          const completedVideos = current - 1;
          const overallProgress =
            (completedVideos / total) * 100 + (progressPercent / 100 / total) * 100;
          finalPercent = Math.min(overallProgress, 100);
        }

        sendProgress({
          type: playlistMode === 'full' ? 'playlist-progress' : 'progress',
          percent: finalPercent,
          videoPercent: progressPercent,
          speed: progressInfo.speed,
          eta: progressInfo.eta,
          size: progressInfo.size,
          playlistInfo: progressInfo.playlistInfo || null,
          message: line.trim(),
        });
      } else {
        sendProgress({ type: 'status', message: line.trim() });
      }
    }
  });

  // Set timeout
  const CONVERSION_TIMEOUT =
    playlistMode === 'full'
      ? 120 * 60 * 1000
      : isManualSegmentDownload
        ? 60 * 60 * 1000
        : 30 * 60 * 1000;

  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      if (currentConversionProcess) {
        currentConversionProcess.kill();
        currentConversionProcess = null;
        reject(new Error('Conversion timed out. Please try again.'));
      }
    }, CONVERSION_TIMEOUT);

    currentConversionProcess.on('close', async (code) => {
      clearTimeout(timeoutId);
      const proc = currentConversionProcess;
      currentConversionProcess = null;

      if (conversionCancelled) {
        reject(new Error('Conversion was cancelled'));
        return;
      }

      if (code === 0) {
        try {
          // Handle manual segment download
          if (isManualSegmentDownload) {
            const result = await handleManualSegments(
              outputFolder,
              sanitizedUrl,
              manualSegments,
              mode,
              format,
              fileExtension,
              customMetadata,
              useSharedArtistForSegments
            );
            resolve(result);
            return;
          }

          // Handle single file
          const result = await handleSingleFileResult(
            outputFolder,
            sanitizedUrl,
            mode,
            format,
            fileExtension,
            customMetadata,
            playlistMode
          );
          resolve(result);
        } catch (error) {
          reject(error);
        }
      } else {
        reject(new Error(errorOutput || 'Conversion failed'));
      }
    });

    currentConversionProcess.on('error', (err) => {
      clearTimeout(timeoutId);
      currentConversionProcess = null;
      reject(err);
    });
  });
}

/**
 * Handle manual segment splitting
 */
async function handleManualSegments(
  outputFolder,
  url,
  segments,
  mode,
  format,
  fileExtension,
  customMetadata,
  useSharedArtist
) {
  const ffmpegPath = getFfmpegPath();

  // Find the downloaded temp file
  const files = fs.readdirSync(outputFolder);
  const tempFile = files.find((f) => f.includes('.full-temp.'));

  if (!tempFile) {
    throw new Error('Downloaded file not found for segment splitting');
  }

  const tempFilePath = path.join(outputFolder, tempFile);
  const videoTitle = tempFile.replace(/\.full-temp\.[^.]+$/, '');
  const albumName =
    customMetadata?.segmentMetadata?.albumMetadata?.album ||
    customMetadata?.metadata?.album ||
    videoTitle;
  const sanitizedAlbumName = sanitizeFolderName(albumName);
  const segmentFolder = path.join(outputFolder, sanitizedAlbumName);

  if (!fs.existsSync(segmentFolder)) {
    fs.mkdirSync(segmentFolder, { recursive: true });
  }

  const createdFiles = [];
  const totalSegments = segments.length;

  for (let i = 0; i < segments.length; i++) {
    if (conversionCancelled) {
      throw new Error('Conversion was cancelled');
    }

    const segment = segments[i];
    const customTitle = customMetadata?.segmentMetadata?.perSegmentMetadata?.[i]?.title;
    const segmentTitle =
      sanitizeFileName(customTitle) || sanitizeFileName(segment.title) || `Track ${i + 1}`;
    const sanitizedTitle = sanitizeFolderName(segmentTitle);
    const ext = fileExtension || 'mp3';
    const segmentFilePath = path.join(segmentFolder, `${sanitizedTitle}.${ext}`);

    // Get start and end times in seconds
    const startSeconds = parseTimeToSeconds(segment.startTime);
    const endSeconds = parseTimeToSeconds(segment.endTime);

    if (startSeconds === null || endSeconds === null) {
      continue;
    }

    // Build segment metadata
    const segmentMetadata = {
      title: segmentTitle,
      artist: useSharedArtist
        ? customMetadata?.segmentMetadata?.albumMetadata?.artist || ''
        : segment.artist || '',
      album: albumName,
      albumArtist: customMetadata?.segmentMetadata?.albumMetadata?.albumArtist || '',
      genre: customMetadata?.segmentMetadata?.albumMetadata?.genre || '',
      year: customMetadata?.segmentMetadata?.albumMetadata?.year || '',
      trackNumber: (i + 1).toString(),
      totalTracks: totalSegments.toString(),
    };

    // Split the segment
    await splitAudioByTime(
      tempFilePath,
      segmentFilePath,
      startSeconds,
      endSeconds,
      segmentMetadata
    );

    // Apply full metadata if available
    if (customMetadata?.thumbnail) {
      await applyMetadataToFile(segmentFilePath, segmentMetadata, customMetadata.thumbnail);
    }

    createdFiles.push(segmentFilePath);

    // Report progress
    const progress = ((i + 1) / totalSegments) * 100;
    sendProgress({
      type: 'segment-progress',
      percent: progress,
      message: `Created segment ${i + 1} of ${totalSegments}: ${segmentTitle}`,
    });
  }

  // Delete temp file
  try {
    fs.unlinkSync(tempFilePath);
  } catch (e) {
    // Ignore
  }

  // Add to history
  addToHistory({
    url,
    fileName: sanitizedAlbumName,
    filePath: segmentFolder,
    format,
    mode,
    isSegments: true,
    fileCount: createdFiles.length,
  });

  showNotification(
    'Segment Download Complete',
    `${createdFiles.length} segment${createdFiles.length > 1 ? 's' : ''} saved to ${sanitizedAlbumName}`
  );

  return {
    success: true,
    isSegments: true,
    fileCount: createdFiles.length,
    segmentFolder,
    segmentFolderName: sanitizedAlbumName,
    segmentFiles: createdFiles,
  };
}

/**
 * Handle single file result
 */
async function handleSingleFileResult(
  outputFolder,
  url,
  mode,
  format,
  fileExtension,
  customMetadata,
  playlistMode
) {
  const files = fs.readdirSync(outputFolder);
  const extension = fileExtension || (mode === 'audio' ? 'mp3' : 'mp4');

  // Find the converted file
  const convertedFile = files.find((f) => f.includes('.temp.') && f.endsWith(`.${extension}`));

  if (!convertedFile) {
    throw new Error('Converted file not found');
  }

  const tempFilePath = path.join(outputFolder, convertedFile);
  const finalFileName = convertedFile.replace('.temp.', '.');
  const finalFilePath = getUniqueFilename(path.join(outputFolder, finalFileName));

  // Rename the file
  fs.renameSync(tempFilePath, finalFilePath);

  // Apply custom metadata if provided
  if (customMetadata && customMetadata.metadata) {
    await applyMetadataToFile(finalFilePath, customMetadata.metadata, customMetadata.thumbnail);
  }

  // Optionally rename to match custom metadata title
  let effectiveFilePath = finalFilePath;
  const customTitle = customMetadata?.metadata?.title;
  if (customTitle && typeof customTitle === 'string') {
    const sanitizedCustomTitle = sanitizeFileName(customTitle);
    if (sanitizedCustomTitle) {
      const ext = path.extname(finalFilePath);
      const currentBaseName = path.basename(finalFilePath, ext);
      if (sanitizedCustomTitle !== currentBaseName) {
        const newFilePath = getUniqueFilename(
          path.join(outputFolder, `${sanitizedCustomTitle}${ext}`)
        );
        fs.renameSync(finalFilePath, newFilePath);
        effectiveFilePath = newFilePath;
      }
    }
  }

  // Add to history
  addToHistory({
    url,
    fileName: path.basename(effectiveFilePath),
    filePath: effectiveFilePath,
    format,
    mode,
  });

  showNotification('Conversion Complete', `Saved to ${path.basename(effectiveFilePath)}`);

  return {
    success: true,
    fileName: path.basename(effectiveFilePath),
    filePath: effectiveFilePath,
  };
}

/**
 * Format time string for yt-dlp --download-sections (HH:MM:SS)
 * @param {string} timeStr - Time string (M:SS or H:MM:SS)
 * @returns {string|null}
 */
function formatTimeForYtDlp(timeStr) {
  if (!timeStr || typeof timeStr !== 'string') return null;
  const trimmed = timeStr.trim();
  if (!trimmed) return null;
  const parts = trimmed.split(':').map((p) => p.trim());
  if (parts.some((p) => !/^\d+$/.test(p))) return null;
  if (parts.length === 2) {
    return `0:${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}`;
  }
  if (parts.length === 3) {
    return `${parts[0]}:${parts[1].padStart(2, '0')}:${parts[2].padStart(2, '0')}`;
  }
  return null;
}

/**
 * Parse time string to seconds
 * @param {string} timeStr - Time string (MM:SS or H:MM:SS)
 * @returns {number|null}
 */
function parseTimeToSeconds(timeStr) {
  if (!timeStr || typeof timeStr !== 'string') return null;

  const trimmed = timeStr.trim();
  if (!trimmed) return null;

  // Try parsing as pure seconds
  if (/^\d{1,2}$/.test(trimmed)) {
    return parseInt(trimmed, 10);
  }

  const parts = trimmed.split(':').map((p) => parseFloat(p.trim()));

  if (parts.some(isNaN)) return null;

  if (parts.length === 2) {
    const [minutes, seconds] = parts;
    if (minutes < 0 || seconds < 0 || seconds >= 60) return null;
    return minutes * 60 + seconds;
  } else if (parts.length === 3) {
    const [hours, minutes, seconds] = parts;
    if (hours < 0 || minutes < 0 || minutes >= 60 || seconds < 0 || seconds >= 60) return null;
    return hours * 3600 + minutes * 60 + seconds;
  }

  return null;
}

/**
 * Convert local file to target format using FFmpeg
 * @param {string} filePath - Path to local file
 * @param {Object} options - Conversion options
 * @returns {Promise<Object>} Conversion result
 */
async function convertLocalFile(filePath, options = {}) {
  conversionCancelled = false;

  if (currentConversionProcess) {
    currentConversionProcess.kill();
    currentConversionProcess = null;
  }

  const ffmpegAvailable = await checkFfmpegAvailable();
  if (!ffmpegAvailable) {
    throw new Error(getFfmpegUnavailableError());
  }

  if (!filePath || !fs.existsSync(filePath)) {
    throw new Error('File not found or path is invalid');
  }

  const mode = options.mode || 'audio';
  const format = options.format || 'mp3';
  const quality = options.quality || 'best';
  const outputFolder = options.outputFolder || path.join(os.homedir(), 'Downloads');
  const startTime = parseTimeToSeconds(options.startTime);
  const endTime = parseTimeToSeconds(options.endTime);

  if (!fs.existsSync(outputFolder)) {
    fs.mkdirSync(outputFolder, { recursive: true });
  }

  const fileExtension = getFormatExtension(format, mode);
  const baseName = path.basename(filePath, path.extname(filePath));
  const outputFileName = `${sanitizeFileName(baseName)}.${fileExtension}`;
  const outputPath = getUniqueFilename(path.join(outputFolder, outputFileName));

  sendProgress({ type: 'progress', percent: 0, message: 'Converting local file...' });

  try {
    await ffmpegConvertLocalFile(
      filePath,
      outputPath,
      { mode, format, quality, startTime: startTime ?? undefined, endTime: endTime ?? undefined },
      (percent) => sendProgress({ type: 'progress', percent, message: `Converting... ${percent}%` })
    );
  } catch (err) {
    if (conversionCancelled) {
      throw new Error('Conversion was cancelled');
    }
    throw err;
  }

  currentConversionProcess = null;

  let effectiveFilePath = outputPath;

  if (options.customMetadata && options.customMetadata.metadata) {
    await applyMetadataToFile(
      outputPath,
      options.customMetadata.metadata,
      options.customMetadata.thumbnail ?? null
    );
  }

  const customTitle = options.customMetadata?.metadata?.title;
  if (customTitle && typeof customTitle === 'string') {
    const sanitizedCustomTitle = sanitizeFileName(customTitle);
    if (sanitizedCustomTitle) {
      const ext = path.extname(outputPath);
      const currentBaseName = path.basename(outputPath, ext);
      if (sanitizedCustomTitle !== currentBaseName) {
        const newFilePath = getUniqueFilename(
          path.join(outputFolder, `${sanitizedCustomTitle}${ext}`)
        );
        fs.renameSync(outputPath, newFilePath);
        effectiveFilePath = newFilePath;
      }
    }
  }

  addToHistory({
    url: `file://${filePath}`,
    fileName: path.basename(effectiveFilePath),
    filePath: effectiveFilePath,
    format,
    mode,
  });

  showNotification('Conversion Complete', `Saved to ${path.basename(effectiveFilePath)}`);

  return {
    success: true,
    fileName: path.basename(effectiveFilePath),
    filePath: effectiveFilePath,
  };
}

module.exports = {
  convert,
  convertLocalFile,
  cancelConversion,
  parseTimeToSeconds,
};
