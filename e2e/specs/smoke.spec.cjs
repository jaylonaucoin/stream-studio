const path = require('path');
const { test, expect, _electron: electron } = require('@playwright/test');

const repoRoot = path.join(__dirname, '..', '..');
const electronExecutable = require('electron');

function launchEnv() {
  const env = { ...process.env, STREAM_STUDIO_E2E: '1' };
  delete env.ELECTRON_RUN_AS_NODE;
  return env;
}

test.describe.configure({ mode: 'serial' });

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
  await window.waitForLoadState('domcontentloaded');
  await expect
    .poll(async () => window.evaluate(() => Boolean(window.api?.ping)))
    .toBe(true);
  const pong = await window.evaluate(() => window.api.ping());
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
  await window.waitForLoadState('domcontentloaded');
  await expect
    .poll(async () => window.evaluate(() => Boolean(window.api?.getAppVersion)))
    .toBe(true);
  const version = await window.evaluate(async () => window.api.getAppVersion());
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
