/**
 * Settings service - manages application settings
 */
const store = require('../store');

/**
 * Get all settings
 * @returns {Object} Settings object
 */
function getSettings() {
  return store.get('settings');
}

/**
 * Save settings
 * @param {Object} settings - Settings to save (merged with existing)
 * @returns {Object} Updated settings
 */
function saveSettings(settings) {
  store.set('settings', { ...store.get('settings'), ...settings });
  return store.get('settings');
}

/**
 * Get output folder
 * @returns {string|null} Output folder path
 */
function getOutputFolder() {
  return store.get('outputFolder');
}

/**
 * Set output folder
 * @param {string} folder - Folder path
 */
function setOutputFolder(folder) {
  store.set('outputFolder', folder);
}

/**
 * Get window bounds
 * @returns {Object} Window bounds
 */
function getWindowBounds() {
  return store.get('windowBounds');
}

/**
 * Save window bounds
 * @param {Object} bounds - Window bounds
 */
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
