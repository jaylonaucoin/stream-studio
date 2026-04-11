const path = require('path')
const { test, expect, _electron: electron } = require('@playwright/test')

const repoRoot = path.join(__dirname, '..', '..')
const electronExecutable = require('electron')

function launchEnv() {
  const env = { ...process.env, STREAM_STUDIO_E2E: '1' }
  delete env.ELECTRON_RUN_AS_NODE
  return env
}

test.describe.configure({ mode: 'serial' })

test('opens settings dialog', async () => {
  const app = await electron.launch({
    args: [repoRoot],
    cwd: repoRoot,
    executablePath: electronExecutable,
    env: launchEnv(),
  })
  const window = await app.firstWindow()
  await window.waitForLoadState('domcontentloaded')

  await window.getByRole('button', { name: /open settings/i }).click()
  await expect(window.getByRole('heading', { name: /^settings$/i })).toBeVisible({ timeout: 5000 })

  await app.close()
})

test('settings dialog shows format options', async () => {
  const app = await electron.launch({
    args: [repoRoot],
    cwd: repoRoot,
    executablePath: electronExecutable,
    env: launchEnv(),
  })
  const window = await app.firstWindow()
  await window.waitForLoadState('domcontentloaded')

  await window.getByRole('button', { name: /open settings/i }).click()
  await expect(window.getByRole('heading', { name: /^settings$/i })).toBeVisible({ timeout: 5000 })

  await expect(window.locator('[aria-label="Theme selection"]')).toBeVisible()
  await expect(window.getByText(/default conversion settings/i)).toBeVisible()

  await app.close()
})

test('can toggle notifications setting', async () => {
  const app = await electron.launch({
    args: [repoRoot],
    cwd: repoRoot,
    executablePath: electronExecutable,
    env: launchEnv(),
  })
  const window = await app.firstWindow()
  await window.waitForLoadState('domcontentloaded')

  await window.getByRole('button', { name: /open settings/i }).click()
  await expect(window.getByRole('heading', { name: /^settings$/i })).toBeVisible({ timeout: 5000 })

  const toggle = window.locator('[aria-label="Enable notifications"]')
  await expect(toggle).toBeVisible()
  await toggle.click()

  await app.close()
})

test('cancel closes without saving', async () => {
  const app = await electron.launch({
    args: [repoRoot],
    cwd: repoRoot,
    executablePath: electronExecutable,
    env: launchEnv(),
  })
  const window = await app.firstWindow()
  await window.waitForLoadState('domcontentloaded')

  await window.getByRole('button', { name: /open settings/i }).click()
  await expect(window.getByRole('heading', { name: /^settings$/i })).toBeVisible({ timeout: 5000 })

  await window.getByRole('button', { name: /^cancel$/i }).click()
  await expect(window.getByRole('heading', { name: /^settings$/i })).not.toBeVisible({ timeout: 5000 })

  await app.close()
})

test('reopen shows settings dialog again', async () => {
  const app = await electron.launch({
    args: [repoRoot],
    cwd: repoRoot,
    executablePath: electronExecutable,
    env: launchEnv(),
  })
  const window = await app.firstWindow()
  await window.waitForLoadState('domcontentloaded')

  await window.getByRole('button', { name: /open settings/i }).click()
  await expect(window.getByRole('heading', { name: /^settings$/i })).toBeVisible({ timeout: 5000 })

  await window.getByRole('button', { name: /^cancel$/i }).click()
  await expect(window.getByRole('heading', { name: /^settings$/i })).not.toBeVisible({ timeout: 5000 })

  await window.getByRole('button', { name: /open settings/i }).click()
  await expect(window.getByRole('heading', { name: /^settings$/i })).toBeVisible({ timeout: 5000 })

  await app.close()
})
