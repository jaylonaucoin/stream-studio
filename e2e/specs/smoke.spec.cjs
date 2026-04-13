const path = require('path');
const { test, expect, _electron: electron } = require('@playwright/test');
const {
  hasRendererPreloadApi,
  pingFromRenderer,
  getAppVersionFromRenderer,
} = require('../helpers/renderer-api.cjs');

const repoRoot = path.join(__dirname, '..', '..');
const electronExecutable = require('electron');

function launchEnv() {
  const env = { ...process.env, STREAM_STUDIO_E2E: '1' };
  delete env.ELECTRON_RUN_AS_NODE;
  return env;
}

test('electron app opens a window', async () => {
  const app = await electron.launch({
    args: [repoRoot],
    cwd: repoRoot,
    executablePath: electronExecutable,
    env: launchEnv(),
  });
  const window = await app.firstWindow();
  await window.waitForLoadState('domcontentloaded');
  await expect(window.locator('body')).toBeVisible();
  await app.close();
});

test('window title matches Stream Studio', async () => {
  const app = await electron.launch({
    args: [repoRoot],
    cwd: repoRoot,
    executablePath: electronExecutable,
    env: launchEnv(),
  });
  const window = await app.firstWindow();
  await window.waitForLoadState('domcontentloaded');
  await expect.poll(async () => window.title()).toMatch(/stream studio/i);
  await app.close();
});

test('renderer exposes preload API after load', async () => {
  const app = await electron.launch({
    args: [repoRoot],
    cwd: repoRoot,
    executablePath: electronExecutable,
    env: launchEnv(),
  });
  const window = await app.firstWindow();
  await window.waitForLoadState('load');
  await expect.poll(async () => hasRendererPreloadApi(app)).toBe(true);
  const pong = await pingFromRenderer(app);
  expect(pong).toBe('pong');
  await app.close();
});

test('getAppVersion returns a non-empty string', async () => {
  const app = await electron.launch({
    args: [repoRoot],
    cwd: repoRoot,
    executablePath: electronExecutable,
    env: launchEnv(),
  });
  const window = await app.firstWindow();
  await window.waitForLoadState('load');
  let version = '';
  await expect.poll(async () => {
    version = await getAppVersionFromRenderer(app);
    return version.length > 0;
  }).toBe(true);
  expect(typeof version).toBe('string');
  expect(version.length).toBeGreaterThan(0);
  await app.close();
});

test('root mounts React app', async () => {
  const app = await electron.launch({
    args: [repoRoot],
    cwd: repoRoot,
    executablePath: electronExecutable,
    env: launchEnv(),
  });
  const window = await app.firstWindow();
  await window.waitForLoadState('domcontentloaded');
  await expect(window.locator('#root')).toBeAttached();
  await expect
    .poll(async () =>
      window.evaluate(() => document.getElementById('root')?.childElementCount > 0)
    )
    .toBe(true);
  await app.close();
});
