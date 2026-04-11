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

test('opens batch queue panel', async () => {
  const app = await electron.launch({
    args: [repoRoot],
    cwd: repoRoot,
    executablePath: electronExecutable,
    env: launchEnv(),
  })
  const window = await app.firstWindow()
  await window.waitForLoadState('domcontentloaded')

  await window.getByRole('button', { name: /open batch queue/i }).click()
  await expect(window.getByText('Batch Queue')).toBeVisible({ timeout: 5000 })

  await app.close()
})

test('queue starts empty', async () => {
  const app = await electron.launch({
    args: [repoRoot],
    cwd: repoRoot,
    executablePath: electronExecutable,
    env: launchEnv(),
  })
  const window = await app.firstWindow()
  await window.waitForLoadState('domcontentloaded')

  await window.getByRole('button', { name: /open batch queue/i }).click()
  await expect(window.getByText('Queue is empty')).toBeVisible({ timeout: 5000 })

  await app.close()
})

test('can close queue panel', async () => {
  const app = await electron.launch({
    args: [repoRoot],
    cwd: repoRoot,
    executablePath: electronExecutable,
    env: launchEnv(),
  })
  const window = await app.firstWindow()
  await window.waitForLoadState('domcontentloaded')

  await window.getByRole('button', { name: /open batch queue/i }).click()
  await expect(window.getByText('Batch Queue')).toBeVisible({ timeout: 5000 })

  await window.locator('[aria-label="Close queue panel"]').click()
  await expect(window.getByText('Queue is empty')).not.toBeVisible({ timeout: 5000 })

  await app.close()
})

test('reopens queue panel', async () => {
  const app = await electron.launch({
    args: [repoRoot],
    cwd: repoRoot,
    executablePath: electronExecutable,
    env: launchEnv(),
  })
  const window = await app.firstWindow()
  await window.waitForLoadState('domcontentloaded')

  await window.getByRole('button', { name: /open batch queue/i }).click()
  await expect(window.getByText('Batch Queue')).toBeVisible({ timeout: 5000 })

  await window.locator('[aria-label="Close queue panel"]').click()
  await expect(window.getByText('Queue is empty')).not.toBeVisible({ timeout: 5000 })

  await window.getByRole('button', { name: /open batch queue/i }).click()
  await expect(window.getByText('Batch Queue')).toBeVisible({ timeout: 5000 })
  await expect(window.getByText('Queue is empty')).toBeVisible()

  await app.close()
})
