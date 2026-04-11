/**
 * Parse catalog URLs and fetch metadata by ID (MusicBrainz, Discogs) — no search.
 */
const { app } = require('electron');

const MBID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const MB_USER_AGENT = `StreamStudio/${app.getVersion()} (https://github.com/jaylonaucoin/stream-studio)`;

const DISCOGS_USER_AGENT = MB_USER_AGENT;

function emptyMetadata() {
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
    description: '',
    language: '',
    copyright: '',
    bpm: '',
  };
}

/**
 * @param {Array<{ name?: string, joinphrase?: string }>|undefined} credit
 * @returns {string}
 */
function formatArtistCredit(credit) {
  if (!credit || !Array.isArray(credit)) return '';
  return credit.map((p) => (p.name || '').trim() + (p.joinphrase || '').trim()).join('').trim();
}

function yearFromDate(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return '';
  const y = dateStr.slice(0, 4);
  return /^\d{4}$/.test(y) ? y : '';
}

/**
 * @param {string} url
 * @returns {{ provider: 'musicbrainz', entityType: string, id: string } | { provider: 'discogs', releaseId: string } | null}
 */
function parseCatalogUrl(url) {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();
  if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) return null;

  let u;
  try {
    u = new URL(trimmed);
  } catch {
    return null;
  }

  const host = u.hostname.toLowerCase().replace(/^www\./, '');
  const path = u.pathname.replace(/\/+$/, '');
  const parts = path.split('/').filter(Boolean);

  if (host === 'musicbrainz.org') {
    const type = parts[0];
    const id = parts[1];
    if (!['release', 'recording', 'release-group'].includes(type) || !id || !MBID_RE.test(id)) {
      return null;
    }
    return { provider: 'musicbrainz', entityType: type, id };
  }

  if (host === 'discogs.com') {
    if (parts[0] !== 'release' || !parts[1]) return null;
    const idMatch = parts[1].match(/^(\d+)/);
    if (!idMatch) return null;
    return { provider: 'discogs', releaseId: idMatch[1] };
  }

  return null;
}

