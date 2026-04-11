/**
 * Batch local files: enumerate, read metadata, apply metadata, convert
 */
const path = require('path');
const fs = require('fs');
const os = require('os');
const { getUniqueFilename, sanitizeFileName } = require('../utils/filename');
const { getMainWindow } = require('../window');
const { applyMetadataToFile } = require('./metadata');
const conversionService = require('./conversion');

const { allMedia: MEDIA_INPUT_EXTENSIONS } = require('../../shared/media-input-extensions.json');
const MEDIA_EXTENSIONS = new Set(MEDIA_INPUT_EXTENSIONS.map((ext) => `.${ext}`));

const DEFAULT_MAX_FILES = 3000;
const DEFAULT_MAX_DEPTH = 32;
const MAX_ART_PREVIEW_BYTES = 200000;
const READ_METADATA_CONCURRENCY = 6;

const METADATA_KEYS = [
  'title',
  'artist',
  'album',
  'albumArtist',
  'genre',
  'year',
  'trackNumber',
  'totalTracks',
  'composer',
  'publisher',
  'comment',
  'description',
  'language',
  'bpm',
  'copyright',
];

let batchJobCancelled = false;

/** music-metadata is ESM-only; load via dynamic import from this CJS file */
let musicMetadataLoadPromise = null;
function loadMusicMetadata() {
  if (!musicMetadataLoadPromise) {
    musicMetadataLoadPromise = import('music-metadata');
  }
  return musicMetadataLoadPromise;
}

function resetBatchCancel() {
  batchJobCancelled = false;
}

function cancelBatchJob() {
  batchJobCancelled = true;
}

function isBatchCancelled() {
  return batchJobCancelled;
}

function sendBatchProgress(payload) {
  const win = getMainWindow();
  if (win?.webContents) {
    win.webContents.send('batch-job-progress', payload);
  }
}

function isMediaFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return MEDIA_EXTENSIONS.has(ext);
}

function collectFromDirectory(dirPath, maxFiles, maxDepth, depth, acc, seen) {
  if (acc.length >= maxFiles || depth > maxDepth) return;
  let entries;
  try {
    entries = fs.readdirSync(dirPath, { withFileTypes: true });
  } catch {
    return;
  }
  for (const ent of entries) {
    if (acc.length >= maxFiles) return;
    if (ent.name.startsWith('.')) continue;
    const full = path.join(dirPath, ent.name);
    if (ent.isDirectory()) {
      collectFromDirectory(full, maxFiles, maxDepth, depth + 1, acc, seen);
    } else if (ent.isFile() && isMediaFile(full)) {
      const norm = path.normalize(full);
      if (!seen.has(norm)) {
        seen.add(norm);
        acc.push(norm);
      }
    }
  }
}

function enumeratePaths(inputPaths, options = {}) {
  const maxFiles = options.maxFiles ?? DEFAULT_MAX_FILES;
  const maxDepth = options.maxDepth ?? DEFAULT_MAX_DEPTH;
  const acc = [];
  const seen = new Set();

  for (const raw of inputPaths) {
    if (!raw || typeof raw !== 'string') continue;
    const p = path.normalize(raw);
    if (!fs.existsSync(p)) continue;

    let st;
    try {
      st = fs.statSync(p);
    } catch {
      continue;
    }

    if (st.isFile()) {
      if (isMediaFile(p) && !seen.has(p)) {
        seen.add(p);
        acc.push(p);
      }
    } else if (st.isDirectory()) {
      collectFromDirectory(p, maxFiles, maxDepth, 0, acc, seen);
    }

    if (acc.length >= maxFiles) break;
  }

  acc.sort((a, b) => a.localeCompare(b));
  return {
    paths: acc.slice(0, maxFiles),
    truncated: acc.length >= maxFiles,
  };
}

function joinArtists(val) {
  if (val == null) return '';
  if (Array.isArray(val)) return val.filter(Boolean).join('; ');
  return String(val);
}

