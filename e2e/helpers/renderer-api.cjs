/**
 * Read preload `window.api` via main-process webContents.executeJavaScript.
 * Playwright page.evaluate can miss contextBridge globals in Electron; this path does not.
 */

/**
 * @param {import('@playwright/test').ElectronApplication} electronApp
 * @returns {Promise<boolean>}
 */
async function hasRendererPreloadApi(electronApp) {
  return electronApp.evaluate(async ({ BrowserWindow }) => {
    const wins = BrowserWindow.getAllWindows();
    for (const win of wins) {
      if (win.isDestroyed() || win.webContents.isDestroyed()) continue;
      try {
        const ok = await win.webContents.executeJavaScript(
          'Boolean(globalThis.api && typeof globalThis.api.ping === "function")',
          true
        );
        if (ok) return true;
      } catch {
        // e.g. devtools or non-page webContents
      }
    }
    return false;
  });
}

/**
 * @param {import('@playwright/test').ElectronApplication} electronApp
 * @returns {Promise<string>}
 */
async function pingFromRenderer(electronApp) {
  return electronApp.evaluate(async ({ BrowserWindow }) => {
    const wins = BrowserWindow.getAllWindows();
    for (const win of wins) {
      if (win.isDestroyed() || win.webContents.isDestroyed()) continue;
      try {
        const pong = await win.webContents.executeJavaScript(
          '(async () => { return await globalThis.api.ping(); })()',
          true
        );
        if (pong === 'pong') return pong;
      } catch {
        // continue
      }
    }
    return '';
  });
}

/**
 * @param {import('@playwright/test').ElectronApplication} electronApp
 * @returns {Promise<string>}
 */
async function getAppVersionFromRenderer(electronApp) {
  return electronApp.evaluate(async ({ BrowserWindow }) => {
    const wins = BrowserWindow.getAllWindows();
    for (const win of wins) {
      if (win.isDestroyed() || win.webContents.isDestroyed()) continue;
      try {
        const version = await win.webContents.executeJavaScript(
          `(async () => {
            if (!globalThis.api || typeof globalThis.api.getAppVersion !== 'function') return '';
            return await globalThis.api.getAppVersion();
          })()`,
          true
        );
        if (typeof version === 'string' && version.length > 0) return version;
      } catch {
        // continue
      }
    }
    return '';
  });
}

module.exports = {
  hasRendererPreloadApi,
  pingFromRenderer,
  getAppVersionFromRenderer,
};
