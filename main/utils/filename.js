/**
 * Filename utilities
 */
const path = require('path');
const fs = require('fs');

/**
 * Format to extension mapping
 * @param {string} format - The format name
 * @param {string} mode - 'audio' or 'video'
 * @returns {string|null} File extension or null
 */
function getFormatExtension(format, mode) {
  const formatMap = {
    // Audio formats
    mp3: 'mp3',
    m4a: 'm4a',
    flac: 'flac',
    wav: 'wav',
    aac: 'aac',
    opus: 'opus',
    vorbis: 'ogg',
    alac: 'm4a',
    best: null, // yt-dlp will choose the best format
    // Video formats
    mp4: 'mp4',
    mkv: 'mkv',
    webm: 'webm',
    mov: 'mov',
    avi: 'avi',
    flv: 'flv',
    gif: 'gif',
  };

  const extension = formatMap[format];
  if (extension) {
    return extension;
  }

  // Default fallback based on mode
  return mode === 'audio' ? 'mp3' : 'mp4';
}

/**
 * Generate unique filename by adding number suffix if file exists
 * @param {string} filePath - The original file path
 * @returns {string} A unique file path
 */
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

/**
 * Sanitize folder name for filesystem
 * @param {string} name - The folder name to sanitize
 * @returns {string} Sanitized folder name
 */
function sanitizeFolderName(name) {
  // Remove invalid characters for folder names
  return name.replace(/[<>:"/\\|?*]/g, '_').trim();
}

/**
 * Sanitize filename for filesystem
 * @param {string} name - The filename to sanitize
 * @returns {string} Sanitized filename, or empty string if invalid
 */
function sanitizeFileName(name) {
  if (!name || typeof name !== 'string') return '';
  return name.replace(/[<>:"/\\|?*]/g, '_').trim() || '';
}

module.exports = {
  getFormatExtension,
  getUniqueFilename,
  sanitizeFolderName,
  sanitizeFileName,
};
