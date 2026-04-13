/**
 * Custom hook for fetching video preview information
 * Handles video info, playlist detection, and chapter info
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { normalizeUrl, isValidUrl } from '../utils';

/**
 * Hook for fetching video preview information
 * @param {string} url - The URL to fetch preview for
 * @param {Object} options - Configuration options
 * @param {number} options.debounceMs - Debounce delay in milliseconds (default: 500)
 * @returns {Object} Preview state and data
 */
export function useVideoPreview(url, { debounceMs = 500 } = {}) {
  const [videoInfo, setVideoInfo] = useState(null);
  const [playlistInfo, setPlaylistInfo] = useState(null);
  const [chapterInfo, setChapterInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingChapters, setLoadingChapters] = useState(false);
  const [error, setError] = useState(null);
  const previewTimeoutRef = useRef(null);
  const chapterTimeoutRef = useRef(null);

  // Reset all state
  const reset = useCallback(() => {
    setVideoInfo(null);
    setPlaylistInfo(null);
    setChapterInfo(null);
    setError(null);
    setLoading(false);
    setLoadingChapters(false);
  }, []);

  // Fetch video and playlist info
  useEffect(() => {
    // Clear previous timeout
    if (previewTimeoutRef.current) {
      clearTimeout(previewTimeoutRef.current);
    }

    // Reset state
    reset();

    // Validate URL
    const trimmed = url.trim();
    if (!trimmed) {
      return;
    }

    const validation = isValidUrl(trimmed);
    if (!validation.valid) {
      return;
    }

    // Debounce preview fetch
    setLoading(true);
    previewTimeoutRef.current = setTimeout(async () => {
      try {
        const normalizedUrl = normalizeUrl(trimmed);

        // Fetch both video info and playlist info in parallel
        const [videoInfoResult, playlistInfoResult] = await Promise.allSettled([
          window.api?.getVideoInfo?.(normalizedUrl) || Promise.resolve({ success: false }),
          window.api?.getPlaylistInfo?.(normalizedUrl) ||
            Promise.resolve({ success: false, isPlaylist: false }),
        ]);

        // Handle video info
        if (videoInfoResult.status === 'fulfilled' && videoInfoResult.value.success) {
          setVideoInfo(videoInfoResult.value);
          setError(null);
        } else if (videoInfoResult.status === 'fulfilled' && !videoInfoResult.value.success) {
          const v = videoInfoResult.value;
          setError(v.error || v.message || 'Failed to load video preview');
          setVideoInfo(null);
        } else if (videoInfoResult.status === 'rejected') {
          setError('Failed to load video preview');
          setVideoInfo(null);
        }

        // Handle playlist info
        if (playlistInfoResult.status === 'fulfilled' && playlistInfoResult.value.success) {
          if (playlistInfoResult.value.isPlaylist) {
            setPlaylistInfo(playlistInfoResult.value);
          } else {
            setPlaylistInfo(null);
          }
        }
      } catch (err) {
        console.error('Preview fetch error:', err);
        setError(err.message || 'Failed to load video preview');
        setVideoInfo(null);
        setPlaylistInfo(null);
      } finally {
        setLoading(false);
      }
    }, debounceMs);

    return () => {
      if (previewTimeoutRef.current) {
        clearTimeout(previewTimeoutRef.current);
      }
    };
  }, [url, debounceMs, reset]);

  // Fetch chapter info when video info is loaded (but NOT for playlists)
  useEffect(() => {
    // Clear previous timeout
    if (chapterTimeoutRef.current) {
      clearTimeout(chapterTimeoutRef.current);
    }

    // Reset chapter state
    setChapterInfo(null);
    setLoadingChapters(false);

    // Only fetch chapters if we have valid video info and NOT a playlist
    if (!videoInfo || !videoInfo.success || playlistInfo?.isPlaylist) {
      return;
    }

    const trimmed = url.trim();
    if (!trimmed) {
      return;
    }

    const validation = isValidUrl(trimmed);
    if (!validation.valid) {
      return;
    }

    // Debounce chapter fetch
    setLoadingChapters(true);
    chapterTimeoutRef.current = setTimeout(async () => {
      try {
        const normalizedUrl = normalizeUrl(trimmed);

        const result = await window.api?.getChapterInfo?.(normalizedUrl);

        if (result?.success && result.hasChapters) {
          setChapterInfo(result);
        } else {
          setChapterInfo(null);
        }
      } catch (err) {
        console.error('Chapter fetch error:', err);
        setChapterInfo(null);
      } finally {
        setLoadingChapters(false);
      }
    }, debounceMs);

    return () => {
      if (chapterTimeoutRef.current) {
        clearTimeout(chapterTimeoutRef.current);
      }
    };
  }, [videoInfo, playlistInfo, url, debounceMs]);

  return {
    videoInfo,
    playlistInfo,
    chapterInfo,
    loading,
    loadingChapters,
    error,
    isPlaylist: playlistInfo?.isPlaylist || false,
    hasChapters: chapterInfo?.hasChapters || false,
    reset,
  };
}

export default useVideoPreview;