async function readAudioMetadata(filePath) {
  const mm = await loadMusicMetadata();
  const meta = await mm.parseFile(filePath, { duration: false });
  const c = meta.common || {};
  let pictureDataUrl = null;
  let hasPicture = false;
  if (c.picture && c.picture.length > 0) {
    const pic = c.picture[0];
    const buf = Buffer.isBuffer(pic.data) ? pic.data : Buffer.from(pic.data || []);
    hasPicture = buf.length > 0;
    if (buf.length > 0 && buf.length <= MAX_ART_PREVIEW_BYTES) {
      const mime = pic.format || 'image/jpeg';
      pictureDataUrl = `data:${mime};base64,${buf.toString('base64')}`;
    }
  }

  const trackNo = c.track?.no != null ? String(c.track.no) : '';
  const trackOf = c.track?.of != null ? String(c.track.of) : '';

  const metadata = {
    title: c.title || '',
    artist: joinArtists(c.artist) || joinArtists(c.artists),
    album: c.album || '',
    albumArtist: joinArtists(c.albumartist),
    genre: joinArtists(c.genre),
    year: c.date ? String(c.date).slice(0, 4) : c.year != null ? String(c.year) : '',
    trackNumber: trackNo,
    totalTracks: trackOf,
    composer: joinArtists(c.composer),
    publisher: '',
    comment: '',
    description: '',
    language: c.language || 'eng',
    bpm: c.bpm != null ? String(c.bpm) : '',
    copyright: c.copyright || '',
  };

  return {
    success: true,
    metadata,
    pictureDataUrl,
    hasPicture,
  };
}

function buildMergedMetadata(existing, patch, strategy) {
  if (strategy === 'replace') {
    const out = {};
    for (const k of METADATA_KEYS) {
      out[k] = patch[k] != null ? patch[k] : '';
    }
    return out;
  }

  const out = { ...existing };
  for (const k of METADATA_KEYS) {
    if (Object.prototype.hasOwnProperty.call(patch, k)) {
      out[k] = patch[k];
    }
  }
  return out;
}

function overlayPerFileFields(baseMeta, partial) {
  if (!partial || typeof partial !== 'object') return baseMeta;
  const out = { ...baseMeta };
  for (const k of Object.keys(partial)) {
    if (METADATA_KEYS.includes(k) && Object.prototype.hasOwnProperty.call(partial, k)) {
      out[k] = partial[k];
    }
  }
  return out;
}

async function readOneMetadataForBatch(p) {
  if (!p || typeof p !== 'string') {
    return { path: p, success: false, error: 'Invalid path' };
  }
  if (!fs.existsSync(p)) {
    return { path: p, success: false, error: 'File not found' };
  }
  try {
    const data = await readAudioMetadata(p);
    return {
      path: p,
      success: true,
      metadata: data.metadata,
      pictureDataUrl: data.pictureDataUrl,
      hasPicture: data.hasPicture,
    };
  } catch (e) {
    return { path: p, success: false, error: e.message || 'Read failed' };
  }
}

async function readMetadataBatch(paths) {
  const list = Array.isArray(paths) ? paths : [];
  const results = [];
  for (let i = 0; i < list.length; i += READ_METADATA_CONCURRENCY) {
    const chunk = list.slice(i, i + READ_METADATA_CONCURRENCY);
    const chunkResults = await Promise.all(chunk.map((p) => readOneMetadataForBatch(p)));
    results.push(...chunkResults);
  }
  return { results };
}