async function musicBrainzGet(pathAndQuery) {
  const url = `https://musicbrainz.org/ws/2/${pathAndQuery}`;
  const res = await fetch(url, {
    headers: {
      Accept: 'application/json',
      'User-Agent': MB_USER_AGENT,
    },
  });
  let data = {};
  try {
    data = await res.json();
  } catch {
    data = {};
  }
  if (!res.ok || data.error) {
    const err = new Error(data.error || `MusicBrainz HTTP ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return data;
}

/**
 * @param {string} mbid
 * @returns {string|null}
 */
function getCoverArtFrontUrl(mbid) {
  if (!mbid || !MBID_RE.test(mbid)) return null;
  return `https://coverartarchive.org/release/${mbid}/front-500`;
}

function topTagName(tags, limit = 1) {
  if (!tags || !Array.isArray(tags)) return '';
  const sorted = [...tags].sort((a, b) => (b.count || 0) - (a.count || 0));
  const names = sorted.slice(0, limit).map((t) => t.name).filter(Boolean);
  return names.join(', ');
}

/**
 * @param {object} release
 * @returns {object}
 */
function mapMusicBrainzRelease(release) {
  const meta = emptyMetadata();
  const albumArtist = formatArtistCredit(release['artist-credit']);
  meta.album = release.title || '';
  meta.albumArtist = albumArtist;
  meta.artist = albumArtist;
  meta.year = yearFromDate(release.date);
  meta.genre = topTagName(release.tags);
  meta.comment = release.disambiguation ? `MusicBrainz: ${release.disambiguation}` : '';
  if (release['label-info'] && release['label-info'][0]?.label?.name) {
    meta.publisher = release['label-info'][0].label.name;
  }
  if (release['text-representation']?.language) {
    meta.language = release['text-representation'].language;
  }
  const media = release.media || [];
  let trackCount = 0;
  for (const m of media) {
    const tr = m.track || m.tracks;
    trackCount += Array.isArray(tr) ? tr.length : 0;
  }
  if (trackCount > 0) {
    meta.totalTracks = String(trackCount);
  }
  const firstMedium = media[0];
  const firstTrackList = firstMedium ? firstMedium.track || firstMedium.tracks : null;
  const firstTrack = Array.isArray(firstTrackList) ? firstTrackList[0] : null;
  if (firstTrack) {
    meta.title = firstTrack.title || firstTrack.recording?.title || '';
    meta.trackNumber = firstTrack.number != null ? String(firstTrack.number).replace(/^0+/, '') || '1' : '1';
  }
  return meta;
}

/**
 * @param {object} recording
 * @returns {object}
 */
function mapMusicBrainzRecording(recording) {
  const meta = emptyMetadata();
  meta.title = recording.title || '';
  meta.artist = formatArtistCredit(recording['artist-credit']);
  const releases = recording.releases || [];
  const primary = releases[0];
  if (primary) {
    meta.album = primary.title || '';
    meta.year = yearFromDate(primary.date);
    const relCredit = formatArtistCredit(primary['artist-credit']);
    if (relCredit) {
      meta.albumArtist = relCredit;
      if (!meta.artist) meta.artist = relCredit;
    }
    if (primary.media && primary.media[0]) {
      const m0 = primary.media[0];
      const tracks = m0.track || m0.tracks || [];
      const idx = tracks.findIndex((t) => t.recording?.id === recording.id);
      if (idx >= 0) {
        meta.trackNumber = String(idx + 1);
      }
    }
  }
  if (!meta.albumArtist && meta.artist) meta.albumArtist = meta.artist;
  meta.genre = topTagName(recording.tags);
  if (recording.disambiguation) {
    meta.comment = `MusicBrainz: ${recording.disambiguation}`;
  }
  return meta;
}

/**
 * @param {object} rg
 * @returns {{ metadata: object, releaseMbidForCover: string|null }}
 */
function mapMusicBrainzReleaseGroup(rg) {
  const meta = emptyMetadata();
  meta.album = rg.title || '';
  const albumArtist = formatArtistCredit(rg['artist-credit']);
  meta.albumArtist = albumArtist;
  meta.artist = albumArtist;
  meta.year = yearFromDate(rg['first-release-date']);
  meta.genre = topTagName(rg.tags);
  if (rg.disambiguation) {
    meta.comment = `MusicBrainz: ${rg.disambiguation}`;
  }
  const releases = rg.releases || [];
  const sorted = [...releases].sort((a, b) => {
    const ca = a.date || '';
    const cb = b.date || '';
    return ca.localeCompare(cb);
  });
  const first = sorted[0];
  const releaseMbidForCover = first?.id && MBID_RE.test(first.id) ? first.id : null;
  return { metadata: meta, releaseMbidForCover };
}

/**
 * @param {object} discogsRelease
 * @returns {object}
 */
function mapDiscogsRelease(discogsRelease) {
  const meta = emptyMetadata();
  meta.album = discogsRelease.title || '';
  const artists = (discogsRelease.artists || []).map((a) => a.name).filter(Boolean);
  const artistLine = artists.join(', ');
  meta.artist = artistLine;
  meta.albumArtist = artistLine;
  meta.year = discogsRelease.year ? String(discogsRelease.year) : '';
  const genres = [...(discogsRelease.genres || []), ...(discogsRelease.styles || [])].filter(Boolean);
  meta.genre = genres.join(', ');
  meta.publisher = (discogsRelease.labels && discogsRelease.labels[0]?.name) || '';
  const tracklist = discogsRelease.tracklist || [];
  const tracks = tracklist.filter((t) => t.type_ === 'track' || !t.type_);
  if (tracks.length > 0) {
    meta.totalTracks = String(tracks.length);
    meta.title = tracks[0].title || '';
    const pos = tracks[0].position;
    if (pos) meta.trackNumber = String(pos).replace(/\D/g, '') || '1';
  }
  if (discogsRelease.notes) {
    meta.description = discogsRelease.notes.slice(0, 500);
  }
  return meta;
}

function discogsCoverUrl(discogsRelease) {
  const images = discogsRelease.images || [];
  const primary = images.find((i) => i.type === 'primary');
  const img = primary || images[0];
  return img?.resource_url || img?.uri || null;
}

/**
 * @param {string} url
 * @param {{ discogsToken?: string }} options
 * @returns {Promise<{ success: true, metadata: object, coverUrl: string|null } | { success: false, error: string }>}
 */
async function fetchCatalogMetadataFromUrl(url, options = {}) {
  const parsed = parseCatalogUrl(url);
  if (!parsed) {
    return { success: false, error: 'Unsupported or invalid catalog URL. Use MusicBrainz (release, recording, release-group) or Discogs release links.' };
  }

  try {
    if (parsed.provider === 'musicbrainz') {
      let metadata = emptyMetadata();
      let coverMbid = null;

      if (parsed.entityType === 'release') {
        const release = await musicBrainzGet(
          `release/${parsed.id}?fmt=json&inc=artist-credits+recordings+labels+release-groups+tags+media`
        );
        metadata = mapMusicBrainzRelease(release);
        coverMbid = parsed.id;
      } else if (parsed.entityType === 'recording') {
        const recording = await musicBrainzGet(
          `recording/${parsed.id}?fmt=json&inc=artist-credits+releases+tags`
        );
        metadata = mapMusicBrainzRecording(recording);
        const rels = recording.releases || [];
        coverMbid = rels[0]?.id && MBID_RE.test(rels[0].id) ? rels[0].id : null;
      } else if (parsed.entityType === 'release-group') {
        const rg = await musicBrainzGet(
          `release-group/${parsed.id}?fmt=json&inc=artist-credits+releases+tags`
        );
        const mapped = mapMusicBrainzReleaseGroup(rg);
        metadata = mapped.metadata;
        coverMbid = mapped.releaseMbidForCover;
      }

      const coverUrl = coverMbid ? getCoverArtFrontUrl(coverMbid) : null;

      return { success: true, metadata, coverUrl };
    }

    if (parsed.provider === 'discogs') {
      const headers = {
        Accept: 'application/json',
        'User-Agent': DISCOGS_USER_AGENT,
      };
      const token = (options.discogsToken || '').trim();
      if (token) {
        headers.Authorization = `Discogs token=${token}`;
      }

      const apiUrl = `https://api.discogs.com/releases/${parsed.releaseId}`;
      const res = await fetch(apiUrl, { headers });
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          return {
            success: false,
            error:
              'Discogs rejected the request. Add a personal access token in Settings for reliable access.',
          };
        }
        if (res.status === 404) {
          return { success: false, error: 'Discogs release not found.' };
        }
        return { success: false, error: `Discogs HTTP ${res.status}` };
      }
      const body = await res.json();
      const metadata = mapDiscogsRelease(body);
      const coverUrl = discogsCoverUrl(body);
      return { success: true, metadata, coverUrl };
    }
  } catch (e) {
    const msg = e.message || 'Request failed';
    if (e.status === 404) {
      return { success: false, error: 'Catalog entry not found.' };
    }
    return { success: false, error: msg };
  }

  return { success: false, error: 'Unknown provider.' };
}

module.exports = {
  parseCatalogUrl,
  fetchCatalogMetadataFromUrl,
  emptyMetadata,
};
