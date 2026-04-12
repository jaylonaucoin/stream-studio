/**
 * IPC contract: every `ipcRenderer.invoke('channel')` in preload must have a matching
 * `ipcMain.handle('channel', ...)` registered via registerAllHandlers.
 *
 * Event channels (renderer listens; main sends) are validated separately — see
 * MAIN_PROCESS_SEND_CHANNELS and PRELOAD_ON_CHANNELS below.
 *
 * When adding a new `webContents.send('channel', ...)` in `main/`, add `channel` to
 * MAIN_PROCESS_SEND_CHANNELS and ensure preload subscribes via ipcRenderer.on (see tests below).
 */
import { readFileSync, readdirSync, statSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';
import { describe, it, expect } from 'vitest';
import { registerAllHandlers } from '../main/ipc/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');

/** Channels the main process pushes to the renderer (webContents.send / related). */
const MAIN_PROCESS_SEND_CHANNELS = ['conversion-progress', 'batch-job-progress'];

function walkJsFiles(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = path.join(dir, name);
    if (statSync(p).isDirectory()) out.push(...walkJsFiles(p));
    else if (name.endsWith('.js')) out.push(p);
  }
  return out;
}

function extractWebContentsSendChannels(mainDir) {
  const channels = new Set();
  const re = /webContents\.send\(\s*'([^']+)'/g;
  for (const file of walkJsFiles(mainDir)) {
    const src = readFileSync(file, 'utf8');
    let m;
    while ((m = re.exec(src)) !== null) {
      channels.add(m[1]);
    }
  }
  return channels;
}

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

  it('MAIN_PROCESS_SEND_CHANNELS matches every webContents.send in main/', () => {
    const fromMain = extractWebContentsSendChannels(path.join(repoRoot, 'main'));
    const documentedSorted = [...MAIN_PROCESS_SEND_CHANNELS].sort();
    const actualSorted = [...fromMain].sort();
    expect(
      actualSorted,
      `Sync MAIN_PROCESS_SEND_CHANNELS with main/: sends are ${actualSorted.join(', ')}`
    ).toEqual(documentedSorted);
  });
});
