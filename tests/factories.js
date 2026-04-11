/**
 * Test data factories for Stream Studio.
 * Each builder returns a valid default with optional overrides.
 */

let _idCounter = 0;
function nextId() {
  return `test-id-${++_idCounter}`;
}

export function resetIdCounter() {
  _idCounter = 0;
}

export function buildVideoInfo(overrides = {}) {
  return {
    success: true,
    title: 'Test Video',
    thumbnail: 'https://i.ytimg.com/vi/abc123/hqdefault.jpg',
    duration: 240,
    durationFormatted: '4:00',
    artist: null,
    uploader: 'Test Channel',
    viewCount: 1000,
    uploadDate: '20240101',
    description: 'A test video description',
    webpageUrl: 'https://www.youtube.com/watch?v=abc123',
    extractor: 'youtube',
    _type: 'video',
    ...overrides,
  };
}

export function buildPlaylistInfo(overrides = {}) {
  const { videos: videoOverrides, ...rest } = overrides;
  return {
    success: true,
    isPlaylist: true,
    playlistTitle: 'Test Playlist',
    playlistVideoCount: 3,
    playlistTotalDuration: 720,
    playlistTotalDurationFormatted: '12:00',
    playlistUploader: 'Test Channel',
    extractor: 'youtube',
    videos: videoOverrides || [
      buildPlaylistVideo({ index: 1, title: 'Track 1' }),
      buildPlaylistVideo({ index: 2, title: 'Track 2' }),
      buildPlaylistVideo({ index: 3, title: 'Track 3' }),
    ],
    ...rest,
  };
}

export function buildPlaylistVideo(overrides = {}) {
  const index = overrides.index ?? 1;
  return {
    id: `vid-${index}`,
    title: `Video ${index}`,
    duration: 240,
    durationFormatted: '4:00',
    index,
    url: `https://www.youtube.com/watch?v=vid-${index}`,
    thumbnail: `https://i.ytimg.com/vi/vid-${index}/hqdefault.jpg`,
    artist: null,
    ...overrides,
  };
}

export function buildChapterInfo(overrides = {}) {
  const { chapters: chapterOverrides, ...rest } = overrides;
  return {
    success: true,
    hasChapters: true,
    totalChapters: 3,
    chapters: chapterOverrides || [
      buildChapter({ index: 0, title: 'Intro', startTime: 0, endTime: 60 }),
      buildChapter({ index: 1, title: 'Main', startTime: 60, endTime: 180 }),
      buildChapter({ index: 2, title: 'Outro', startTime: 180, endTime: 240 }),
    ],
    ...rest,
  };
}

export function buildChapter(overrides = {}) {
  return {
    index: 0,
    title: 'Chapter 1',
    startTime: 0,
    endTime: 60,
    duration: 60,
    durationFormatted: '1:00',
    timeRange: '0:00 - 1:00',
    ...overrides,
  };
}

export function buildHistoryItem(overrides = {}) {
  return {
    id: nextId(),
    fileName: 'test-song.mp3',
    url: 'https://www.youtube.com/watch?v=abc123',
    format: 'mp3',
    mode: 'audio',
    timestamp: new Date().toISOString(),
    ...overrides,
  };
}

export function buildSettings(overrides = {}) {
  return {
    notificationsEnabled: true,
    maxHistoryItems: 50,
    defaultMode: 'audio',
    defaultAudioFormat: 'mp3',
    defaultVideoFormat: 'mp4',
    defaultQuality: 'best',
    theme: 'dark',
    defaultSearchSite: 'youtube',
    defaultSearchLimit: 15,
    discogsToken: '',
    ...overrides,
  };
}

export function buildQueueItem(overrides = {}) {
  return {
    url: 'https://www.youtube.com/watch?v=abc123',
    isPlaylist: false,
    playlistMode: 'single',
    title: 'Test Queue Item',
    ...overrides,
  };
}

export function buildSegment(overrides = {}) {
  return {
    title: 'Segment 1',
    startTime: '0:00',
    endTime: '1:00',
    artist: '',
    ...overrides,
  };
}

export function buildMetadata(overrides = {}) {
  return {
    title: '',
    artist: '',
    album: '',
    albumArtist: '',
    genre: '',
    year: '',
    trackNumber: '',
    totalTracks: '',
    composer: '',
    publisher: '',
    comment: '',
    copyright: '',
    bpm: '',
    ...overrides,
  };
}
