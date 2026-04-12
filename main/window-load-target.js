/**
 * Decides whether the main window loads the Vite dev server or the packaged renderer.
 * @param {boolean} isDevFromPaths - result of paths.isDev()
 * @param {string | undefined} streamStudioE2e - process.env.STREAM_STUDIO_E2E
 * @returns {boolean} true → loadURL dev server; false → loadFile dist-renderer
 */
function shouldLoadViteDevServer(isDevFromPaths, streamStudioE2e) {
  const e2eBuiltUi = streamStudioE2e === '1';
  return isDevFromPaths && !e2eBuiltUi;
}

module.exports = { shouldLoadViteDevServer };
