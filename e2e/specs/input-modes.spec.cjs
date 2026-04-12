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

test('Search tab shows site selector and query field', async () => {
  const app = await electron.launch({
    args: [repoRoot],
    cwd: repoRoot,
    executablePath: electronExecutable,
    env: launchEnv(),
  });
  const window = await app.firstWindow();
  await window.waitForLoadState('load');

  await window.getByRole('tab', { name: /search/i }).click();
  await expect(window.getByRole('textbox', { name: /youtube search query/i })).toBeVisible({
    timeout: 15000,
  });
  await expect(window.getByRole('button', { name: /^search$/i })).toBeVisible();

  await app.close();
});

test('Local File tab shows drop zone', async () => {
  const app = await electron.launch({
    args: [repoRoot],
    cwd: repoRoot,
    executablePath: electronExecutable,
    env: launchEnv(),
  });
  const window = await app.firstWindow();
  await window.waitForLoadState('domcontentloaded');

  await window.getByRole('tab', { name: /local file/i }).click();
  await expect(
    window.getByLabel(/drop audio or video file here, or click to browse/i)
  ).toBeVisible({ timeout: 10000 });

  await app.close();
});

test('Library tab shows batch add controls', async () => {
  const app = await electron.launch({
    args: [repoRoot],
    cwd: repoRoot,
    executablePath: electronExecutable,
    env: launchEnv(),
  });
  const window = await app.firstWindow();
  await window.waitForLoadState('domcontentloaded');

  await window.getByRole('tab', { name: /^library$/i }).click();
  await expect(window.getByText(/drop files or folders here/i)).toBeVisible({ timeout: 10000 });
  await expect(window.getByRole('button', { name: /add files/i })).toBeVisible();

  await app.close();
});
