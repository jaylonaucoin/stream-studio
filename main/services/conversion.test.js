import { createRequire } from 'node:module'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createFakeChildProcess } from '../../tests/setup/fake-spawn.js'

const require = createRequire(import.meta.url)

const childProcess = require('child_process')
const fs = require('fs')
const path = require('path')

const spawnMock = vi.fn()
const checkFfmpegAvailable = vi.fn(() => Promise.resolve(true))
const getFfmpegUnavailableError = vi.fn(() => 'FFmpeg is not available')
const ffmpegConvertLocalFile = vi.fn(() => Promise.resolve())
const splitAudioByTime = vi.fn(() => Promise.resolve())
const buildMetadataArgs = vi.fn(() => [])
const addToHistory = vi.fn()
const showNotification = vi.fn()
const applyMetadataToFile = vi.fn(() => Promise.resolve())
const mockSend = vi.fn()
const getMainWindow = vi.fn(() => ({ webContents: { send: mockSend } }))
const sanitizeUrl = vi.fn((url) => {
  if (!url || typeof url !== 'string' || !url.startsWith('http')) {
    throw new Error('Invalid URL format')
  }
  return url
})

function patchRequireCache(modulePath, mockExports) {
  const resolved = require.resolve(modulePath)
  const mod = require.cache[resolved] || { id: resolved, filename: resolved, loaded: true }
  mod.exports = mockExports
  require.cache[resolved] = mod
}

patchRequireCache('child_process', { ...childProcess, spawn: spawnMock })
patchRequireCache('../utils/paths', {
  getYtDlpPath: vi.fn(() => '/usr/local/bin/yt-dlp'),
  getFfmpegPath: vi.fn(() => '/usr/local/bin/ffmpeg'),
})
patchRequireCache('../utils/url', { sanitizeUrl })
patchRequireCache('../utils/filename', {
  getFormatExtension: vi.fn(() => 'mp3'),
  getUniqueFilename: vi.fn((p) => p),
  sanitizeFolderName: vi.fn((n) => n),
  sanitizeFileName: vi.fn((n) => n),
})
patchRequireCache('./ffmpeg', {
  checkFfmpegAvailable,
  getFfmpegUnavailableError,
  splitAudioByTime,
  buildMetadataArgs,
  convertLocalFile: ffmpegConvertLocalFile,
})
patchRequireCache('./metadata', { applyMetadataToFile })
patchRequireCache('./history', { addToHistory })
patchRequireCache('./notifications', { showNotification })
patchRequireCache('../window', { getMainWindow })
patchRequireCache('./videoInfo', {})

const resolvedConversion = require.resolve('./conversion.js')
delete require.cache[resolvedConversion]

const { convert, convertLocalFile, cancelConversion, parseTimeToSeconds } =
  require('./conversion.js')

