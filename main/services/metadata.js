/**
 * Metadata service - handles file metadata operations
 */
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');
const https = require('https');
const http = require('http');
const urlModule = require('url');
const NodeID3 = require('node-id3');
const { getFfmpegPath } = require('../utils/paths');
const { encodeMetadataValue } = require('../utils/metadata');

/**
 * Detect MIME type from buffer signature
 * @param {Buffer} buffer - Image buffer
 * @returns {string} MIME type
 */
function detectMimeType(buffer) {
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) {
    return 'image/png';
  } else if (buffer[0] === 0xff && buffer[1] === 0xd8) {
    return 'image/jpeg';
  } else if (buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46) {
    return 'image/webp';
  }
  return 'image/jpeg'; // default
}

/**
 * Fetch image buffer from URL or data URL
 * @param {string} imageUrl - Image URL or data URL
 * @returns {Promise<Buffer|null>}
 */
async function fetchThumbnailBuffer(imageUrl) {
  if (!imageUrl) return null;

  // Check if it's a data URL
  if (imageUrl.startsWith('data:image/')) {
    const base64Data = imageUrl.replace(/^data:image\/\w+;base64,/, '');
    try {
      return Buffer.from(base64Data, 'base64');
    } catch (e) {
      return null;
    }
  }

  // It's a regular URL, need to fetch
  try {
    const parsedUrl = urlModule.parse(imageUrl);
    const client = parsedUrl.protocol === 'https:' ? https : http;

    return new Promise((resolve, reject) => {
      const req = client.get(imageUrl, (res) => {
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
    return null;
  }
}

/**
 * Apply metadata to MP3 file using node-id3
 * @param {string} filePath - File path
 * @param {Object} metadata - Metadata object
 * @param {Buffer|null} thumbnailBuffer - Thumbnail buffer
 * @returns {boolean} Success status
 */
function applyMetadataToMp3(filePath, metadata, thumbnailBuffer) {
  const tags = {
    title: encodeMetadataValue(metadata.title || ''),
    artist: encodeMetadataValue(metadata.artist || ''),
    album: encodeMetadataValue(metadata.album || ''),
    performerInfo: encodeMetadataValue(metadata.albumArtist || ''),
    genre: encodeMetadataValue(metadata.genre || ''),
    year: encodeMetadataValue(metadata.year || ''),
    trackNumber: encodeMetadataValue(metadata.trackNumber || ''),
    composer: encodeMetadataValue(metadata.composer || ''),
    publisher: encodeMetadataValue(metadata.publisher || ''),
    comment: {
      language: metadata.language || 'eng',
      text: encodeMetadataValue(metadata.comment || metadata.description || ''),
    },
    copyright: encodeMetadataValue(metadata.copyright || ''),
    bpm: metadata.bpm ? parseInt(metadata.bpm, 10) : undefined,
  };

  // Add thumbnail if provided
  if (thumbnailBuffer) {
    const mimeType = detectMimeType(thumbnailBuffer);
    tags.image = {
      mime: mimeType,
      type: { id: 3, name: 'front cover' },
      description: 'Cover',
      imageBuffer: thumbnailBuffer,
    };
  }

  // Remove undefined values
  Object.keys(tags).forEach((key) => {
    if (tags[key] === undefined || tags[key] === '') {
      delete tags[key];
    }
  });

  return NodeID3.write(tags, filePath);
}

/**
 * Apply metadata to file using FFmpeg
 * @param {string} filePath - File path
 * @param {Object} metadata - Metadata object
 * @param {Buffer|null} thumbnailBuffer - Thumbnail buffer
 * @returns {Promise<void>}
 */
async function applyMetadataWithFfmpeg(filePath, metadata, thumbnailBuffer) {
  const ffmpegPath = getFfmpegPath();
  const ext = path.extname(filePath).toLowerCase();
  const args = ['-i', filePath, '-c', 'copy'];

  // Add metadata
  if (metadata.title) args.push('-metadata', `title=${encodeMetadataValue(metadata.title)}`);
  if (metadata.artist) args.push('-metadata', `artist=${encodeMetadataValue(metadata.artist)}`);
  if (metadata.album) args.push('-metadata', `album=${encodeMetadataValue(metadata.album)}`);
  if (metadata.albumArtist) args.push('-metadata', `album_artist=${encodeMetadataValue(metadata.albumArtist)}`);
  if (metadata.genre) args.push('-metadata', `genre=${encodeMetadataValue(metadata.genre)}`);
  if (metadata.year) args.push('-metadata', `date=${encodeMetadataValue(metadata.year)}`);
  if (metadata.trackNumber) {
    const trackMeta = metadata.totalTracks
      ? `${metadata.trackNumber}/${metadata.totalTracks}`
      : metadata.trackNumber;
    args.push('-metadata', `track=${encodeMetadataValue(trackMeta)}`);
  }
  if (metadata.composer) args.push('-metadata', `composer=${encodeMetadataValue(metadata.composer)}`);
  if (metadata.publisher) args.push('-metadata', `publisher=${encodeMetadataValue(metadata.publisher)}`);
  if (metadata.comment || metadata.description) {
    const commentValue = encodeMetadataValue(metadata.comment || metadata.description);
    args.push('-metadata', `comment=${commentValue}`);
  }
  if (metadata.copyright) args.push('-metadata', `copyright=${encodeMetadataValue(metadata.copyright)}`);
  if (metadata.bpm) args.push('-metadata', `TBPM=${encodeMetadataValue(metadata.bpm)}`);

  const outputPath = filePath.replace(ext, `.temp${ext}`);

  // Add thumbnail if provided
  if (thumbnailBuffer) {
    const tempThumbnailPath = path.join(os.tmpdir(), `thumb_${Date.now()}.jpg`);
    fs.writeFileSync(tempThumbnailPath, thumbnailBuffer);
    args.push('-i', tempThumbnailPath, '-map', '0', '-map', '1', '-c', 'copy', '-c:v:1', 'mjpeg', '-disposition:v:1', 'attached_pic');
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
}

/**
 * Apply metadata to a file
 * @param {string} filePath - File path
 * @param {Object} metadata - Metadata object
 * @param {string|null} thumbnailDataUrl - Thumbnail data URL or URL
 * @returns {Promise<{success: boolean, error?: string}>}
 */
async function applyMetadataToFile(filePath, metadata, thumbnailDataUrl) {
  try {
    const ext = path.extname(filePath).toLowerCase();
    const thumbnailBuffer = await fetchThumbnailBuffer(thumbnailDataUrl);

    if (ext === '.mp3') {
      const success = applyMetadataToMp3(filePath, metadata, thumbnailBuffer);
      if (!success) {
        throw new Error('Failed to write ID3 tags');
      }
    } else {
      await applyMetadataWithFfmpeg(filePath, metadata, thumbnailBuffer);
    }

    return { success: true };
  } catch (error) {
    console.error('Failed to apply metadata:', error);
    return { success: false, error: error.message };
  }
}

module.exports = {
  applyMetadataToFile,
  fetchThumbnailBuffer,
  detectMimeType,
};
