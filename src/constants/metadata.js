// Default metadata state objects for MetadataEditor

export const DEFAULT_METADATA = {
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
  description: '',
  language: '',
  copyright: '',
  bpm: '',
};

export const DEFAULT_PLAYLIST_SHARED_METADATA = {
  artist: '',
  album: '',
  albumArtist: '',
  genre: '',
  year: '',
  composer: '',
  publisher: '',
  comment: '',
  description: '',
  language: '',
  copyright: '',
  bpm: '',
};

export const DEFAULT_CHAPTER_METADATA = {
  albumMetadata: {
    artist: '',
    album: '',
    albumArtist: '',
    genre: '',
    year: '',
    composer: '',
    publisher: '',
    comment: '',
    description: '',
    language: '',
    copyright: '',
    bpm: '',
  },
  chapterTitleTemplate: '{chapterTitle}',
};

export const DEFAULT_SEGMENT_METADATA = {
  albumMetadata: {
    artist: '',
    album: '',
    albumArtist: '',
    genre: '',
    year: '',
    composer: '',
    publisher: '',
    comment: '',
    description: '',
    language: '',
    copyright: '',
    bpm: '',
  },
  perSegmentMetadata: [],
};

export const PLAYLIST_ITEMS_PER_PAGE = 20;
