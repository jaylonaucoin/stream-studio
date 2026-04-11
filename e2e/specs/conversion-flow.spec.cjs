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

test('paste URL into input field', async () => {
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
  await urlInput.fill('https://www.youtube.com/watch?v=dQw4w9WgXcQ')
  await expect(urlInput).toHaveValue('https://www.youtube.com/watch?v=dQw4w9WgXcQ')

  await app.close()
})

test('format selector shows audio formats', async () => {
  const app = await electron.launch({
    args: [repoRoot],
    cwd: repoRoot,
    executablePath: electronExecutable,
    env: launchEnv(),
  })
  const window = await app.firstWindow()
  await window.waitForLoadState('domcontentloaded')

  await window.getByRole('tab', { name: /paste url/i }).click()

  const formatSelect = window.locator('[aria-label="Output format selection"]')
  await expect(formatSelect).toBeVisible({ timeout: 10000 })
  await formatSelect.click()

  await expect(window.getByRole('option', { name: /mp3/i })).toBeVisible({ timeout: 5000 })
  await expect(window.getByRole('option', { name: /flac/i })).toBeVisible()

  await window.keyboard.press('Escape')
  await app.close()
})

test('convert button exists and is initially disabled', async () => {
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

test('quality selector shows quality options', async () => {
  const app = await electron.launch({
    args: [repoRoot],
    cwd: repoRoot,
    executablePath: electronExecutable,
    env: launchEnv(),
  })
  const window = await app.firstWindow()
  await window.waitForLoadState('domcontentloaded')

  await window.getByRole('tab', { name: /paste url/i }).click()

  const qualitySelect = window.locator('[aria-label="Quality selection"]')
  await expect(qualitySelect).toBeVisible({ timeout: 10000 })
  await qualitySelect.click()

  await expect(window.getByRole('option', { name: /best/i })).toBeVisible({ timeout: 5000 })
  await expect(window.getByRole('option', { name: /high/i })).toBeVisible()
  await expect(window.getByRole('option', { name: /medium/i })).toBeVisible()
  await expect(window.getByRole('option', { name: /low/i })).toBeVisible()

  await window.keyboard.press('Escape')
  await app.close()
})

test('switching to video mode works', async () => {
  const app = await electron.launch({
    args: [repoRoot],
    cwd: repoRoot,
    executablePath: electronExecutable,
    env: launchEnv(),
  })
  const window = await app.firstWindow()
  await window.waitForLoadState('domcontentloaded')

  await window.getByRole('tab', { name: /paste url/i }).click()

  const videoBtn = window.locator('[aria-label="Video mode"]')
  await expect(videoBtn).toBeVisible({ timeout: 10000 })
  await videoBtn.click()

  const formatSelect = window.locator('[aria-label="Output format selection"]')
  await formatSelect.click()
  await expect(window.getByRole('option', { name: /mp4/i })).toBeVisible({ timeout: 5000 })

  await window.keyboard.press('Escape')
  await app.close()
})
