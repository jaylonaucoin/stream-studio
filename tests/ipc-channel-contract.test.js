/**
 * IPC contract: every `ipcRenderer.invoke('channel')` in preload must have a matching
 * `ipcMain.handle('channel', ...)` registered via registerAllHandlers.
 *
 * Event channels (renderer listens; main sends) are validated separately — see
 * MAIN_PROCESS_SEND_CHANNELS and PRELOAD_ON_CHANNELS below.
 */
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';
import { describe, it, expect } from 'vitest';
import { registerAllHandlers } from '../main/ipc/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');

/** Channels the main process pushes to the renderer (webContents.send / related). */
const MAIN_PROCESS_SEND_CHANNELS = ['conversion-progress', 'batch-job-progress'];

/** Channels preload subscribes to via ipcRenderer.on(...) (may live in preload.js or shared/preload-logic.js). */
function extractPreloadOnChannels(...sources) {
  const channels = new Set();
  for (const src of sources) {
    const re = /ipcRenderer\.on\(\s*'([^']+)'/g;
    let m;
    while ((m = re.exec(src)) !== null) {
      channels.add(m[1]);
    }
  }
  return channels;
}

function extractInvokeChannelsFromPreload(preloadSource) {
  const channels = new Set();
  const re = /ipcRenderer\.invoke\(\s*'([^']+)'/g;
  let m;
  while ((m = re.exec(preloadSource)) !== null) {
    channels.add(m[1]);
  }
  return channels;
}

function createRecordingIpcMain() {
  const registered = new Set();
  return {
    registered,
    handle(channel, fn) {
      registered.add(channel);
    },
    on() {},
    removeListener() {},
  };
}

describe('IPC channel contract', () => {
  it('registers a handler for every preload invoke channel', () => {
    const preloadSource = readFileSync(path.join(repoRoot, 'preload.js'), 'utf8');
    const invokeChannels = extractInvokeChannelsFromPreload(preloadSource);
    const ipcMain = createRecordingIpcMain();
    registerAllHandlers(ipcMain);

    for (const ch of invokeChannels) {
      expect(
        ipcMain.registered.has(ch),
        `Missing ipcMain.handle for preload invoke channel: "${ch}"`
      ).toBe(true);
    }
  });

  it('documents renderer event channels: preload.on matches main.send', () => {
    const preloadSource = readFileSync(path.join(repoRoot, 'preload.js'), 'utf8');
    const preloadLogicSource = readFileSync(
      path.join(repoRoot, 'shared/preload-logic.js'),
      'utf8'
    );
    const onChannels = extractPreloadOnChannels(preloadSource, preloadLogicSource);
    for (const ch of MAIN_PROCESS_SEND_CHANNELS) {
      expect(
        onChannels.has(ch),
        `Preload stack should ipcRenderer.on('${ch}', ...) for main-process send`
      ).toBe(true);
    }
  });
});
