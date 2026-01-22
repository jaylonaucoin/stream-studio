/**
 * Video info service - fetches video/playlist metadata using yt-dlp
 */
const { spawn } = require('child_process');
const { getYtDlpPath } = require('../utils/paths');

// Cache for video info to avoid redundant fetches
const videoInfoCache = new Map();
const chapterInfoCache = new Map();
const VIDEO_CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const CHAPTER_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

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
 * Get the best quality thumbnail from thumbnails array
 * @param {Array} thumbnails - Array of thumbnail objects from yt-dlp
 * @param {string} fallback - Fallback thumbnail URL
 * @returns {string|null}
 */
function getBestThumbnail(thumbnails, fallback = null) {
  if (!thumbnails || !Array.isArray(thumbnails) || thumbnails.length === 0) {
    return fallback;
  }
  
  // Sort by preference (higher is better) or by resolution
  const sorted = [...thumbnails].sort((a, b) => {
    // Prefer by preference field if available
    if (a.preference !== undefined && b.preference !== undefined) {
      return b.preference - a.preference;
    }
    // Otherwise sort by resolution (width * height)
    const resA = (a.width || 0) * (a.height || 0);
    const resB = (b.width || 0) * (b.height || 0);
    return resB - resA;
  });
  
  // Return the best thumbnail URL
  return sorted[0]?.url || fallback;
}

/**
 * Get multiple thumbnail URLs sorted by quality (best first)
 * @param {Array} thumbnails - Array of thumbnail objects from yt-dlp
 * @param {string} fallback - Fallback thumbnail URL
 * @returns {Array<string>}
 */
function getThumbnailUrls(thumbnails, fallback = null) {
  if (!thumbnails || !Array.isArray(thumbnails) || thumbnails.length === 0) {
    return fallback ? [fallback] : [];
  }
  
  // Sort by preference (higher is better) or by resolution
  const sorted = [...thumbnails].sort((a, b) => {
    if (a.preference !== undefined && b.preference !== undefined) {
      return b.preference - a.preference;
    }
    const resA = (a.width || 0) * (a.height || 0);
    const resB = (b.width || 0) * (b.height || 0);
    return resB - resA;
  });
  
  // Return array of URLs (best first), filter out duplicates
  const urls = sorted.map(t => t.url).filter(Boolean);
  return [...new Set(urls)];
}

/**
 * Get video info from URL
 * @param {string} url - Video URL
 * @returns {Promise<Object>}
 */
