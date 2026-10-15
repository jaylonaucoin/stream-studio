import { useState, useCallback } from 'react'
import { Link } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Spinner } from '@/components/ui/spinner'
import { cn } from '@/lib/utils'

/**
 * Fields shared across album-level editors.
 * @param {Record<string, string>} full
 * @returns {Record<string, string>}
 */
export function pickAlbumSharedFields(full) {
  return {
    artist: full.artist ?? '',
    album: full.album ?? '',
    albumArtist: full.albumArtist ?? '',
    genre: full.genre ?? '',
    year: full.year ?? '',
    composer: full.composer ?? '',
    publisher: full.publisher ?? '',
    comment: full.comment ?? '',
    description: full.description ?? '',
    language: full.language ?? '',
    copyright: full.copyright ?? '',
    bpm: full.bpm ?? '',
  }
}

/**
 * Manual MusicBrainz / Discogs URL lookup.
 */
function CatalogLinkSection({
  onMetadataLoaded,
  onCoverLoaded,
  onTracklistLoaded,
  onError,
  disabled = false,
  className,
  variant = 'full',
}) {
  const [catalogUrl, setCatalogUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [localError, setLocalError] = useState(null)

  const handleLoad = useCallback(async () => {
    setLocalError(null)
    const trimmed = catalogUrl.trim()
    if (!trimmed) {
      setLocalError('Paste a catalog URL first.')
      return
    }
    if (!window.api?.fetchCatalogMetadataFromUrl) {
      setLocalError('Catalog lookup is not available.')
      return
    }
    setLoading(true)
    try {
      const res = await window.api.fetchCatalogMetadataFromUrl(trimmed)
      if (!res.success) {
        const msg = res.error || 'Lookup failed'
        setLocalError(msg)
        onError?.(msg)
        return
      }
      const meta = res.metadata || {}
      if (variant === 'albumShared') {
        onMetadataLoaded(pickAlbumSharedFields(meta))
      } else {
        onMetadataLoaded({ ...meta })
      }
      if (res.coverUrl && onCoverLoaded && window.api.fetchImageAsDataUrl) {
        const imgRes = await window.api.fetchImageAsDataUrl(res.coverUrl)
        if (imgRes.success && imgRes.dataUrl) {
          onCoverLoaded(imgRes.dataUrl)
        }
      }
      if (
        Array.isArray(res.tracks) &&
        res.tracks.length > 0 &&
        typeof onTracklistLoaded === 'function'
      ) {
        onTracklistLoaded(res.tracks, res.metadata || {})
      }
    } catch (e) {
      const msg = e?.message || 'Lookup failed'
      setLocalError(msg)
      onError?.(msg)
    } finally {
      setLoading(false)
    }
  }, [catalogUrl, onMetadataLoaded, onCoverLoaded, onTracklistLoaded, onError, variant])

  return (
    <div className={cn('mb-4', className)}>
      <h3 className="mb-1 flex items-center gap-1.5 text-sm font-medium">
        <Link className="size-4" aria-hidden />
        Load from catalog link
      </h3>
      <p className="mb-2 text-xs text-muted-foreground">
        Paste a MusicBrainz release, recording, or release-group URL, or a Discogs release URL.
        Overwrites matching fields below. Discogs may need a personal token in Settings.
      </p>
      <div className="flex flex-wrap items-start gap-2">
        <div className="min-w-50 flex-1 space-y-1.5">
          <Label htmlFor="catalog-url">Catalog URL</Label>
          <Input
            id="catalog-url"
            placeholder="https://musicbrainz.org/release/…"
            value={catalogUrl}
            onChange={(e) => setCatalogUrl(e.target.value)}
            disabled={disabled || loading}
            aria-label="MusicBrainz or Discogs URL"
          />
        </div>
        <Button
          variant="outline"
          onClick={handleLoad}
          disabled={disabled || loading || !catalogUrl.trim()}
          className="mt-6 shrink-0"
        >
          {loading ? <Spinner size="sm" aria-label="Loading" /> : 'Load from link'}
        </Button>
      </div>
      {localError ? (
        <Alert variant="destructive" className="mt-2">
          <AlertDescription className="flex items-center justify-between gap-2">
            <span>{localError}</span>
            <Button size="sm" variant="ghost" onClick={() => setLocalError(null)}>
              Dismiss
            </Button>
          </AlertDescription>
        </Alert>
      ) : null}
    </div>
  )
}

export default CatalogLinkSection