async function applyMetadataBatch({
  paths,
  patch,
  perFilePatches,
  thumbnailDataUrl,
  strategy,
  renameToTrackTitle = false,
}) {
  resetBatchCancel();
  const results = [];
  const total = paths.length;
  const strat = strategy === 'replace' ? 'replace' : 'merge';
  const perFileMap =
    perFilePatches && typeof perFilePatches === 'object' && !Array.isArray(perFilePatches)
      ? perFilePatches
      : {};

  sendBatchProgress({
    type: 'batch-progress',
    phase: 'metadata',
    done: 0,
    total,
    currentPath: null,
  });

  for (let i = 0; i < paths.length; i++) {
    if (isBatchCancelled()) break;
    const p = paths[i];
    sendBatchProgress({
      type: 'batch-progress',
      phase: 'metadata',
      done: i,
      total,
      currentPath: p,
    });

    if (!p || !fs.existsSync(p)) {
      results.push({ path: p, success: false, error: 'File not found' });
      continue;
    }

    try {
      let existing = {};
      if (strat === 'merge') {
        try {
          const r = await readAudioMetadata(p);
          if (r.success) existing = r.metadata;
        } catch {
          existing = {};
        }
      }
      const sharedPatch = patch || {};
      const hasSharedKeys = Object.keys(sharedPatch).length > 0;
      let metaForWrite;
      if (strat === 'replace' && !hasSharedKeys) {
        try {
          const r = await readAudioMetadata(p);
          metaForWrite = r.success ? { ...r.metadata } : {};
        } catch {
          metaForWrite = {};
        }
      } else {
        metaForWrite = buildMergedMetadata(existing, sharedPatch, strat);
      }
      const pf = perFileMap[p];
      if (pf && typeof pf === 'object') {
        metaForWrite = overlayPerFileFields(metaForWrite, pf);
      }
      const thumb =
        thumbnailDataUrl === undefined || thumbnailDataUrl === ''
          ? null
          : thumbnailDataUrl;
      const res = await applyMetadataToFile(p, metaForWrite, thumb);
      if (!res.success) {
        results.push({
          path: p,
          success: false,
          error: res.error,
        });
        continue;
      }

      let newPath;
      if (renameToTrackTitle) {
        const titleRaw = metaForWrite.title != null ? String(metaForWrite.title) : '';
        const sanitized = sanitizeFileName(titleRaw.trim());
        const ext = path.extname(p);
        const currentBase = path.basename(p, ext);
        if (sanitized && sanitized !== currentBase) {
          const desired = path.join(path.dirname(p), `${sanitized}${ext}`);
          try {
            newPath = getUniqueFilename(desired);
            if (newPath !== p) {
              fs.renameSync(p, newPath);
            }
          } catch (renameErr) {
            results.push({
              path: p,
              success: false,
              error: renameErr.message || 'Rename failed',
            });
            continue;
          }
        }
      }

      results.push({
        path: p,
        success: true,
        ...(newPath && newPath !== p ? { newPath } : {}),
      });
    } catch (e) {
      results.push({
        path: p,
        success: false,
        error: e.message || 'Unknown error',
      });
    }
  }

  sendBatchProgress({
    type: 'batch-progress',
    phase: 'metadata',
    done: results.length,
    total,
    currentPath: null,
  });

  return { results, cancelled: isBatchCancelled() };
}

function dryRunLocalBatch(paths) {
  const results = [];
  for (const p of paths) {
    if (!p || typeof p !== 'string') {
      results.push({ path: p, ok: false, error: 'Invalid path' });
      continue;
    }
    if (!fs.existsSync(p)) {
      results.push({ path: p, ok: false, error: 'File not found' });
      continue;
    }
    try {
      fs.accessSync(p, fs.constants.R_OK | fs.constants.W_OK);
      results.push({ path: p, ok: true });
    } catch (e) {
      results.push({ path: p, ok: false, error: e.message || 'Access denied' });
    }
  }
  return { results };
}

