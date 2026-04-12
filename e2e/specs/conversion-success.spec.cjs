const path = require('path');
const { test, expect, _electron: electron } = require('@playwright/test');
const { hasRendererPreloadApi } = require('../helpers/renderer-api.cjs');

const repoRoot = path.join(__dirname, '..', '..');
const electronExecutable = require('electron');

function launchEnv() {
  const env = {
    ...process.env,
    STREAM_STUDIO_E2E: '1',
    STREAM_STUDIO_E2E_MOCK_CONVERT: '1',
  };
  delete env.ELECTRON_RUN_AS_NODE;
  return env;
}

test('completes a mocked conversion and shows success', async () => {
  const app = await electron.launch({
    args: [repoRoot],
    cwd: repoRoot,
    executablePath: electronExecutable,
    env: launchEnv(),
  });
  const window = await app.firstWindow();
  await window.waitForLoadState('load');
  await expect.poll(async () => hasRendererPreloadApi(app)).toBe(true);

  await window.getByRole('tab', { name: /paste url/i }).click();
  const urlInput = window.locator('[aria-label="Video or audio URL input"]');
  await urlInput.fill('https://www.youtube.com/watch?v=dQw4w9WgXcQ');

  const convertBtn = window.getByRole('button', { name: /^convert$/i });
  await expect(convertBtn).toBeEnabled({ timeout: 15000 });
  await convertBtn.click();

  const completeHeading = window.getByRole('heading', { name: /conversion complete/i });
  await expect(completeHeading).toBeVisible({ timeout: 15000 });
  await completeHeading.scrollIntoViewIfNeeded();
  await expect(window.getByText(/^Success$/)).toBeVisible({ timeout: 5000 });

  await app.close();
});
