/**
 * FFmpeg service - handles FFmpeg operations
 */
const { spawn, execFileSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const { getFfmpegPath } = require('../utils/paths');
const { encodeMetadataValue } = require('../utils/metadata');

/**
 * Resolve a binary name on PATH to an absolute path (no shell).
 * @param {string} cmd - e.g. ffmpeg or ffmpeg.exe
 * @returns {string|null}
 */
function resolveBinaryOnPath(cmd) {
  if (!cmd || cmd.includes(path.sep)) {
    return null;
  }
  try {
    if (process.platform === 'win32') {
      const out = execFileSync('where', [cmd], {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore'],
        windowsHide: true,
        timeout: 5000,
      });
      const line = out.trim().split(/\r?\n/)[0];
      return line ? line.trim() : null;
    }
    const out = execFileSync('which', [cmd], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
      timeout: 5000,
    });
    const line = out.trim().split('\n')[0];
    return line ? line.trim() : null;
  } catch {
    return null;
  }
}

/**
 * Check if FFmpeg is available
 * @returns {Promise<boolean>}
 */
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

      const testProc = spawn(normalizedPath, ['-version'], {
        stdio: ['ignore', 'pipe', 'pipe'],
        cwd: path.dirname(normalizedPath),
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

      // Timeout after 3 seconds
      setTimeout(() => {
        if (!testProc.killed) {
          testProc.kill();
          resolve(false);
        }
      }, 3000);
    } else {
      const resolved = resolveBinaryOnPath(ffmpegPath);
      if (!resolved || !fs.existsSync(path.normalize(resolved))) {
        resolve(false);
        return;
      }
      const normalizedPath = path.normalize(resolved);
      const testProc = spawn(normalizedPath, ['-version'], {
        stdio: ['ignore', 'pipe', 'pipe'],
        cwd: path.dirname(normalizedPath),
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

/**
 * Get FFmpeg unavailable error message
 * @returns {string}
 */
function getFfmpegUnavailableError() {
  const platform = process.platform;
  let errorMessage = 'FFmpeg is not available. ';

  if (platform === 'win32') {
    errorMessage +=
      'Please ensure ffmpeg.exe is bundled in the bin/ folder or available in system PATH.\n\n';
    errorMessage += 'To install FFmpeg:\n';
    errorMessage += '1. Download from https://ffmpeg.org/download.html\n';
    errorMessage += '2. Extract and place ffmpeg.exe in the bin/ folder\n';
    errorMessage += 'Or add FFmpeg to your system PATH';
  } else {
    errorMessage +=
      'Please ensure bin/ffmpeg is present (run npm run postinstall) or install FFmpeg on your system.\n\n';
    errorMessage += 'To install FFmpeg:\n';
    errorMessage += '• macOS: brew install ffmpeg\n';
    errorMessage += '• Ubuntu/Debian: sudo apt install ffmpeg\n';
    errorMessage += '• Fedora: sudo dnf install ffmpeg\n';
    errorMessage += 'Visit https://ffmpeg.org/download.html for more information';
  }

  return errorMessage;
}

/**
 * Run FFmpeg command with metadata
 * @param {string} inputPath - Input file path
 * @param {string} outputPath - Output file path
 * @param {string[]} extraArgs - Additional FFmpeg arguments
 * @returns {Promise<void>}
 */
async function runFfmpegCommand(inputPath, outputPath, extraArgs = []) {
  const ffmpegPath = getFfmpegPath();
  const args = ['-i', inputPath, '-c', 'copy', ...extraArgs, outputPath];

  return new Promise((resolve, reject) => {
    const ffmpegProc = spawn(ffmpegPath, args, { stdio: 'ignore' });

    ffmpegProc.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`FFmpeg failed with code ${code}`));
      }
    });

    ffmpegProc.on('error', reject);
  });
}

/**
 * Build metadata arguments for FFmpeg
 * @param {Object} metadata - Metadata object
 * @returns {string[]} FFmpeg arguments
 */
function buildMetadataArgs(metadata) {
  const args = [];

  if (metadata.title) args.push('-metadata', `title=${encodeMetadataValue(metadata.title)}`);
  if (metadata.artist) args.push('-metadata', `artist=${encodeMetadataValue(metadata.artist)}`);
  if (metadata.album) args.push('-metadata', `album=${encodeMetadataValue(metadata.album)}`);
  if (metadata.albumArtist)
    args.push('-metadata', `album_artist=${encodeMetadataValue(metadata.albumArtist)}`);
  if (metadata.genre) args.push('-metadata', `genre=${encodeMetadataValue(metadata.genre)}`);
  if (metadata.year) args.push('-metadata', `date=${encodeMetadataValue(metadata.year)}`);
  if (metadata.trackNumber) {
    const trackMeta = metadata.totalTracks
      ? `${metadata.trackNumber}/${metadata.totalTracks}`
      : metadata.trackNumber;
    args.push('-metadata', `track=${encodeMetadataValue(trackMeta)}`);
  }
  if (metadata.composer)
    args.push('-metadata', `composer=${encodeMetadataValue(metadata.composer)}`);
  if (metadata.publisher)
    args.push('-metadata', `publisher=${encodeMetadataValue(metadata.publisher)}`);
  if (metadata.comment || metadata.description) {
    const commentValue = encodeMetadataValue(metadata.comment || metadata.description);
    args.push('-metadata', `comment=${commentValue}`);
  }
  if (metadata.copyright)
    args.push('-metadata', `copyright=${encodeMetadataValue(metadata.copyright)}`);
  if (metadata.bpm) args.push('-metadata', `TBPM=${encodeMetadataValue(metadata.bpm)}`);

  return args;
}

