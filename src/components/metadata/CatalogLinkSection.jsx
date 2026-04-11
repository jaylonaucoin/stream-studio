import { useState, useCallback } from 'react';
import { Box, TextField, Button, Typography, Alert, CircularProgress } from '@mui/material';
import LinkIcon from '@mui/icons-material/Link';

/**
 * Fields shared across album-level editors (playlist individual, chapter, segment, batch).
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
  };
}

/**
 * Manual MusicBrainz / Discogs URL lookup — fills metadata when user clicks "Load from link".
 */
function CatalogLinkSection({
  onMetadataLoaded,
  onCoverLoaded,
  onTracklistLoaded,
  onError,
  disabled = false,
  sx = {},
  variant = 'full',
}) {
  const [catalogUrl, setCatalogUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState(null);

  const handleLoad = useCallback(async () => {
    setLocalError(null);
    const trimmed = catalogUrl.trim();
    if (!trimmed) {
      setLocalError('Paste a catalog URL first.');
      return;
    }
    if (!window.api?.fetchCatalogMetadataFromUrl) {
      setLocalError('Catalog lookup is not available.');
      return;
    }
    setLoading(true);
    try {
      const res = await window.api.fetchCatalogMetadataFromUrl(trimmed);
      if (!res.success) {
        const msg = res.error || 'Lookup failed';
        setLocalError(msg);
        onError?.(msg);
        return;
      }
      const meta = res.metadata || {};
      if (variant === 'albumShared') {
        onMetadataLoaded(pickAlbumSharedFields(meta));
      } else {
        onMetadataLoaded({ ...meta });
      }
      if (res.coverUrl && onCoverLoaded && window.api.fetchImageAsDataUrl) {
        const imgRes = await window.api.fetchImageAsDataUrl(res.coverUrl);
        if (imgRes.success && imgRes.dataUrl) {
          onCoverLoaded(imgRes.dataUrl);
        }
      }
      if (
        Array.isArray(res.tracks) &&
        res.tracks.length > 0 &&
        typeof onTracklistLoaded === 'function'
      ) {
        onTracklistLoaded(res.tracks, res.metadata || {});
      }
    } catch (e) {
      const msg = e?.message || 'Lookup failed';
      setLocalError(msg);
      onError?.(msg);
    } finally {
      setLoading(false);
    }
  }, [catalogUrl, onMetadataLoaded, onCoverLoaded, onTracklistLoaded, onError, variant]);

  return (
    <Box sx={{ mb: 2, ...sx }}>
      <Typography
        variant="subtitle2"
        gutterBottom
        sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
      >
        <LinkIcon fontSize="small" aria-hidden />
        Load from catalog link
      </Typography>
      <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
        Paste a MusicBrainz release, recording, or release-group URL, or a Discogs release URL.
        Overwrites matching fields below. Discogs may need a personal token in Settings.
      </Typography>
      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'flex-start' }}>
        <TextField
          size="small"
          fullWidth
          sx={{ flex: 1, minWidth: 200 }}
          label="Catalog URL"
          placeholder="https://musicbrainz.org/release/…"
          value={catalogUrl}
          onChange={(e) => setCatalogUrl(e.target.value)}
          disabled={disabled || loading}
          aria-label="MusicBrainz or Discogs URL"
        />
        <Button
          variant="outlined"
          onClick={handleLoad}
          disabled={disabled || loading || !catalogUrl.trim()}
          sx={{ mt: 0.5, flexShrink: 0 }}
        >
          {loading ? <CircularProgress size={20} aria-label="Loading" /> : 'Load from link'}
        </Button>
      </Box>
      {localError && (
        <Alert severity="error" sx={{ mt: 1 }} onClose={() => setLocalError(null)}>
          {localError}
        </Alert>
      )}
    </Box>
  );
}

export default CatalogLinkSection;