async function getVideoInfo(url) {
  // Check cache
  const cacheKey = url;
  const cached = videoInfoCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < VIDEO_CACHE_TTL) {
    return cached.data;
  }

  const ytDlpPath = getYtDlpPath();
  const args = [
    '--dump-json',
    '--no-playlist',
    '--no-warnings',
    url,
  ];

  return new Promise((resolve, reject) => {
    const process = spawn(ytDlpPath, args, {
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';
    const timeoutId = setTimeout(() => {
      process.kill();
      reject(new Error('Video info fetch timed out'));
    }, 30000);

    process.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    process.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    process.on('close', (code) => {
      clearTimeout(timeoutId);
      if (code === 0 && stdout) {
        try {
          const info = JSON.parse(stdout);
          
          // Get best quality thumbnail - try thumbnails array first, then fallback
          const thumbnails = getThumbnailUrls(info.thumbnails, info.thumbnail);
          const bestThumbnail = thumbnails[0] || info.thumbnail || null;
          
          const result = {
            success: true,
            title: info.title || 'Unknown Title',
            duration: info.duration || 0,
            durationFormatted: formatDuration(info.duration),
            // Provide both single thumbnail and array for fallback support
            thumbnail: thumbnails.length > 0 ? thumbnails : bestThumbnail,
            uploader: info.uploader || info.channel || info.creator || null,
            artist: info.artist || info.creator || null,
            album: info.album || null,
            track: info.track || null,
            uploadDate: info.upload_date || null,
            description: info.description || null,
            viewCount: info.view_count || null,
            likeCount: info.like_count || null,
            // Additional metadata fields
            genre: info.genre || null,
            releaseYear: info.release_year || (info.upload_date ? info.upload_date.substring(0, 4) : null),
            ageLimit: info.age_limit || null,
            categories: info.categories || [],
            tags: info.tags || [],
          };
          // Cache the result
          videoInfoCache.set(cacheKey, { data: result, timestamp: Date.now() });
          resolve(result);
        } catch (e) {
          reject(new Error('Failed to parse video info'));
        }
      } else {
        reject(new Error(stderr || 'Failed to get video info'));
      }
    });

    process.on('error', (err) => {
      clearTimeout(timeoutId);
      reject(err);
    });
  });
}

/**
 * Get playlist info from URL
 * @param {string} url - Playlist URL
 * @returns {Promise<Object>}
 */
async function getPlaylistInfo(url) {
  const ytDlpPath = getYtDlpPath();
  const args = [
    '--flat-playlist',
    '--dump-json',
    '--no-warnings',
    url,
  ];

  return new Promise((resolve, reject) => {
    const process = spawn(ytDlpPath, args, {
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';
    const entries = [];
    const timeoutId = setTimeout(() => {
      process.kill();
      reject(new Error('Playlist info fetch timed out'));
    }, 60000);

    process.stdout.on('data', (data) => {
      stdout += data.toString();
      // Process JSON lines as they come
      const lines = stdout.split('\n');
      stdout = lines.pop() || ''; // Keep incomplete line for next iteration
      
      for (const line of lines) {
        if (line.trim()) {
          try {
            const entry = JSON.parse(line);
            if (entry._type === 'playlist') {
              // This is playlist metadata
              entries.playlistMeta = entry;
            } else {
              entries.push(entry);
            }
          } catch (e) {
            // Skip invalid JSON lines
          }
        }
      }
    });

    process.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    process.on('close', (code) => {
      clearTimeout(timeoutId);
      
      // Process any remaining stdout
      if (stdout.trim()) {
        try {
          const entry = JSON.parse(stdout);
          if (entry._type !== 'playlist') {
            entries.push(entry);
          }
        } catch (e) {
          // Skip invalid JSON
        }
      }

      if (entries.length > 0) {
        const videos = entries.map((entry, index) => {
          // Get best quality thumbnail for each video
          const thumbnails = getThumbnailUrls(entry.thumbnails, entry.thumbnail);
          
          return {
            index: index + 1,
            title: entry.title || `Video ${index + 1}`,
            url: entry.url || entry.webpage_url || url,
            thumbnail: thumbnails.length > 0 ? thumbnails : (entry.thumbnail || null),
            duration: entry.duration || 0,
            durationFormatted: formatDuration(entry.duration),
            artist: entry.artist || entry.creator || null,
            uploader: entry.uploader || entry.channel || null,
          };
        });

        const totalDuration = videos.reduce((sum, v) => sum + (v.duration || 0), 0);
        
        // Get playlist thumbnail from first video or playlist metadata
        const playlistThumbnails = getThumbnailUrls(
          entries.playlistMeta?.thumbnails,
          entries.playlistMeta?.thumbnail || videos[0]?.thumbnail?.[0] || videos[0]?.thumbnail
        );

        resolve({
          success: true,
          isPlaylist: true,
          playlistTitle: entries.playlistMeta?.title || 'Playlist',
          playlistVideoCount: videos.length,
          playlistTotalDuration: totalDuration,
          playlistTotalDurationFormatted: formatDuration(totalDuration),
          playlistUploader: entries.playlistMeta?.uploader || entries.playlistMeta?.channel || null,
          playlistThumbnail: playlistThumbnails.length > 0 ? playlistThumbnails : null,
          videos,
        });
      } else {
        // Not a playlist
        resolve({ success: true, isPlaylist: false });
      }
    });

    process.on('error', (err) => {
      clearTimeout(timeoutId);
      reject(err);
    });
  });
}

/**
 * Get chapter info from URL
 * @param {string} url - Video URL
 * @returns {Promise<Object>}
 */
async function getChapterInfo(url) {
  // Check cache
  const cacheKey = url;
  const cached = chapterInfoCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CHAPTER_CACHE_TTL) {
    return cached.data;
  }

  const ytDlpPath = getYtDlpPath();
  const args = [
    '--dump-json',
    '--no-playlist',
    '--no-warnings',
    url,
  ];

  return new Promise((resolve, reject) => {
    const process = spawn(ytDlpPath, args, {
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    const timeoutId = setTimeout(() => {
      process.kill();
      reject(new Error('Chapter info fetch timed out'));
    }, 30000);

    process.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    process.on('close', (code) => {
      clearTimeout(timeoutId);
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
      clearTimeout(timeoutId);
      reject(err);
    });
  });
}

/**
 * Get cached video info
 * @param {string} url
 * @returns {Object|null}
 */
function getCachedVideoInfo(url) {
  const cached = videoInfoCache.get(url);
  if (cached && Date.now() - cached.timestamp < VIDEO_CACHE_TTL) {
    return cached.data;
  }
  return null;
}

/**
 * Get cached chapter info
 * @param {string} url
 * @returns {Object|null}
 */
function getCachedChapterInfo(url) {
  const cached = chapterInfoCache.get(url);
  if (cached && Date.now() - cached.timestamp < CHAPTER_CACHE_TTL) {
    return cached.data;
  }
  return null;
}

module.exports = {
  getVideoInfo,
  getPlaylistInfo,
  getChapterInfo,
  getCachedVideoInfo,
  getCachedChapterInfo,
  formatDuration,
};
