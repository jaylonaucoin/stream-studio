/**
 * IPC handlers for catalog URL metadata lookup
 */
const catalogLookup = require('../../services/music-catalog-lookup');
const settingsService = require('../../services/settings');

function registerHandlers(ipcMain) {
  ipcMain.handle('fetchCatalogMetadataFromUrl', async (event, url) => {
    try {
      if (!url || typeof url !== 'string') {
        return { success: false, error: 'URL is required' };
      }
      const settings = settingsService.getSettings() || {};
      const discogsToken = typeof settings.discogsToken === 'string' ? settings.discogsToken : '';
      return await catalogLookup.fetchCatalogMetadataFromUrl(url, { discogsToken });
    } catch (error) {
      console.error('fetchCatalogMetadataFromUrl:', error);
      return { success: false, error: error.message || 'Lookup failed' };
    }
  });
}

module.exports = { registerHandlers };
