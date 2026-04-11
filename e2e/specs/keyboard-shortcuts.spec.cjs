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

test('opens keyboard shortcuts dialog via Ctrl+K', async () => {
  const app = await electron.launch({
    args: [repoRoot],
    cwd: repoRoot,
    executablePath: electronExecutable,
    env: launchEnv(),
  })
  const window = await app.firstWindow()
  await window.waitForLoadState('domcontentloaded')

  await window.keyboard.press('Control+k')
  await expect(
    window.getByRole('heading', { name: 'Keyboard Shortcuts', exact: true })
  ).toBeVisible({ timeout: 5000 })

  await app.close()
})

test('shortcuts dialog shows shortcuts list', async () => {
  const app = await electron.launch({
    args: [repoRoot],
    cwd: repoRoot,
    executablePath: electronExecutable,
    env: launchEnv(),
  })
  const window = await app.firstWindow()
  await window.waitForLoadState('domcontentloaded')

  await window.keyboard.press('Control+k')
  await expect(
    window.getByRole('heading', { name: 'Keyboard Shortcuts', exact: true })
  ).toBeVisible({ timeout: 5000 })

  await expect(window.getByText(/start conversion/i)).toBeVisible()
  await expect(window.getByText(/paste url from clipboard/i)).toBeVisible()
  await expect(window.getByText(/open history panel/i)).toBeVisible()

  await app.close()
})

test('can close shortcuts dialog', async () => {
  const app = await electron.launch({
    args: [repoRoot],
    cwd: repoRoot,
    executablePath: electronExecutable,
    env: launchEnv(),
  })
  const window = await app.firstWindow()
  await window.waitForLoadState('domcontentloaded')

  await window.keyboard.press('Control+k')
  await expect(
    window.getByRole('heading', { name: 'Keyboard Shortcuts', exact: true })
  ).toBeVisible({ timeout: 5000 })

  await window.locator('[aria-label="Close keyboard shortcuts"]').click()
  await expect(
    window.getByRole('heading', { name: 'Keyboard Shortcuts', exact: true })
  ).not.toBeVisible({ timeout: 5000 })

  await app.close()
})

test('Ctrl+B opens batch queue panel', async () => {
  const app = await electron.launch({
    args: [repoRoot],
    cwd: repoRoot,
    executablePath: electronExecutable,
    env: launchEnv(),
  })
  const window = await app.firstWindow()
  await window.waitForLoadState('domcontentloaded')

  await window.keyboard.press('Control+b')
  await expect(window.getByText('Batch Queue')).toBeVisible({ timeout: 5000 })

  await app.close()
})

test('Escape closes dialogs', async () => {
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

  await window.keyboard.press('Escape')
  await expect(window.getByRole('heading', { name: /^settings$/i })).not.toBeVisible({ timeout: 5000 })

  await app.close()
})
