const path = require('path');
const { test, expect, _electron: electron } = require('@playwright/test');

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

test.describe.configure({ mode: 'serial' });

test('completes a mocked conversion and shows success', async () => {
  const app = await electron.launch({
    args: [repoRoot],
    cwd: repoRoot,
    executablePath: electronExecutable,
    env: launchEnv(),
  });
  const window = await app.firstWindow();
  await window.waitForLoadState('domcontentloaded');

  await window.getByRole('tab', { name: /paste url/i }).click();
  const urlInput = window.locator('[aria-label="Video or audio URL input"]');
  await urlInput.fill('https://www.youtube.com/watch?v=dQw4w9WgXcQ');

  const convertBtn = window.getByRole('button', { name: /^convert$/i });
  await expect(convertBtn).toBeEnabled({ timeout: 15000 });
  await convertBtn.click();

  await expect(window.getByText('Conversion complete!', { exact: false })).toBeVisible({
    timeout: 15000,
  });
  await expect(window.getByText('Success')).toBeVisible({ timeout: 5000 });

  await app.close();
});