/**
 * Split audio file by time range
 * @param {string} inputPath - Input file path
 * @param {string} outputPath - Output file path
 * @param {number} startTime - Start time in seconds
 * @param {number} endTime - End time in seconds
 * @param {Object} [metadata] - Optional metadata
 * @returns {Promise<void>}
 */
async function splitAudioByTime(inputPath, outputPath, startTime, endTime, metadata = null) {
  const ffmpegPath = getFfmpegPath();
  const args = [
    '-i',
    inputPath,
    '-ss',
    startTime.toString(),
    '-to',
    endTime.toString(),
    '-c',
    'copy',
  ];

  if (metadata) {
    args.push(...buildMetadataArgs(metadata));
  }

  args.push('-y', outputPath);

  return new Promise((resolve, reject) => {
    const ffmpegProc = spawn(ffmpegPath, args, { stdio: 'ignore' });

    ffmpegProc.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`FFmpeg split failed with code ${code}`));
      }
    });

    ffmpegProc.on('error', reject);
  });
}

/**
 * Convert local file to target format using FFmpeg
 * @param {string} inputPath - Input file path
 * @param {string} outputPath - Output file path
 * @param {Object} options - { mode, format, quality, startTime?, endTime? }
 * @param {Function} onProgress - Progress callback (percent 0-100)
 * @returns {Promise<void>}
 */
async function convertLocalFile(inputPath, outputPath, options = {}, onProgress = null) {
  const ffmpegPath = getFfmpegPath();
  const { mode = 'audio', format = 'mp3', quality = 'best', startTime, endTime } = options;

  const bitrate =
    quality === 'best'
      ? '192k'
      : quality === 'high'
        ? '192k'
        : quality === 'medium'
          ? '128k'
          : '96k';
  const args = ['-y', '-i', inputPath];

  if (startTime != null) {
    args.push('-ss', String(startTime));
  }
  if (endTime != null) {
    args.push('-to', String(endTime));
  }

  if (mode === 'audio') {
    args.push('-vn');
    if (format === 'mp3') {
      args.push(
        '-acodec',
        'libmp3lame',
        '-q:a',
        quality === 'best' ? '0' : quality === 'high' ? '2' : quality === 'medium' ? '5' : '9'
      );
    } else if (format === 'm4a' || format === 'aac') {
      args.push('-acodec', 'aac', '-b:a', bitrate);
    } else if (format === 'flac') {
      args.push('-acodec', 'flac');
    } else if (format === 'wav') {
      args.push('-acodec', 'pcm_s16le');
    } else if (format === 'opus') {
      args.push('-acodec', 'libopus', '-b:a', bitrate);
    } else if (format === 'vorbis') {
      args.push('-acodec', 'libvorbis', '-q:a', quality === 'best' ? '10' : '5');
    } else if (format === 'alac') {
      args.push('-acodec', 'alac');
    } else {
      args.push('-acodec', 'libmp3lame', '-b:a', bitrate);
    }
  } else {
    const height =
      quality === 'best' ? null : quality === 'high' ? 1080 : quality === 'medium' ? 720 : 480;
    args.push('-c:v', 'libx264', '-preset', 'medium', '-crf', '23');
    if (height) args.push('-vf', `scale=-2:min(${height},ih)`);
    args.push('-c:a', 'aac', '-b:a', bitrate);
  }

  args.push(outputPath);

  const onProcessSpawn = options.onProcessSpawn;

  return new Promise((resolve, reject) => {
    const ffmpegProc = spawn(ffmpegPath, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    if (onProcessSpawn) onProcessSpawn(ffmpegProc);
    let lastPercent = 0;

    const reportProgress = (p) => {
      if (onProgress && p !== lastPercent) {
        lastPercent = p;
        onProgress(p);
      }
    };

    ffmpegProc.stderr.on('data', (data) => {
      const str = data.toString();
      const timeMatch = str.match(/time=(\d{2}):(\d{2}):(\d{2})\.(\d{2})/);
      if (timeMatch && onProgress) {
        const h = parseInt(timeMatch[1], 10);
        const m = parseInt(timeMatch[2], 10);
        const s = parseInt(timeMatch[3], 10);
        const cs = parseInt(timeMatch[4], 10);
        const elapsed = h * 3600 + m * 60 + s + cs / 100;
        reportProgress(Math.min(95, Math.floor((elapsed / 300) * 100)));
      }
    });

    ffmpegProc.on('close', (code) => {
      if (code === 0) {
        reportProgress(100);
        resolve();
      } else {
        reject(new Error(`FFmpeg conversion failed with code ${code}`));
      }
    });

    ffmpegProc.on('error', reject);
  });
}

module.exports = {
  checkFfmpegAvailable,
  getFfmpegUnavailableError,
  runFfmpegCommand,
  buildMetadataArgs,
  splitAudioByTime,
  convertLocalFile,
};
