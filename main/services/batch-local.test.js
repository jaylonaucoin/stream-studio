import { createRequire } from 'node:module'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const require = createRequire(import.meta.url)

const fs = require('fs')
const path = require('path')

const mockSend = vi.fn()
const getMainWindow = vi.fn(() => ({ webContents: { send: mockSend } }))
const applyMetadataToFile = vi.fn(() => Promise.resolve({ success: true }))
const convertLocalFile = vi.fn(() =>
  Promise.resolve({ success: true, filePath: '/out/file.mp3' })
)
const mockParseFile = vi.fn(() =>
  Promise.resolve({
    common: {
      title: 'Test Song',
      artist: 'Test Artist',
      album: 'Test Album',
      track: { no: 1, of: 12 },
    },
  })
)

function patchRequireCache(modulePath, mockExports) {
  const resolved = require.resolve(modulePath)
  const mod = require.cache[resolved] || { id: resolved, filename: resolved, loaded: true }
  mod.exports = mockExports
  require.cache[resolved] = mod
}

patchRequireCache('../window', { getMainWindow })
patchRequireCache('./metadata', { applyMetadataToFile })
patchRequireCache('./conversion', { convertLocalFile })
patchRequireCache('../utils/filename', {
  getFormatExtension: vi.fn(() => 'mp3'),
  getUniqueFilename: vi.fn((p) => p),
  sanitizeFolderName: vi.fn((n) => n),
  sanitizeFileName: vi.fn((n) => n),
})

const resolvedBatchLocal = require.resolve('./batch-local.js')
delete require.cache[resolvedBatchLocal]

const batchLocal = require('./batch-local.js')

batchLocal._loadMusicMetadataOverride = { parseFile: mockParseFile }

const {
  enumeratePaths,
  readAudioMetadata,
  readMetadataBatch,
  applyMetadataBatch,
  dryRunLocalBatch,
  convertLocalBatch,
  cancelBatchJob,
  resetBatchCancel,
  MEDIA_EXTENSIONS,
  DEFAULT_MAX_FILES,
} = batchLocal

