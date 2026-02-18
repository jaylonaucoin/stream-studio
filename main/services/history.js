/**
 * History service - manages conversion history
 */
const store = require('../store');

/**
 * Add item to conversion history
 * @param {Object} item - History item to add
 */
function addToHistory(item) {
  const history = store.get('conversionHistory') || [];
  const settings = store.get('settings');

  // Add new item at the beginning
  history.unshift({
    id: Date.now().toString(),
    ...item,
    timestamp: new Date().toISOString(),
  });

  // Limit history size
  const maxItems = settings.maxHistoryItems || 50;
  if (history.length > maxItems) {
    history.splice(maxItems);
  }

  store.set('conversionHistory', history);
}

/**
 * Get all history items
 * @returns {Array} History items
 */
function getHistory() {
  return store.get('conversionHistory') || [];
}

/**
 * Clear all history
 * @returns {Array} Empty array
 */
function clearHistory() {
  store.set('conversionHistory', []);
  return [];
}

/**
 * Remove a single history item
 * @param {string} id - Item ID to remove
 * @returns {Array} Updated history
 */
function removeHistoryItem(id) {
  const history = store.get('conversionHistory') || [];
  const filtered = history.filter((item) => item.id !== id);
  store.set('conversionHistory', filtered);
  return filtered;
}

module.exports = {
  addToHistory,
  getHistory,
  clearHistory,
  removeHistoryItem,
};
