/**
 * Settings service - manages application settings
 */
const { safeStorage } = require('electron');
const store = require('../store');

const ALLOWED_KEYS = new Set([
  'notificationsEnabled',
  'maxHistoryItems',
  'defaultMode',
  'defaultAudioFormat',
  'defaultVideoFormat',
  'defaultQuality',
  'theme',
  'defaultSearchSite',
  'defaultSearchLimit',
]);

const DISCOGS_ENC_KEY = 'discogsTokenEncrypted';

function migrateDiscogsTokenIfNeeded(settingsObj) {
  const plain = typeof settingsObj.discogsToken === 'string' ? settingsObj.discogsToken : '';
  const hasEnc = Boolean(store.get(DISCOGS_ENC_KEY));
  if (!plain || hasEnc || !safeStorage.isEncryptionAvailable()) {
    return;
  }
  try {
    const enc = safeStorage.encryptString(plain);
    store.set(DISCOGS_ENC_KEY, enc.toString('base64'));
    const next = { ...settingsObj };
    delete next.discogsToken;
    store.set('settings', next);
  } catch (err) {
    console.error('Discogs token encryption migration failed:', err);
  }
}

function readDiscogsToken(settingsObj) {
  if (typeof settingsObj.discogsToken === 'string' && settingsObj.discogsToken.length > 0) {
    return settingsObj.discogsToken;
  }
  const enc = store.get(DISCOGS_ENC_KEY);
  if (enc && typeof enc === 'string' && safeStorage.isEncryptionAvailable()) {
    try {
      return safeStorage.decryptString(Buffer.from(enc, 'base64'));
    } catch (err) {
      console.error('Failed to decrypt Discogs token:', err);
    }
  }
  return '';
}

function pickAllowedPatch(input) {
  if (!input || typeof input !== 'object') {
    return { patch: {}, hadDiscogs: false, discogsValue: null };
  }
  const patch = {};
  for (const key of ALLOWED_KEYS) {
    if (Object.prototype.hasOwnProperty.call(input, key)) {
      patch[key] = input[key];
    }
  }
  const hadDiscogs = Object.prototype.hasOwnProperty.call(input, 'discogsToken');
  const discogsValue = hadDiscogs
    ? typeof input.discogsToken === 'string'
      ? input.discogsToken
      : ''
    : null;
  return { patch, hadDiscogs, discogsValue };
}

function sanitizePatch(patch) {
  const out = { ...patch };
  if ('maxHistoryItems' in out) {
    const n = Number(out.maxHistoryItems);
    out.maxHistoryItems = Number.isFinite(n) ? Math.min(500, Math.max(1, Math.round(n))) : 50;
  }
  if ('defaultSearchLimit' in out) {
    const n = Number(out.defaultSearchLimit);
    out.defaultSearchLimit = Number.isFinite(n) ? Math.min(100, Math.max(1, Math.round(n))) : 15;
  }
  if ('notificationsEnabled' in out) {
    out.notificationsEnabled = Boolean(out.notificationsEnabled);
  }
  if ('defaultMode' in out && !['audio', 'video'].includes(out.defaultMode)) {
    delete out.defaultMode;
  }
  if ('theme' in out && !['light', 'dark', 'system'].includes(out.theme)) {
    delete out.theme;
  }
  if ('defaultAudioFormat' in out && typeof out.defaultAudioFormat !== 'string') {
    delete out.defaultAudioFormat;
  } else if ('defaultAudioFormat' in out) {
    out.defaultAudioFormat = out.defaultAudioFormat.slice(0, 32);
  }
  if ('defaultVideoFormat' in out && typeof out.defaultVideoFormat !== 'string') {
    delete out.defaultVideoFormat;
  } else if ('defaultVideoFormat' in out) {
    out.defaultVideoFormat = out.defaultVideoFormat.slice(0, 32);
  }
  if ('defaultQuality' in out && typeof out.defaultQuality !== 'string') {
    delete out.defaultQuality;
  } else if ('defaultQuality' in out) {
    out.defaultQuality = out.defaultQuality.slice(0, 64);
  }
  if ('defaultSearchSite' in out && typeof out.defaultSearchSite !== 'string') {
    delete out.defaultSearchSite;
  } else if ('defaultSearchSite' in out) {
    out.defaultSearchSite = out.defaultSearchSite.slice(0, 64);
  }
  return out;
}

function getSettings() {
  const raw = store.get('settings');
  migrateDiscogsTokenIfNeeded(raw);
  const updated = store.get('settings');
  const discogsToken = readDiscogsToken(updated);
  const rest = { ...updated };
  delete rest.discogsToken;
  return { ...rest, discogsToken };
}

function saveSettings(settings) {
  const { patch, hadDiscogs, discogsValue } = pickAllowedPatch(settings);
  const sanitized = sanitizePatch(patch);
  const existing = store.get('settings');
  let merged = { ...existing, ...sanitized };
  if (hadDiscogs) {
    if (safeStorage.isEncryptionAvailable()) {
      if (discogsValue.length > 0) {
        const enc = safeStorage.encryptString(discogsValue);
        store.set(DISCOGS_ENC_KEY, enc.toString('base64'));
        delete merged.discogsToken;
      } else {
        store.delete(DISCOGS_ENC_KEY);
        merged.discogsToken = '';
      }
    } else {
      store.delete(DISCOGS_ENC_KEY);
      merged.discogsToken = discogsValue;
    }
  }
  store.set('settings', merged);
  return getSettings();
}

function getOutputFolder() {
  return store.get('outputFolder');
}

function setOutputFolder(folder) {
  store.set('outputFolder', folder);
}

function getWindowBounds() {
  return store.get('windowBounds');
}

function saveWindowBounds(bounds) {
  store.set('windowBounds', bounds);
}

module.exports = {
  getSettings,
  saveSettings,
  getOutputFolder,
  setOutputFolder,
  getWindowBounds,
  saveWindowBounds,
};