beforeEach(() => {
  vi.clearAllMocks()
  resetBatchCancel()
  getMainWindow.mockReturnValue({ webContents: { send: mockSend } })
  applyMetadataToFile.mockImplementation(() => Promise.resolve({ success: true }))
  convertLocalFile.mockImplementation(() =>
    Promise.resolve({ success: true, filePath: '/out/file.mp3' })
  )
  mockParseFile.mockResolvedValue({
    common: {
      title: 'Test Song',
      artist: 'Test Artist',
      album: 'Test Album',
      track: { no: 1, of: 12 },
    },
  })
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('MEDIA_EXTENSIONS', () => {
  it('contains common audio and video extensions', () => {
    expect(MEDIA_EXTENSIONS.has('.mp3')).toBe(true)
    expect(MEDIA_EXTENSIONS.has('.mp4')).toBe(true)
    expect(MEDIA_EXTENSIONS.has('.flac')).toBe(true)
    expect(MEDIA_EXTENSIONS.has('.wav')).toBe(true)
    expect(MEDIA_EXTENSIONS.has('.mkv')).toBe(true)
    expect(MEDIA_EXTENSIONS.has('.ogg')).toBe(true)
  })

  it('does not contain non-media extensions', () => {
    expect(MEDIA_EXTENSIONS.has('.txt')).toBe(false)
    expect(MEDIA_EXTENSIONS.has('.pdf')).toBe(false)
    expect(MEDIA_EXTENSIONS.has('.js')).toBe(false)
  })
})

describe('DEFAULT_MAX_FILES', () => {
  it('is 3000', () => {
    expect(DEFAULT_MAX_FILES).toBe(3000)
  })
})

describe('enumeratePaths', () => {
  it('returns a single media file passed directly', () => {
    vi.spyOn(fs, 'existsSync').mockReturnValue(true)
    vi.spyOn(fs, 'statSync').mockReturnValue({ isFile: () => true, isDirectory: () => false })

    const result = enumeratePaths(['/music/song.mp3'])
    expect(result.paths).toHaveLength(1)
    expect(result.paths[0]).toBe(path.normalize('/music/song.mp3'))
    expect(result.truncated).toBe(false)
  })

  it('filters non-media files from a directory', () => {
    vi.spyOn(fs, 'existsSync').mockReturnValue(true)
    vi.spyOn(fs, 'statSync').mockReturnValue({ isFile: () => false, isDirectory: () => true })
    vi.spyOn(fs, 'readdirSync').mockReturnValue([
      { name: 'track.mp3', isFile: () => true, isDirectory: () => false },
      { name: 'readme.txt', isFile: () => true, isDirectory: () => false },
      { name: 'video.mp4', isFile: () => true, isDirectory: () => false },
      { name: 'notes.pdf', isFile: () => true, isDirectory: () => false },
    ])

    const result = enumeratePaths(['/music'])
    expect(result.paths).toHaveLength(2)
    expect(result.paths.some((p) => p.includes('track.mp3'))).toBe(true)
    expect(result.paths.some((p) => p.includes('video.mp4'))).toBe(true)
    expect(result.paths.some((p) => p.includes('readme.txt'))).toBe(false)
  })

  it('skips non-existent paths', () => {
    vi.spyOn(fs, 'existsSync').mockReturnValue(false)

    const result = enumeratePaths(['/does/not/exist.mp3'])
    expect(result.paths).toHaveLength(0)
  })

  it('caps results at maxFiles and sets truncated flag', () => {
    vi.spyOn(fs, 'existsSync').mockReturnValue(true)
    vi.spyOn(fs, 'statSync').mockReturnValue({ isFile: () => false, isDirectory: () => true })

    const entries = Array.from({ length: 10 }, (_, i) => ({
      name: `track${i}.mp3`,
      isFile: () => true,
      isDirectory: () => false,
    }))
    vi.spyOn(fs, 'readdirSync').mockReturnValue(entries)

    const result = enumeratePaths(['/music'], { maxFiles: 3 })
    expect(result.paths).toHaveLength(3)
    expect(result.truncated).toBe(true)
  })

  it('returns sorted paths', () => {
    vi.spyOn(fs, 'existsSync').mockReturnValue(true)
    vi.spyOn(fs, 'statSync').mockReturnValue({ isFile: () => false, isDirectory: () => true })
    vi.spyOn(fs, 'readdirSync').mockReturnValue([
      { name: 'zebra.mp3', isFile: () => true, isDirectory: () => false },
      { name: 'alpha.mp3', isFile: () => true, isDirectory: () => false },
      { name: 'middle.flac', isFile: () => true, isDirectory: () => false },
    ])

    const result = enumeratePaths(['/music'])
    const names = result.paths.map((p) => path.basename(p))
    expect(names).toEqual(['alpha.mp3', 'middle.flac', 'zebra.mp3'])
  })

  it('skips falsy and non-string entries', () => {
    const result = enumeratePaths([null, undefined, '', 42])
    expect(result.paths).toHaveLength(0)
  })

  it('skips hidden dotfiles inside directories', () => {
    vi.spyOn(fs, 'existsSync').mockReturnValue(true)
    vi.spyOn(fs, 'statSync').mockReturnValue({ isFile: () => false, isDirectory: () => true })
    vi.spyOn(fs, 'readdirSync').mockReturnValue([
      { name: '.hidden.mp3', isFile: () => true, isDirectory: () => false },
      { name: 'visible.mp3', isFile: () => true, isDirectory: () => false },
    ])

    const result = enumeratePaths(['/music'])
    expect(result.paths).toHaveLength(1)
    expect(path.basename(result.paths[0])).toBe('visible.mp3')
  })
})

describe('dryRunLocalBatch', () => {
  it('returns ok: true for a readable/writable file', () => {
    vi.spyOn(fs, 'existsSync').mockReturnValue(true)
    vi.spyOn(fs, 'accessSync').mockReturnValue(undefined)

    const { results } = dryRunLocalBatch(['/music/song.mp3'])
    expect(results).toHaveLength(1)
    expect(results[0].ok).toBe(true)
  })

  it('returns ok: false for a non-existent file', () => {
    vi.spyOn(fs, 'existsSync').mockReturnValue(false)

    const { results } = dryRunLocalBatch(['/missing/file.mp3'])
    expect(results).toHaveLength(1)
    expect(results[0].ok).toBe(false)
    expect(results[0].error).toMatch(/not found/i)
  })

  it('returns ok: false for an invalid path', () => {
    const { results } = dryRunLocalBatch([null, ''])
    expect(results).toHaveLength(2)
    expect(results[0].ok).toBe(false)
    expect(results[0].error).toMatch(/invalid/i)
    expect(results[1].ok).toBe(false)
    expect(results[1].error).toMatch(/invalid/i)
  })

  it('returns ok: false when access is denied', () => {
    vi.spyOn(fs, 'existsSync').mockReturnValue(true)
    vi.spyOn(fs, 'accessSync').mockImplementation(() => {
      throw new Error('EACCES: permission denied')
    })

    const { results } = dryRunLocalBatch(['/locked/file.mp3'])
    expect(results[0].ok).toBe(false)
    expect(results[0].error).toMatch(/EACCES/)
  })
})

describe('readMetadataBatch', () => {
  it('returns failure for non-existent files', async () => {
    vi.spyOn(fs, 'existsSync').mockReturnValue(false)

    const { results } = await readMetadataBatch(['/missing.mp3'])
    expect(results).toHaveLength(1)
    expect(results[0].success).toBe(false)
    expect(results[0].error).toMatch(/not found/i)
  })

  it('returns failure for invalid path values', async () => {
    const { results } = await readMetadataBatch([null, '', 42])
    expect(results).toHaveLength(3)
    results.forEach((r) => {
      expect(r.success).toBe(false)
      expect(r.error).toBe('Invalid path')
    })
  })

  it('handles empty array input', async () => {
    const { results } = await readMetadataBatch([])
    expect(results).toHaveLength(0)
  })

  it('treats non-array input as empty', async () => {
    const { results } = await readMetadataBatch(null)
    expect(results).toHaveLength(0)
  })
})

describe('cancelBatchJob / resetBatchCancel', () => {
  it('cancels in-flight batch and resets the flag', async () => {
    vi.spyOn(fs, 'existsSync').mockReturnValue(true)

    let callCount = 0
    applyMetadataToFile.mockImplementation(async () => {
      callCount++
      if (callCount === 1) cancelBatchJob()
      return { success: true }
    })

    const { results, cancelled } = await applyMetadataBatch({
      paths: ['/a.mp3', '/b.mp3', '/c.mp3'],
      patch: { artist: 'New' },
      strategy: 'replace',
    })

    expect(cancelled).toBe(true)
    expect(results.length).toBeLessThan(3)

    resetBatchCancel()

    const { cancelled: c2 } = await applyMetadataBatch({
      paths: ['/x.mp3'],
      patch: { artist: 'After Reset' },
      strategy: 'replace',
    })
    expect(c2).toBe(false)
  })
})

describe('applyMetadataBatch', () => {
  beforeEach(() => {
    vi.spyOn(fs, 'existsSync').mockReturnValue(true)
  })

  it('applies metadata with replace strategy', async () => {
    const { results } = await applyMetadataBatch({
      paths: ['/song.mp3'],
      patch: { artist: 'Replaced Artist', title: 'Replaced Title' },
      strategy: 'replace',
    })

    expect(results).toHaveLength(1)
    expect(results[0].success).toBe(true)
    const writtenMeta = applyMetadataToFile.mock.calls[0][1]
    expect(writtenMeta.artist).toBe('Replaced Artist')
    expect(writtenMeta.title).toBe('Replaced Title')
  })

  it('overlays per-file patches on top of shared patch', async () => {
    await applyMetadataBatch({
      paths: ['/a.mp3', '/b.mp3'],
      patch: { artist: 'Shared Artist' },
      perFilePatches: {
        '/a.mp3': { title: 'Title A' },
        '/b.mp3': { title: 'Title B' },
      },
      strategy: 'replace',
    })

    expect(applyMetadataToFile).toHaveBeenCalledTimes(2)
    const metaA = applyMetadataToFile.mock.calls[0][1]
    expect(metaA.artist).toBe('Shared Artist')
    expect(metaA.title).toBe('Title A')

    const metaB = applyMetadataToFile.mock.calls[1][1]
    expect(metaB.artist).toBe('Shared Artist')
    expect(metaB.title).toBe('Title B')
  })

  it('stops processing when cancelled mid-batch', async () => {
    let count = 0
    applyMetadataToFile.mockImplementation(async () => {
      count++
      if (count >= 1) cancelBatchJob()
      return { success: true }
    })

    const { results, cancelled } = await applyMetadataBatch({
      paths: ['/a.mp3', '/b.mp3', '/c.mp3', '/d.mp3'],
      patch: { artist: 'X' },
      strategy: 'replace',
    })

    expect(cancelled).toBe(true)
    expect(results.length).toBeLessThan(4)
  })

  it('reports failure for missing files', async () => {
    vi.spyOn(fs, 'existsSync').mockImplementation((p) => p !== '/gone.mp3')

    const { results } = await applyMetadataBatch({
      paths: ['/gone.mp3'],
      patch: { artist: 'X' },
      strategy: 'replace',
    })

    expect(results[0].success).toBe(false)
    expect(results[0].error).toMatch(/not found/i)
  })

  it('sends batch progress events', async () => {
    await applyMetadataBatch({
      paths: ['/a.mp3'],
      patch: { artist: 'X' },
      strategy: 'replace',
    })

    const progressCalls = mockSend.mock.calls.filter(
      ([channel]) => channel === 'batch-job-progress'
    )
    expect(progressCalls.length).toBeGreaterThanOrEqual(2)
    expect(progressCalls[0][1]).toMatchObject({ phase: 'metadata' })
  })

  it('handles applyMetadataToFile failure gracefully', async () => {
    applyMetadataToFile.mockResolvedValue({ success: false, error: 'Write error' })

    const { results } = await applyMetadataBatch({
      paths: ['/a.mp3'],
      patch: { artist: 'X' },
      strategy: 'replace',
    })

    expect(results[0].success).toBe(false)
    expect(results[0].error).toBe('Write error')
  })
})

describe('convertLocalBatch', () => {
  beforeEach(() => {
    vi.spyOn(fs, 'existsSync').mockReturnValue(true)
  })

  it('converts files and returns success results', async () => {
    const { results } = await convertLocalBatch(['/a.mp3', '/b.flac'], {
      format: 'mp3',
      quality: 'best',
    })

    expect(results).toHaveLength(2)
    expect(results[0].success).toBe(true)
    expect(results[0].outputPath).toBe('/out/file.mp3')
    expect(results[1].success).toBe(true)
    expect(convertLocalFile).toHaveBeenCalledTimes(2)
  })

  it('sends progress events during conversion', async () => {
    await convertLocalBatch(['/a.mp3'], { format: 'mp3' })

    const progressCalls = mockSend.mock.calls.filter(
      ([channel]) => channel === 'batch-job-progress'
    )
    expect(progressCalls.length).toBeGreaterThanOrEqual(2)
    expect(progressCalls[0][1]).toMatchObject({ phase: 'convert' })
  })

  it('stops when cancelled mid-batch', async () => {
    let count = 0
    convertLocalFile.mockImplementation(async () => {
      count++
      if (count >= 1) cancelBatchJob()
      return { success: true, filePath: '/out/file.mp3' }
    })

    const { results, cancelled } = await convertLocalBatch(
      ['/a.mp3', '/b.mp3', '/c.mp3', '/d.mp3'],
      { format: 'mp3' }
    )

    expect(cancelled).toBe(true)
    expect(results.length).toBeLessThan(4)
  })

  it('handles conversion errors per file', async () => {
    convertLocalFile.mockRejectedValueOnce(new Error('FFmpeg crashed'))
    convertLocalFile.mockResolvedValueOnce({ success: true, filePath: '/out/b.mp3' })

    const { results } = await convertLocalBatch(['/a.mp3', '/b.mp3'], { format: 'mp3' })

    expect(results[0].success).toBe(false)
    expect(results[0].error).toMatch(/FFmpeg crashed/)
    expect(results[1].success).toBe(true)
  })

  it('skips non-existent files', async () => {
    vi.spyOn(fs, 'existsSync').mockImplementation((p) => p !== '/missing.mp3')

    const { results } = await convertLocalBatch(['/missing.mp3', '/ok.mp3'], { format: 'mp3' })

    expect(results[0].success).toBe(false)
    expect(results[0].error).toMatch(/not found/i)
    expect(results[1].success).toBe(true)
  })

  it('breaks out of loop when error message contains cancel', async () => {
    convertLocalFile.mockRejectedValueOnce(new Error('User cancelled operation'))

    const { results } = await convertLocalBatch(['/a.mp3', '/b.mp3'], { format: 'mp3' })

    expect(results).toHaveLength(1)
    expect(results[0].success).toBe(false)
    expect(convertLocalFile).toHaveBeenCalledTimes(1)
  })
})
