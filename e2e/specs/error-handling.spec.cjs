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

test('shows error for invalid URL', async () => {
  const app = await electron.launch({
    args: [repoRoot],
    cwd: repoRoot,
    executablePath: electronExecutable,
    env: launchEnv(),
  })
  const window = await app.firstWindow()
  await window.waitForLoadState('domcontentloaded')

  await window.getByRole('tab', { name: /paste url/i }).click()

  const urlInput = window.locator('[aria-label="Video or audio URL input"]')
  await urlInput.fill('not-a-valid-url')

  await expect(window.getByText(/please enter a valid/i)).toBeVisible({ timeout: 5000 })

  await app.close()
})

test('handles empty URL gracefully', async () => {
  const app = await electron.launch({
    args: [repoRoot],
    cwd: repoRoot,
    executablePath: electronExecutable,
    env: launchEnv(),
  })
  const window = await app.firstWindow()
  await window.waitForLoadState('domcontentloaded')

  await window.getByRole('tab', { name: /paste url/i }).click()

  const convertBtn = window.getByRole('button', { name: /^convert$/i })
  await expect(convertBtn).toBeVisible({ timeout: 10000 })
  await expect(convertBtn).toBeDisabled()

  await app.close()
})

test('app recovers from panel close/open cycle', async () => {
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

  await window.getByRole('button', { name: /open batch queue/i }).click()
  await expect(window.getByText('Batch Queue')).toBeVisible({ timeout: 5000 })
  await window.locator('[aria-label="Close queue panel"]').click()
  await expect(window.getByText('Queue is empty')).not.toBeVisible({ timeout: 5000 })

  await expect(window.locator('body')).toBeVisible()

  await app.close()
})

test('toolbar buttons remain functional after navigation', async () => {
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

  await window.getByRole('button', { name: /open conversion history/i }).click()
  await expect(
    window.getByRole('heading', { name: 'Conversion History', exact: true })
  ).toBeVisible({ timeout: 5000 })
  await window.locator('[aria-label="Close history panel"]').click()

  await window.getByRole('button', { name: /open settings/i }).click()
  await expect(window.getByRole('heading', { name: /^settings$/i })).toBeVisible({ timeout: 5000 })
  await window.getByRole('button', { name: /^cancel$/i }).click()

  await expect(window.locator('body')).toBeVisible()

  await app.close()
})

test('app title remains correct after interactions', async () => {
  const app = await electron.launch({
    args: [repoRoot],
    cwd: repoRoot,
    executablePath: electronExecutable,
    env: launchEnv(),
  })
  const window = await app.firstWindow()
  await window.waitForLoadState('domcontentloaded')

  await window.getByRole('button', { name: /open settings/i }).click()
  await window.getByRole('button', { name: /^cancel$/i }).click()

  await window.getByRole('button', { name: /open batch queue/i }).click()
  await window.locator('[aria-label="Close queue panel"]').click()

  await expect.poll(async () => window.title()).toMatch(/stream studio/i)

  await app.close()
})
