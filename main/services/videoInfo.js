/**
 * Video info service - fetches video/playlist metadata using yt-dlp
 * This module preserves the exact functionality from the original main.js
 */
const { spawn } = require('child_process');
const { getYtDlpPath } = require('../utils/paths');
const { sanitizeUrl } = require('../utils/url');

// Cache for video info to avoid redundant fetches
const videoInfoCache = new Map();
const chapterInfoCache = new Map();
const playlistInfoCache = new Map();
const audioStreamCache = new Map();
const VIDEO_CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const CHAPTER_CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const PLAYLIST_CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const AUDIO_STREAM_CACHE_TTL = 30 * 60 * 1000; // 30 minutes (stream URLs expire ~6h)

/**
 * Format duration from seconds to human readable string
 * @param {number} seconds
 * @returns {string}
 */
function formatDuration(seconds) {
  if (!seconds || isNaN(seconds)) return '';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Helper function to get high-quality thumbnail for a video
 * Returns an array of thumbnail URLs in quality order (highest to lowest)
 * Frontend will try them in sequence until one loads successfully
 * @param {string} videoId - Video ID
 * @param {string} videoUrl - Video URL
 * @param {string} platform - Platform name
 * @returns {Array<string>|null}
 */
function getHighQualityThumbnail(videoId, videoUrl, platform = 'youtube') {
  // For YouTube, construct high-quality thumbnail URL array
  if (platform === 'youtube' || videoUrl?.includes('youtube.com') || videoUrl?.includes('youtu.be')) {
    // YouTube thumbnail URL patterns (in order of quality - highest to lowest)
    const thumbnailUrls = [
      `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`,  // Highest quality (1280x720 or 1920x1080)
      `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,      // High quality (480x360)
      `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`,      // Medium quality (320x180)
    ];
    // Return array of URLs for frontend to try in sequence
    return thumbnailUrls;
  }

  // For other platforms, return null to use the thumbnail from flat-playlist
  return null;
}

/**
 * Get video info from URL
 * @param {string} url - Video URL
 * @returns {Promise<Object>}
 */
async function getVideoInfo(url) {
  // Sanitize URL
  const sanitizedUrl = sanitizeUrl(url);
  
  // Check cache first
  const cacheKey = sanitizedUrl;
  const cached = videoInfoCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < VIDEO_CACHE_TTL) {
    return cached.data;
  }

  const ytDlpPath = getYtDlpPath();
  const args = [
    '--dump-json',      // Output JSON metadata
    '--no-playlist',    // Don't download playlists
    '--no-warnings',    // Suppress warnings
    sanitizedUrl
  ];

  return new Promise((resolve, reject) => {
    const infoProcess = spawn(ytDlpPath, args, {
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';
    let timeoutId = null;
    
    // Set timeout (15 seconds - longer on Mac where yt-dlp can be slower)
    timeoutId = setTimeout(() => {
      infoProcess.kill();
      reject(new Error('Video info extraction timed out. The URL may be invalid or the video may be unavailable.'));
    }, 15000);

    infoProcess.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    infoProcess.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    infoProcess.on('close', (code) => {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      
      if (code === 0 && stdout) {
        try {
          const info = JSON.parse(stdout);
          
          // Extract relevant information
          // For music, prefer 'artist' field over 'uploader'/'channel' (which may be "Release - Topic")
          const artist = info.artist || info.artists?.[0] || info.creator || info.creators?.[0] || null;
          const uploader = info.uploader || info.channel || null;
          
          const videoInfo = {
            title: info.title || 'Unknown Title',
            thumbnail: info.thumbnail || info.thumbnails?.[0]?.url || null,
            duration: info.duration || null,
            artist: artist, // Actual artist name (preferred for music)
            uploader: uploader, // Channel/uploader name (fallback)
            viewCount: info.view_count || null,
            uploadDate: info.upload_date || null,
            description: info.description || null,
            webpageUrl: info.webpage_url || sanitizedUrl,
          };
          
          // Format duration
          if (videoInfo.duration) {
            videoInfo.durationFormatted = formatDuration(videoInfo.duration);
          }
          
          // Cache the result
          const result = { success: true, ...videoInfo };
          videoInfoCache.set(cacheKey, {
            data: result,
            timestamp: Date.now()
          });
          
          resolve(result);
        } catch (parseError) {
          reject(new Error(`Failed to parse video info: ${parseError.message}`));
        }
      } else {
        // Parse error from stderr
        const errorLower = stderr.toLowerCase();
        let errorMsg = 'Failed to get video info. ';
        
        if (errorLower.includes('private') || errorLower.includes('unavailable')) {
          errorMsg += 'Video is private or unavailable.';
        } else if (errorLower.includes('sign in') || errorLower.includes('login')) {
          errorMsg += 'This video requires sign-in to access.';
        } else if (errorLower.includes('age')) {
          errorMsg += 'This video is age-restricted.';
        } else if (errorLower.includes('not found') || errorLower.includes('does not exist')) {
          errorMsg += 'Video not found.';
        } else {
          errorMsg += 'Please check the URL and try again.';
        }
        
        reject(new Error(errorMsg));
      }
    });

    infoProcess.on('error', (error) => {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      
      if (error.code === 'ENOENT') {
        reject(new Error('yt-dlp binary not found. Please ensure yt-dlp is installed.'));
      } else {
        reject(new Error(`Failed to get video info: ${error.message}`));
      }
    });
  });
}

/**
 * Get playlist info from URL
 * @param {string} url - Playlist URL
 * @returns {Promise<Object>}
 */
async function getPlaylistInfo(url) {
  // Sanitize URL
  const sanitizedUrl = sanitizeUrl(url);
  
  // Check cache first
  const cacheKey = sanitizedUrl;
  const cached = playlistInfoCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < PLAYLIST_CACHE_TTL) {
    return cached.data;
  }
  
  const ytDlpPath = getYtDlpPath();
  
  // First, try to get info with --yes-playlist to check if it's a playlist
  const playlistArgs = [
    '--flat-playlist',   // Don't download, just list items
    '--dump-json',       // Output JSON metadata
    '--yes-playlist',    // Force playlist mode
    '--no-warnings',     // Suppress warnings
    sanitizedUrl
  ];

  return new Promise((resolve, reject) => {
    const playlistProcess = spawn(ytDlpPath, playlistArgs, {
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';
    let timeoutId = null;
    
    // Set timeout (15 seconds for playlist info extraction - same as original)
    timeoutId = setTimeout(() => {
      playlistProcess.kill();
      reject(new Error('Playlist info extraction timed out.'));
    }, 15000);

    playlistProcess.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    playlistProcess.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    playlistProcess.on('close', async (code) => {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      
      if (code === 0 && stdout) {
        try {
          // Parse all JSON lines (one per video in playlist)
          const lines = stdout.trim().split('\n').filter(line => line.trim());
          
          if (lines.length === 0) {
            // Not a playlist or empty
            const result = { success: true, isPlaylist: false };
            playlistInfoCache.set(cacheKey, {
              data: result,
              timestamp: Date.now()
            });
            resolve(result);
            return;
          }
          
          // Parse first entry to get playlist metadata
          const firstEntry = JSON.parse(lines[0]);
          
          // Check if this is actually a playlist or just a single video
          // Be strict: only consider it a playlist if:
          // 1. There are multiple videos (lines.length > 1), OR
          // 2. There's a meaningful playlist title (not empty, not "Untitled Playlist")
          const playlistTitle = firstEntry.playlist || firstEntry.playlist_title || '';
          const hasValidPlaylistTitle = playlistTitle && 
            playlistTitle !== 'Untitled Playlist' && 
            playlistTitle.trim() !== '';
          const isPlaylist = lines.length > 1 || hasValidPlaylistTitle;
          
          if (!isPlaylist) {
            const result = { success: true, isPlaylist: false };
            playlistInfoCache.set(cacheKey, {
              data: result,
              timestamp: Date.now()
            });
            resolve(result);
            return;
          }
          
          // Parse all videos and calculate total duration
          let totalDuration = 0;
          const videos = [];
          
          lines.forEach((line, lineIndex) => {
            try {
              const entry = JSON.parse(line);
              
              // Extract video details
              const videoId = entry.id || entry.url?.split('/').pop() || null;
              const videoTitle = entry.title || `Video ${lineIndex + 1}`;
              const videoDuration = entry.duration || 0;
              const videoUrl = entry.url || entry.webpage_url || null;
              const videoThumbnail = entry.thumbnail || entry.thumbnails?.[0]?.url || null;
              // playlist_index from yt-dlp is already 1-based, use it directly
              // If not present, use lineIndex (which is 0-based) + 1
              const playlistIndex = entry.playlist_index !== undefined ? entry.playlist_index : lineIndex + 1;
              // Extract artist if available (for music playlists)
              const videoArtist = entry.artist || entry.artists?.[0] || entry.creator || entry.creators?.[0] || null;
              
              videos.push({
                id: videoId,
                title: videoTitle,
                duration: videoDuration,
                durationFormatted: formatDuration(videoDuration),
                index: playlistIndex,
                url: videoUrl,
                thumbnail: videoThumbnail,
                artist: videoArtist, // Actual artist name (if available)
              });
              
              if (entry.duration) {
                totalDuration += entry.duration;
              }
            } catch (e) {
              // Skip invalid entries
              console.warn('Failed to parse playlist entry:', e);
            }
          });
          
          // Get high-quality thumbnail for first video (used as playlist thumbnail)
          if (videos.length > 0 && videos[0].id) {
            try {
              const firstVideo = videos[0];
              const originalThumbnail = firstVideo.thumbnail; // Preserve original thumbnail as fallback
              const platform = sanitizedUrl.includes('youtube.com') || sanitizedUrl.includes('youtu.be') ? 'youtube' : 'other';
              const highQualityThumbnails = getHighQualityThumbnail(firstVideo.id, firstVideo.url, platform);
              
              if (highQualityThumbnails && Array.isArray(highQualityThumbnails)) {
                // Put yt-dlp provided URL FIRST (guaranteed to exist by YouTube), 
                // then try higher quality alternatives as fallbacks
                // This fixes the issue where maxresdefault.jpg returns a gray placeholder
                // for videos that don't have high-res thumbnails
                const thumbnailUrls = originalThumbnail 
                  ? [originalThumbnail, ...highQualityThumbnails] 
                  : [...highQualityThumbnails];
                // Store as array - frontend will try URLs in sequence
                firstVideo.thumbnail = thumbnailUrls;
                videos[0] = firstVideo;
              }
            } catch (thumbnailError) {
              console.warn('Failed to get high-quality thumbnail:', thumbnailError);
            }
          }
          
          // Format total duration
          const totalDurationFormatted = formatDuration(totalDuration);
          
          const result = {
            success: true,
            isPlaylist: true,
            playlistTitle: playlistTitle || 'Playlist',
            playlistVideoCount: videos.length,
            playlistTotalDuration: totalDuration,
            playlistTotalDurationFormatted: totalDurationFormatted,
            playlistUploader: firstEntry.uploader || firstEntry.channel || null,
            videos,
          };
          
          // Cache the result
          playlistInfoCache.set(cacheKey, {
            data: result,
            timestamp: Date.now()
          });
          
          resolve(result);
        } catch (parseError) {
          reject(new Error(`Failed to parse playlist info: ${parseError.message}`));
        }
      } else {
        // Not a playlist or error
        const result = { success: true, isPlaylist: false };
        playlistInfoCache.set(cacheKey, {
          data: result,
          timestamp: Date.now()
        });
        resolve(result);
      }
    });

    playlistProcess.on('error', (error) => {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      
      if (error.code === 'ENOENT') {
        reject(new Error('yt-dlp binary not found. Please ensure yt-dlp is installed.'));
      } else {
        reject(new Error(`Failed to get playlist info: ${error.message}`));
      }
    });
  });
}

/**
 * Get chapter info from URL
 * @param {string} url - Video URL
 * @returns {Promise<Object>}
 */
async function getChapterInfo(url) {
  // Sanitize URL
  const sanitizedUrl = sanitizeUrl(url);
  
  // Check cache first
  const cacheKey = sanitizedUrl;
  const cached = chapterInfoCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CHAPTER_CACHE_TTL) {
    return cached.data;
  }

  const ytDlpPath = getYtDlpPath();
  const args = [
    '--dump-json',
    '--no-playlist',
    '--no-warnings',
    sanitizedUrl,
  ];

  return new Promise((resolve, reject) => {
    const process = spawn(ytDlpPath, args, {
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let timeoutId = null;
    
    // Set timeout (10 seconds - same as video info)
    timeoutId = setTimeout(() => {
      process.kill();
      reject(new Error('Chapter info fetch timed out'));
    }, 10000);

    process.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    process.on('close', (code) => {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      
      if (code === 0 && stdout) {
        try {
          const info = JSON.parse(stdout);
          const chapters = info.chapters || [];
          
          if (chapters.length > 0) {
            const formattedChapters = chapters.map((chapter, index) => {
              const startTime = chapter.start_time || 0;
              const endTime = chapter.end_time || (info.duration || 0);
              const duration = endTime - startTime;
              
              return {
                index,
                title: chapter.title || `Chapter ${index + 1}`,
                startTime,
                endTime,
                duration,
                durationFormatted: formatDuration(duration),
                timeRange: `${formatDuration(startTime)} - ${formatDuration(endTime)}`,
              };
            });

            const result = {
              success: true,
              hasChapters: true,
              totalChapters: formattedChapters.length,
              chapters: formattedChapters,
            };
            
            // Cache the result
            chapterInfoCache.set(cacheKey, { data: result, timestamp: Date.now() });
            resolve(result);
          } else {
            resolve({ success: true, hasChapters: false, chapters: [] });
          }
        } catch (e) {
          reject(new Error('Failed to parse chapter info'));
        }
      } else {
        reject(new Error('Failed to get chapter info'));
      }
    });

    process.on('error', (err) => {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      reject(err);
    });
  });
}

/**
 * Parse a single yt-dlp flat-playlist JSON entry into a search result object.
 * @param {Object} entry
 * @returns {Object|null}
 */
function parseSearchEntry(entry) {
  const videoId = entry.id || null;
  const webpageUrl =
    entry.webpage_url ||
    entry.url ||
    (videoId ? `https://www.youtube.com/watch?v=${videoId}` : null);

  if (!webpageUrl) return null;

  const artist =
    entry.artist || entry.artists?.[0] || entry.creator || entry.creators?.[0] || null;
  const uploader = entry.uploader || entry.channel || null;
  const duration = entry.duration ?? null;
  let thumbnail = entry.thumbnail || entry.thumbnails?.[0]?.url || null;

  if (videoId && !thumbnail) {
    thumbnail = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
  } else if (videoId && thumbnail) {
    const highQualityThumbnails = getHighQualityThumbnail(videoId, webpageUrl, 'youtube');
    thumbnail = highQualityThumbnails ? [thumbnail, ...highQualityThumbnails] : thumbnail;
  }

  return {
    id: videoId,
    title: entry.title || 'Unknown Title',
    duration,
    durationFormatted: duration != null ? formatDuration(duration) : 'Live',
    thumbnail,
    webpageUrl,
    artist,
    uploader: uploader || artist,
    viewCount: entry.view_count ?? null,
  };
}

/**
 * Search YouTube by query (Chordify-style)
 * Uses yt-dlp ytsearch extractor - no API key required.
 * @param {string} query - Search query (e.g. "artist song name")
 * @param {number} [limit=15] - Max number of results
 * @returns {Promise<Object>} { success: boolean, results: Array, error?: string }
 */
async function searchYouTube(query, limit = 15) {
  const trimmed = (query || '').toString().trim();
  if (!trimmed) {
    return { success: false, results: [], error: 'Search query cannot be empty' };
  }

  const ytDlpPath = getYtDlpPath();
  const searchArg = `ytsearch${Math.min(Math.max(limit, 1), 50)}:${trimmed}`;

  const args = [
    '--dump-json',
    '--flat-playlist',
    '--no-warnings',
    '--no-playlist',
    searchArg,
  ];

  return new Promise((resolve, reject) => {
    const searchProcess = spawn(ytDlpPath, args, {
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';
    let timeoutId = null;

    timeoutId = setTimeout(() => {
      searchProcess.kill();
      reject(new Error('Search timed out. Please try again.'));
    }, 15000);

    searchProcess.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    searchProcess.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    searchProcess.on('close', (code) => {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }

      if (code === 0 && stdout) {
        const results = [];
        for (const line of stdout.split('\n')) {
          if (!line.trim()) continue;
          try {
            const result = parseSearchEntry(JSON.parse(line));
            if (result) results.push(result);
          } catch (e) {
            console.warn('Failed to parse search result line:', e);
          }
        }
        resolve({ success: true, results });
      } else {
        const errorLower = (stderr || '').toLowerCase();
        let errorMsg = 'Search failed. ';
        if (errorLower.includes('enoent') || errorLower.includes('not found')) {
          errorMsg += 'yt-dlp binary not found.';
        } else if (errorLower.includes('unable to extract') || errorLower.includes('unavailable')) {
          errorMsg += 'YouTube may be temporarily unavailable. Try again later.';
        } else {
          errorMsg += 'Please check your connection and try again.';
        }
        reject(new Error(errorMsg));
      }
    });

    searchProcess.on('error', (error) => {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      if (error.code === 'ENOENT') {
        reject(new Error('yt-dlp binary not found. Please ensure yt-dlp is installed.'));
      } else {
        reject(new Error(`Search failed: ${error.message}`));
      }
    });
  });
}

/**
 * Get a direct audio stream URL for a YouTube video using yt-dlp.
 * Returns the best available audio-only stream URL so the renderer
 * can play it directly via the HTML5 Audio API.
 * @param {string} videoUrl - Full YouTube video URL
 * @returns {Promise<{success: boolean, url?: string, error?: string}>}
 */
async function getAudioStreamUrl(videoUrl) {
  const cacheKey = videoUrl;
  const cached = audioStreamCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < AUDIO_STREAM_CACHE_TTL) {
    return cached.data;
  }

  const ytDlpPath = getYtDlpPath();
  const args = [
    '-f', 'bestaudio[ext=m4a]/bestaudio[ext=webm]/bestaudio',
    '--get-url',
    '--no-playlist',
    '--no-warnings',
    videoUrl,
  ];

  return new Promise((resolve, reject) => {
    const proc = spawn(ytDlpPath, args, {
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';
    const timeoutId = setTimeout(() => {
      proc.kill();
      reject(new Error('Timed out fetching audio stream URL.'));
    }, 20000);

    proc.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    proc.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    proc.on('close', (code) => {
      clearTimeout(timeoutId);
      const url = stdout.trim().split('\n')[0];
      if (code === 0 && url) {
        const result = { success: true, url };
        audioStreamCache.set(cacheKey, { data: result, timestamp: Date.now() });
        resolve(result);
      } else {
        const errLower = (stderr || '').toLowerCase();
        let msg = 'Could not get audio stream. ';
        if (errLower.includes('private') || errLower.includes('unavailable')) {
          msg += 'Video is private or unavailable.';
        } else if (errLower.includes('sign in') || errLower.includes('login')) {
          msg += 'Video requires sign-in.';
        } else {
          msg += 'Please try again.';
        }
        reject(new Error(msg));
      }
    });

    proc.on('error', (error) => {
      clearTimeout(timeoutId);
      if (error.code === 'ENOENT') {
        reject(new Error('yt-dlp binary not found.'));
      } else {
        reject(new Error(`Failed to get audio stream: ${error.message}`));
      }
    });
  });
}

/**
 * Get cached video info
 * @param {string} url
 * @returns {Object|null}
 */
function getCachedVideoInfo(url) {
  try {
    const sanitizedUrl = sanitizeUrl(url);
    const cached = videoInfoCache.get(sanitizedUrl);
    if (cached && Date.now() - cached.timestamp < VIDEO_CACHE_TTL) {
      return cached.data;
    }
  } catch (e) {
    // URL validation failed
  }
  return null;
}

/**
 * Get cached chapter info
 * @param {string} url
 * @returns {Object|null}
 */
function getCachedChapterInfo(url) {
  try {
    const sanitizedUrl = sanitizeUrl(url);
    const cached = chapterInfoCache.get(sanitizedUrl);
    if (cached && Date.now() - cached.timestamp < CHAPTER_CACHE_TTL) {
      return cached.data;
    }
  } catch (e) {
    // URL validation failed
  }
  return null;
}

module.exports = {
  getVideoInfo,
  getPlaylistInfo,
  getChapterInfo,
  searchYouTube,
  getAudioStreamUrl,
  getCachedVideoInfo,
  getCachedChapterInfo,
  formatDuration,
  getHighQualityThumbnail,
};
