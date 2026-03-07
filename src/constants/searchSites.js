/**
 * Search sites supported by yt-dlp
 * Format: { id: 'extractor', label: 'Display Name', searchPrefix: 'extractor' }
 * yt-dlp uses extractor + "search" + limit + ":" + query
 */
export const SEARCH_SITES = [
  { id: 'youtube', label: 'YouTube', searchPrefix: 'ytsearch' },
  { id: 'soundcloud', label: 'SoundCloud', searchPrefix: 'scsearch' },
  { id: 'bandcamp', label: 'Bandcamp', searchPrefix: 'bandcamp:search' },
  { id: 'vimeo', label: 'Vimeo', searchPrefix: 'vimsearch' },
  { id: 'dailymotion', label: 'Dailymotion', searchPrefix: 'dmsearch' },
  { id: 'peertube', label: 'PeerTube', searchPrefix: 'peertube:search' },
  { id: 'media_cc', label: 'media.ccc.de', searchPrefix: 'media_cc:search' },
  { id: 'naver', label: 'Naver', searchPrefix: 'naver:search' },
  { id: 'niconico', label: 'Niconico', searchPrefix: 'niconico:search' },
  { id: 'rumble', label: 'Rumble', searchPrefix: 'rumble:search' },
  { id: 'odysée', label: 'Odysée', searchPrefix: 'odyssee:search' },
  { id: 'twitch', label: 'Twitch', searchPrefix: 'twitch:search' },
  { id: 'twitter', label: 'Twitter/X', searchPrefix: 'twitter:search' },
  { id: 'tiktok', label: 'TikTok', searchPrefix: 'tiktok:search' },
  { id: 'bilibili', label: 'Bilibili', searchPrefix: 'bilibili:search' },
];

export const DEFAULT_SEARCH_SITE = 'youtube';
export const DEFAULT_SEARCH_LIMIT = 15;