async function convertLocalBatch(filePaths, options = {}) {
  resetBatchCancel();
  const results = [];
  const total = filePaths.length;
  sendBatchProgress({
    type: 'batch-progress',
    phase: 'convert',
    done: 0,
    total,
    currentPath: null,
  });

  const {
    outputFolder,
    mode,
    format,
    quality,
    metadataPatch,
    perFilePatches,
    thumbnailDataUrl,
    metadataStrategy,
    startTime,
    endTime,
  } = options;

  const strat = metadataStrategy === 'replace' ? 'replace' : 'merge';
  const perFileMap =
    perFilePatches && typeof perFilePatches === 'object' && !Array.isArray(perFilePatches)
      ? perFilePatches
      : {};
  const hasThumb =
    thumbnailDataUrl != null &&
    String(thumbnailDataUrl).trim() !== '' &&
    thumbnailDataUrl !== undefined;
  const applyTags =
    (metadataPatch &&
      typeof metadataPatch === 'object' &&
      Object.keys(metadataPatch).length > 0) ||
    Object.keys(perFileMap).length > 0 ||
    hasThumb;

  for (let i = 0; i < filePaths.length; i++) {
    if (isBatchCancelled()) break;
    const filePath = filePaths[i];
    sendBatchProgress({
      type: 'batch-progress',
      phase: 'convert',
      done: i,
      total,
      currentPath: filePath,
    });

    if (!filePath || !fs.existsSync(filePath)) {
      results.push({ path: filePath, success: false, error: 'File not found' });
      continue;
    }

    try {
      const convertOptions = {
        outputFolder: outputFolder || path.join(os.homedir(), 'Downloads'),
        mode: mode || 'audio',
        format: format || 'mp3',
        quality: quality || 'best',
        startTime: startTime || null,
        endTime: endTime || null,
      };
      const r = await conversionService.convertLocalFile(filePath, convertOptions);

      if (applyTags) {
        let sourceMeta = {};
        try {
          const readRes = await readAudioMetadata(filePath);
          if (readRes.success) sourceMeta = readRes.metadata;
        } catch {
          sourceMeta = {};
        }
        const sharedOnly = metadataPatch && typeof metadataPatch === 'object' ? metadataPatch : {};
        const hasSharedKeys = Object.keys(sharedOnly).length > 0;
        let metaForWrite;
        if (strat === 'merge') {
          metaForWrite = buildMergedMetadata(sourceMeta, sharedOnly, 'merge');
        } else if (!hasSharedKeys) {
          metaForWrite = { ...sourceMeta };
        } else {
          metaForWrite = buildMergedMetadata({}, sharedOnly, 'replace');
        }
        const pf = perFileMap[filePath];
        if (pf && typeof pf === 'object') {
          metaForWrite = overlayPerFileFields(metaForWrite, pf);
        }
        const thumb =
          thumbnailDataUrl === undefined || thumbnailDataUrl === ''
            ? null
            : thumbnailDataUrl;
        const tagRes = await applyMetadataToFile(r.filePath, metaForWrite, thumb);
        if (!tagRes.success) {
          results.push({
            path: filePath,
            success: false,
            outputPath: r.filePath,
            error: tagRes.error || 'Failed to write metadata',
          });
          continue;
        }
      }

      results.push({
        path: filePath,
        success: true,
        outputPath: r.filePath,
      });
    } catch (e) {
      const msg = e.message || 'Conversion failed';
      results.push({
        path: filePath,
        success: false,
        error: msg,
      });
      if (msg.toLowerCase().includes('cancel')) {
        break;
      }
    }
  }

  sendBatchProgress({
    type: 'batch-progress',
    phase: 'convert',
    done: results.length,
    total,
    currentPath: null,
  });

  return { results, cancelled: isBatchCancelled() };
}

module.exports = {
  enumeratePaths,
  readAudioMetadata,
  readMetadataBatch,
  applyMetadataBatch,
  dryRunLocalBatch,
  convertLocalBatch,
  cancelBatchJob,
  resetBatchCancel,
  MEDIA_EXTENSIONS,
  DEFAULT_MAX_FILES,
};
