/**
 * Supported sites constants
 * Popular supported sites (yt-dlp supports 1000+ sites)
 * This list is for display purposes only - we accept any URL and let yt-dlp handle validation
 */

/**
 * yt-dlp extractors that are audio-only (no video output possible).
 * Used to disable Video mode and adjust UI labels (videos -> tracks).
 */
export const AUDIO_ONLY_EXTRACTORS = new Set([
  'soundcloud',
  'bandcamp',
  'mixcloud',
]);

/**
 * URL hostnames that indicate audio-only sources (fallback before videoInfo loads).
 */
export const AUDIO_ONLY_URL_PATTERNS = [
  'soundcloud.com',
  'bandcamp.com',
  'mixcloud.com',
];

/**
 * Check if extractor is audio-only
 * @param {string|null|undefined} extractor - yt-dlp extractor name
 * @returns {boolean}
 */
export function isAudioOnlyExtractor(extractor) {
  return extractor ? AUDIO_ONLY_EXTRACTORS.has(extractor.toLowerCase()) : false;
}

/**
 * Check if URL is from an audio-only source (by hostname)
 * @param {string} url - Full URL
 * @returns {boolean}
 */
export function isAudioOnlyUrl(url) {
  if (!url || typeof url !== 'string') return false;
  try {
    const host = new URL(url).hostname.toLowerCase();
    return AUDIO_ONLY_URL_PATTERNS.some((p) => host.includes(p));
  } catch {
    return false;
  }
}

export const SUPPORTED_SITES = [
  'YouTube',
  'Vimeo',
  'Dailymotion',
  'Facebook',
  'Twitter/X',
  'TikTok',
  'Instagram',
  'Reddit',
  'Twitch',
  'SoundCloud',
  'Bandcamp',
  'Mixcloud',
  'Bilibili',
  'Niconico',
  'VK',
  'Rumble',
  'BitChute',
  'Odysee',
  'PeerTube',
  'Streamable',
  'Flickr',
  'Imgur',
  'Pinterest',
  'TED',
  'Khan Academy',
  'Udemy',
  'Coursera',
  'and 1000+ more...',
];
