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

test('opens batch queue from toolbar', async () => {
  const app = await electron.launch({
    args: [repoRoot],
    cwd: repoRoot,
    executablePath: electronExecutable,
    env: launchEnv(),
  });
  const window = await app.firstWindow();
  await window.waitForLoadState('domcontentloaded');
  await window.getByRole('button', { name: /open batch queue/i }).click();
  await expect(window.getByText('Batch Queue')).toBeVisible();
  await app.close();
});

test('opens settings from toolbar', async () => {
  const app = await electron.launch({
    args: [repoRoot],
    cwd: repoRoot,
    executablePath: electronExecutable,
    env: launchEnv(),
  });
  const window = await app.firstWindow();
  await window.waitForLoadState('domcontentloaded');
  await window.getByRole('button', { name: /open settings/i }).click();
  await expect(window.getByRole('heading', { name: /^settings$/i })).toBeVisible();
  await app.close();
});
