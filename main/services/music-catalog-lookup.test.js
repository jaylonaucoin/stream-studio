import { createRequire } from 'node:module'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const require = createRequire(import.meta.url)

const { parseCatalogUrl, fetchCatalogMetadataFromUrl, emptyMetadata } =
  require('./music-catalog-lookup')

const VALID_MBID = 'f4a31f0a-51dd-4fa7-986d-3095c40c5ed9'

function mockFetchResponse(body, { ok = true, status = 200 } = {}) {
  return vi.fn(() =>
    Promise.resolve({
      ok,
      status,
      json: () => Promise.resolve(body),
    })
  )
}

describe('music-catalog-lookup', () => {
  const originalFetch = global.fetch

  beforeEach(() => {
    global.fetch = vi.fn()
  })

  afterEach(() => {
    global.fetch = originalFetch
  })

  describe('emptyMetadata', () => {
    it('returns object with all expected empty string fields', () => {
      const meta = emptyMetadata()
      const expectedKeys = [
        'title', 'artist', 'album', 'albumArtist', 'genre', 'year',
        'trackNumber', 'totalTracks', 'composer', 'publisher', 'comment',
        'description', 'language', 'copyright', 'bpm',
      ]
      expect(Object.keys(meta)).toEqual(expectedKeys)
      for (const key of expectedKeys) {
        expect(meta[key]).toBe('')
      }
    })
  })

  describe('parseCatalogUrl', () => {
    it('returns null for null, empty, and non-string inputs', () => {
      expect(parseCatalogUrl(null)).toBeNull()
      expect(parseCatalogUrl('')).toBeNull()
      expect(parseCatalogUrl(undefined)).toBeNull()
      expect(parseCatalogUrl(42)).toBeNull()
    })

    it('returns null for non-http URL', () => {
      expect(parseCatalogUrl('ftp://musicbrainz.org/release/' + VALID_MBID)).toBeNull()
      expect(parseCatalogUrl('not-a-url')).toBeNull()
    })

    it('parses MusicBrainz release URL', () => {
      const result = parseCatalogUrl(`https://musicbrainz.org/release/${VALID_MBID}`)
      expect(result).toEqual({
        provider: 'musicbrainz',
        entityType: 'release',
        id: VALID_MBID,
      })
    })

    it('parses MusicBrainz recording URL', () => {
      const result = parseCatalogUrl(`https://musicbrainz.org/recording/${VALID_MBID}`)
      expect(result).toEqual({
        provider: 'musicbrainz',
        entityType: 'recording',
        id: VALID_MBID,
      })
    })

    it('parses MusicBrainz release-group URL', () => {
      const result = parseCatalogUrl(`https://musicbrainz.org/release-group/${VALID_MBID}`)
      expect(result).toEqual({
        provider: 'musicbrainz',
        entityType: 'release-group',
        id: VALID_MBID,
      })
    })

    it('parses Discogs release URL', () => {
      const result = parseCatalogUrl('https://discogs.com/release/249504-Daft-Punk-Discovery')
      expect(result).toEqual({
        provider: 'discogs',
        releaseId: '249504',
      })
    })

    it('returns null for invalid MusicBrainz entity type', () => {
      expect(parseCatalogUrl(`https://musicbrainz.org/artist/${VALID_MBID}`)).toBeNull()
      expect(parseCatalogUrl(`https://musicbrainz.org/label/${VALID_MBID}`)).toBeNull()
    })

    it('returns null for invalid Discogs path', () => {
      expect(parseCatalogUrl('https://discogs.com/artist/123')).toBeNull()
      expect(parseCatalogUrl('https://discogs.com/release/')).toBeNull()
    })

    it('returns null for a random website URL', () => {
      expect(parseCatalogUrl('https://example.com/some/page')).toBeNull()
      expect(parseCatalogUrl('https://spotify.com/track/abc123')).toBeNull()
    })
  })

  describe('fetchCatalogMetadataFromUrl', () => {
    it('returns error for invalid URL', async () => {
      const result = await fetchCatalogMetadataFromUrl('not-a-url')
      expect(result.success).toBe(false)
      expect(result.error).toMatch(/unsupported|invalid/i)
    })

    it('handles MusicBrainz release happy path', async () => {
      const releaseJson = {
        title: 'Discovery',
        'artist-credit': [{ name: 'Daft Punk' }],
        date: '2001-03-12',
        tags: [{ name: 'electronic', count: 5 }],
        'label-info': [{ label: { name: 'Virgin' } }],
        'text-representation': { language: 'eng' },
        media: [
          {
            position: 1,
            track: [
              {
                title: 'One More Time',
                number: '1',
                recording: {
                  id: 'abc',
                  title: 'One More Time',
                  'artist-credit': [{ name: 'Daft Punk' }],
                },
              },
              {
                title: 'Aerodynamic',
                number: '2',
                recording: {
                  id: 'def',
                  title: 'Aerodynamic',
                  'artist-credit': [{ name: 'Daft Punk' }],
                },
              },
            ],
          },
        ],
      }

      global.fetch = mockFetchResponse(releaseJson)

      const result = await fetchCatalogMetadataFromUrl(
        `https://musicbrainz.org/release/${VALID_MBID}`
      )
      expect(result.success).toBe(true)
      expect(result.metadata.album).toBe('Discovery')
      expect(result.metadata.artist).toBe('Daft Punk')
      expect(result.metadata.year).toBe('2001')
      expect(result.metadata.title).toBe('One More Time')
      expect(result.metadata.publisher).toBe('Virgin')
      expect(result.metadata.language).toBe('eng')
      expect(result.metadata.totalTracks).toBe('2')
      expect(result.coverUrl).toBe(
        `https://coverartarchive.org/release/${VALID_MBID}/front-500`
      )
      expect(result.tracks).toHaveLength(2)
      expect(result.tracks[0].title).toBe('One More Time')
    })

    it('handles Discogs release happy path', async () => {
      const discogsJson = {
        title: 'Discovery',
        artists: [{ name: 'Daft Punk' }],
        year: 2001,
        genres: ['Electronic'],
        styles: ['House'],
        labels: [{ name: 'Virgin' }],
        tracklist: [
          { title: 'One More Time', position: 'A1', type_: 'track' },
          { title: 'Aerodynamic', position: 'A2', type_: 'track' },
        ],
        images: [{ type: 'primary', resource_url: 'https://img.discogs.com/cover.jpg' }],
      }

      global.fetch = mockFetchResponse(discogsJson)

      const result = await fetchCatalogMetadataFromUrl(
        'https://discogs.com/release/249504-Daft-Punk-Discovery'
      )
      expect(result.success).toBe(true)
      expect(result.metadata.album).toBe('Discovery')
      expect(result.metadata.artist).toBe('Daft Punk')
      expect(result.metadata.year).toBe('2001')
      expect(result.metadata.genre).toBe('Electronic, House')
      expect(result.metadata.totalTracks).toBe('2')
      expect(result.coverUrl).toBe('https://img.discogs.com/cover.jpg')
      expect(result.tracks).toHaveLength(2)
    })

    it('returns token error for Discogs 401', async () => {
      global.fetch = mockFetchResponse({}, { ok: false, status: 401 })

      const result = await fetchCatalogMetadataFromUrl(
        'https://discogs.com/release/249504-Daft-Punk'
      )
      expect(result.success).toBe(false)
      expect(result.error).toMatch(/token/i)
    })

    it('returns not found error for Discogs 404', async () => {
      global.fetch = mockFetchResponse({}, { ok: false, status: 404 })

      const result = await fetchCatalogMetadataFromUrl(
        'https://discogs.com/release/999999-Nothing'
      )
      expect(result.success).toBe(false)
      expect(result.error).toMatch(/not found/i)
    })

    it('returns error on network failure', async () => {
      global.fetch = vi.fn(() => Promise.reject(new Error('Network error')))

      const result = await fetchCatalogMetadataFromUrl(
        `https://musicbrainz.org/release/${VALID_MBID}`
      )
      expect(result.success).toBe(false)
      expect(result.error).toBe('Network error')
    })
  })
})