function tick() {
  return new Promise((r) => setTimeout(r, 10))
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.spyOn(fs, 'existsSync').mockReturnValue(true)
  vi.spyOn(fs, 'writeFileSync').mockReturnValue(undefined)
  vi.spyOn(fs, 'unlinkSync').mockReturnValue(undefined)
  vi.spyOn(fs, 'mkdirSync').mockReturnValue(undefined)
  vi.spyOn(fs, 'readdirSync').mockReturnValue(['My Video.temp.mp3'])
  vi.spyOn(fs, 'renameSync').mockReturnValue(undefined)
  checkFfmpegAvailable.mockImplementation(() => Promise.resolve(true))
  ffmpegConvertLocalFile.mockImplementation(() => Promise.resolve())
  getMainWindow.mockReturnValue({ webContents: { send: mockSend } })
  sanitizeUrl.mockImplementation((url) => {
    if (!url || typeof url !== 'string' || !url.startsWith('http')) {
      throw new Error('Invalid URL format')
    }
    return url
  })
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('parseTimeToSeconds', () => {
  it('parses MM:SS format', () => {
    expect(parseTimeToSeconds('2:30')).toBe(150)
  })

  it('parses H:MM:SS format', () => {
    expect(parseTimeToSeconds('1:02:30')).toBe(3750)
  })

  it('parses pure seconds string', () => {
    expect(parseTimeToSeconds('45')).toBe(45)
  })

  it('returns null for null input', () => {
    expect(parseTimeToSeconds(null)).toBeNull()
  })

  it('returns null for empty string', () => {
    expect(parseTimeToSeconds('')).toBeNull()
  })

  it('returns null for undefined', () => {
    expect(parseTimeToSeconds(undefined)).toBeNull()
  })

  it('returns null for non-string input', () => {
    expect(parseTimeToSeconds(123)).toBeNull()
  })

  it('returns null when parts contain non-numeric characters', () => {
    expect(parseTimeToSeconds('abc:30')).toBeNull()
  })

  it('returns null for negative minutes', () => {
    expect(parseTimeToSeconds('-1:30')).toBeNull()
  })

  it('returns null when seconds >= 60 in MM:SS', () => {
    expect(parseTimeToSeconds('1:60')).toBeNull()
  })

  it('returns null when seconds >= 60 in H:MM:SS', () => {
    expect(parseTimeToSeconds('1:30:60')).toBeNull()
  })
})

describe('convert', () => {
  const validUrl = 'https://www.youtube.com/watch?v=test123'
  const baseOpts = { mode: 'audio', format: 'mp3', quality: 'best' }

  it('resolves on exit code 0 with rename, history, and notification', async () => {
    const fake = createFakeChildProcess()
    spawnMock.mockReturnValue(fake.process)

    const promise = convert(validUrl, baseOpts)
    await tick()
    fake.emitClose(0)

    const result = await promise
    expect(result.success).toBe(true)
    expect(result.fileName).toBe('My Video.mp3')
    expect(addToHistory).toHaveBeenCalled()
    expect(showNotification).toHaveBeenCalledWith(
      'Conversion Complete',
      expect.stringContaining('My Video.mp3')
    )
    expect(fs.renameSync).toHaveBeenCalled()
  })

  it('rejects when ffmpeg is unavailable', async () => {
    checkFfmpegAvailable.mockImplementation(() => Promise.resolve(false))
    await expect(convert(validUrl, baseOpts)).rejects.toThrow('FFmpeg is not available')
  })

  it('rejects with invalid URL', async () => {
    await expect(convert('not-a-url', baseOpts)).rejects.toThrow('Invalid URL')
  })

  it('rejects on non-zero exit code', async () => {
    const fake = createFakeChildProcess()
    spawnMock.mockReturnValue(fake.process)

    const promise = convert(validUrl, baseOpts)
    await tick()
    fake.emitStderr('ERROR: Video unavailable\n')
    fake.emitClose(1)

    await expect(promise).rejects.toThrow('ERROR: Video unavailable')
  })

  it('rejects on spawn error event', async () => {
    const fake = createFakeChildProcess()
    spawnMock.mockReturnValue(fake.process)

    const promise = convert(validUrl, baseOpts)
    await tick()
    fake.emitError(new Error('spawn ENOENT'))

    await expect(promise).rejects.toThrow('spawn ENOENT')
  })

  it('rejects when cancelled mid-conversion', async () => {
    const fake = createFakeChildProcess()
    fake.process.kill = vi.fn()
    spawnMock.mockReturnValue(fake.process)

    const promise = convert(validUrl, baseOpts)
    await tick()

    cancelConversion()
    await tick()
    fake.process.emit('close', 0)

    await expect(promise).rejects.toThrow('cancelled')
  })

  it('sends progress when stdout emits download percentage', async () => {
    const fake = createFakeChildProcess()
    spawnMock.mockReturnValue(fake.process)

    const promise = convert(validUrl, baseOpts)
    await tick()
    fake.emitStdout('[download]  50.0% of 10.00MiB at 1.00MiB/s ETA 00:05\n')
    fake.emitClose(0)

    await promise
    const progressCalls = mockSend.mock.calls.filter(
      ([channel]) => channel === 'conversion-progress'
    )
    const hasProgress = progressCalls.some(
      ([, data]) => data.type === 'progress' && data.percent === 50.0
    )
    expect(hasProgress).toBe(true)
  })

  it('sends playlist progress for playlist mode', async () => {
    const fake = createFakeChildProcess()
    spawnMock.mockReturnValue(fake.process)

    const promise = convert(validUrl, { ...baseOpts, playlistMode: 'full' })
    await tick()
    fake.emitStdout('[download] Downloading item 2 of 5\n')
    fake.emitStdout('[download]  50.0% of 10.00MiB\n')
    fake.emitClose(0)

    await promise
    const progressCalls = mockSend.mock.calls.filter(
      ([channel]) => channel === 'conversion-progress'
    )
    const hasPlaylistProgress = progressCalls.some(
      ([, data]) => data.type === 'playlist-progress'
    )
    expect(hasPlaylistProgress).toBe(true)
  })
})

describe('convertLocalFile', () => {
  const filePath = '/tmp/test-video.mp4'
  const baseOpts = { mode: 'audio', format: 'mp3', quality: 'best' }

  it('rejects when ffmpeg is unavailable', async () => {
    checkFfmpegAvailable.mockImplementation(() => Promise.resolve(false))
    await expect(convertLocalFile(filePath, baseOpts)).rejects.toThrow('FFmpeg is not available')
  })

  it('rejects when file does not exist', async () => {
    fs.existsSync.mockImplementation((p) => {
      if (p === filePath) return false
      return true
    })
    await expect(convertLocalFile(filePath, baseOpts)).rejects.toThrow('File not found')
  })

  it('resolves on successful delegation to ffmpeg', async () => {
    const result = await convertLocalFile(filePath, baseOpts)
    expect(result.success).toBe(true)
    expect(result.fileName).toBeDefined()
    expect(addToHistory).toHaveBeenCalled()
    expect(showNotification).toHaveBeenCalledWith(
      'Conversion Complete',
      expect.any(String)
    )
  })
})

describe('cancelConversion', () => {
  it('returns failure when no conversion is in progress', () => {
    const result = cancelConversion()
    expect(result.success).toBe(false)
    expect(result.message).toMatch(/no conversion/i)
  })

  it('returns failure when cancelling again after conversion finished', async () => {
    const fake = createFakeChildProcess()
    spawnMock.mockReturnValue(fake.process)

    const promise = convert('https://www.youtube.com/watch?v=done', {
      mode: 'audio',
      format: 'mp3',
    })
    await tick()
    fake.emitClose(0)
    await promise

    const second = cancelConversion()
    expect(second.success).toBe(false)
    expect(second.message).toMatch(/no conversion/i)
  })

  it('returns failure on second cancel when nothing is running', () => {
    const first = cancelConversion()
    expect(first.success).toBe(false)
    const second = cancelConversion()
    expect(second.success).toBe(false)
  })

  it('kills the process and returns success during active conversion', async () => {
    const fake = createFakeChildProcess()
    fake.process.kill = vi.fn()
    spawnMock.mockReturnValue(fake.process)

    const promise = convert('https://www.youtube.com/watch?v=abc', {
      mode: 'audio',
      format: 'mp3',
    })
    await tick()

    const cancelResult = cancelConversion()
    expect(cancelResult.success).toBe(true)
    expect(cancelResult.cancelled).toBe(true)

    fake.process.emit('close', 0)
    await expect(promise).rejects.toThrow('cancelled')
  })
})

describe('convert concurrency', () => {
  const validUrl = 'https://www.youtube.com/watch?v=concurrent'
  const baseOpts = { mode: 'audio', format: 'mp3', quality: 'best' }

  it('kills the previous process when a new convert starts', async () => {
    const fake1 = createFakeChildProcess()
    const killSpy = vi.spyOn(fake1.process, 'kill')
    const fake2 = createFakeChildProcess()
    spawnMock.mockReturnValueOnce(fake1.process).mockReturnValueOnce(fake2.process)

    const p1 = convert(validUrl, baseOpts)
    const p1Settled = p1.catch(() => {})
    await tick()

    const p2 = convert(validUrl, baseOpts)
    await tick()

    expect(spawnMock).toHaveBeenCalledTimes(2)
    expect(killSpy).toHaveBeenCalled()

    await expect(p1).rejects.toThrow()
    await p1Settled

    fake2.emitClose(0)
    await p2
  })

  it('allows a new convert after cancel', async () => {
    const fake1 = createFakeChildProcess()
    spawnMock.mockReturnValueOnce(fake1.process)
    const p1 = convert(validUrl, baseOpts)
    await tick()
    cancelConversion()
    fake1.process.emit('close', 0)
    await expect(p1).rejects.toThrow('cancelled')

    const fake2 = createFakeChildProcess()
    spawnMock.mockReturnValueOnce(fake2.process)
    const p2 = convert(validUrl, baseOpts)
    await tick()
    fake2.emitClose(0)
    const result = await p2
    expect(result.success).toBe(true)
  })
})
