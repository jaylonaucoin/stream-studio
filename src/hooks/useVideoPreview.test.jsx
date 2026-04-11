import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useVideoPreview } from './useVideoPreview';
import { createRendererApiMock, installWindowApi } from '../../tests/setup/renderer-api-mock.js';

describe('useVideoPreview', () => {
  let teardownApi

  beforeEach(() => {
    const { api } = createRendererApiMock()
    api.getVideoInfo.mockResolvedValue({
      success: true,
      title: 'Vid',
      thumbnail: null,
      extractor: 'youtube',
    })
    api.getPlaylistInfo.mockResolvedValue({ success: false, isPlaylist: false })
    api.getChapterInfo.mockResolvedValue({ success: false, hasChapters: false })
    teardownApi = installWindowApi(api)
  })

  afterEach(() => {
    teardownApi?.()
    vi.clearAllMocks()
  })

  it('skips fetch for empty url', () => {
    const { result } = renderHook(() => useVideoPreview('', { debounceMs: 300 }))
    expect(result.current.loading).toBe(false)
    expect(window.api.getVideoInfo).not.toHaveBeenCalled()
  })

  it('debounces and loads video info', async () => {
    const { result, rerender } = renderHook(
      ({ url }) => useVideoPreview(url, { debounceMs: 30 }),
      { initialProps: { url: '' } }
    )
    rerender({ url: 'https://www.youtube.com/watch?v=testid' })
    expect(result.current.loading).toBe(true)
    await waitFor(
      () => {
        expect(result.current.loading).toBe(false)
      },
      { timeout: 4000 }
    )
    expect(window.api.getVideoInfo).toHaveBeenCalled()
    expect(result.current.videoInfo?.title).toBe('Vid')
  })

  it('handles API error response gracefully', async () => {
    window.api.getVideoInfo.mockResolvedValue({
      success: false,
      error: 'Video not found',
    })
    const { result, rerender } = renderHook(
      ({ url }) => useVideoPreview(url, { debounceMs: 30 }),
      { initialProps: { url: '' } }
    )
    rerender({ url: 'https://www.youtube.com/watch?v=missing' })
    await waitFor(
      () => {
        expect(result.current.loading).toBe(false)
      },
      { timeout: 4000 }
    )
    expect(result.current.videoInfo).toBeNull()
    expect(result.current.error).toBe('Video not found')
  })

  it('handles invalid URL (non-http)', () => {
    const { result } = renderHook(() =>
      useVideoPreview('ftp://example.com/file', { debounceMs: 30 })
    )
    expect(result.current.loading).toBe(false)
    expect(window.api.getVideoInfo).not.toHaveBeenCalled()
  })
})
