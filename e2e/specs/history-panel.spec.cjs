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

test('opens history panel', async () => {
  const app = await electron.launch({
    args: [repoRoot],
    cwd: repoRoot,
    executablePath: electronExecutable,
    env: launchEnv(),
  })
  const window = await app.firstWindow()
  await window.waitForLoadState('domcontentloaded')

  await window.getByRole('button', { name: /open conversion history/i }).click()
  await expect(window.getByText('Conversion History')).toBeVisible({ timeout: 5000 })

  await app.close()
})

test('history starts empty', async () => {
  const app = await electron.launch({
    args: [repoRoot],
    cwd: repoRoot,
    executablePath: electronExecutable,
    env: launchEnv(),
  })
  const window = await app.firstWindow()
  await window.waitForLoadState('domcontentloaded')

  await window.getByRole('button', { name: /open conversion history/i }).click()
  await expect(window.getByText('No conversion history yet')).toBeVisible({ timeout: 5000 })

  await app.close()
})

test('can close history panel', async () => {
  const app = await electron.launch({
    args: [repoRoot],
    cwd: repoRoot,
    executablePath: electronExecutable,
    env: launchEnv(),
  })
  const window = await app.firstWindow()
  await window.waitForLoadState('domcontentloaded')

  await window.getByRole('button', { name: /open conversion history/i }).click()
  await expect(window.getByText('Conversion History')).toBeVisible({ timeout: 5000 })

  await window.locator('[aria-label="Close history panel"]').click()
  await expect(window.getByText('Conversion History')).not.toBeVisible({ timeout: 5000 })

  await app.close()
})

test('reopens history panel', async () => {
  const app = await electron.launch({
    args: [repoRoot],
    cwd: repoRoot,
    executablePath: electronExecutable,
    env: launchEnv(),
  })
  const window = await app.firstWindow()
  await window.waitForLoadState('domcontentloaded')

  await window.getByRole('button', { name: /open conversion history/i }).click()
  await expect(window.getByText('Conversion History')).toBeVisible({ timeout: 5000 })

  await window.locator('[aria-label="Close history panel"]').click()
  await expect(window.getByText('Conversion History')).not.toBeVisible({ timeout: 5000 })

  await window.getByRole('button', { name: /open conversion history/i }).click()
  await expect(window.getByText('Conversion History')).toBeVisible({ timeout: 5000 })
  await expect(window.getByText('No conversion history yet')).toBeVisible()

  await app.close()
})
