/**
 * Preload-side logic testable without Electron contextBridge.
 * Used by preload.js and Vitest (node).
 */

/**
 * @param {File | null | undefined} file
 * @param {{ getPathForFile?: (file: File) => string } | null | undefined} webUtils
 * @returns {string}
 */
function getPathForFile(file, webUtils) {
  if (!file) return '';
  try {
    if (webUtils && typeof webUtils.getPathForFile === 'function') {
      const p = webUtils.getPathForFile(file);
      if (p) return p;
    }
    return file.path || '';
  } catch {
    return file.path || '';
  }
}

/**
 * @param {object} ipcRenderer Electron ipcRenderer
 * @param {typeof console} [log]
 */
function createConversionProgressHandlers(ipcRenderer, log = console) {
  const conversionProgressListeners = new Set();
  let conversionProgressRelay = null;

  function ensureConversionProgressRelay() {
    if (conversionProgressRelay) return;
    conversionProgressRelay = (_event, data) => {
      conversionProgressListeners.forEach((cb) => {
        try {
          cb(data);
        } catch (e) {
          log.error('[conversion-progress listener]', e);
        }
      });
    };
    ipcRenderer.on('conversion-progress', conversionProgressRelay);
  }

  function teardownConversionProgressRelayIfEmpty() {
    if (conversionProgressListeners.size === 0 && conversionProgressRelay) {
      ipcRenderer.removeListener('conversion-progress', conversionProgressRelay);
      conversionProgressRelay = null;
    }
  }

  return {
    onProgress(callback) {
      if (typeof callback !== 'function') return;
      conversionProgressListeners.add(callback);
      ensureConversionProgressRelay();
    },
    offProgress(callback) {
      if (callback) {
        conversionProgressListeners.delete(callback);
      } else {
        conversionProgressListeners.clear();
      }
      teardownConversionProgressRelayIfEmpty();
    },
  };
}

module.exports = {
  getPathForFile,
  createConversionProgressHandlers,
};
