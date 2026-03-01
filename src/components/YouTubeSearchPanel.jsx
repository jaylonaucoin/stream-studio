import { useState, useCallback } from 'react';
import {
  Box,
  TextField,
  Button,
  Paper,
  Typography,
  List,
  ListItemButton,
  Skeleton,
  Alert,
  InputAdornment,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import PersonIcon from '@mui/icons-material/Person';
import ThumbnailWithFallback from './ThumbnailWithFallback';

/**
 * YouTubeSearchPanel - Chordify-style YouTube search for songs
 * Search by song/artist, select result to populate URL and load preview
 */
function YouTubeSearchPanel({ onSelect, disabled, isConverting }) {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [results, setResults] = useState([]);

  const handleSearch = useCallback(async () => {
    const trimmed = query.trim();
    if (!trimmed || loading || disabled || isConverting) return;

    setLoading(true);
    setError(null);
    setResults([]);

    try {
      const response = await window.api?.searchYouTube?.(trimmed, 15);

      if (response?.success && Array.isArray(response.results)) {
        setResults(response.results);
        if (response.results.length === 0) {
          setError(`No results found for "${trimmed}"`);
        }
      } else {
        setError(response?.error || 'Search failed. Please try again.');
      }
    } catch (err) {
      setError(err?.message || 'Search failed. Please try again.');
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [query, loading, disabled, isConverting]);

  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleSearch();
      }
    },
    [handleSearch]
  );

  const handleSelect = useCallback(
    (result) => {
      if (result?.webpageUrl && !disabled && !isConverting) {
        onSelect?.(result.webpageUrl);
      }
    },
    [onSelect, disabled, isConverting]
  );

  const isSearchDisabled = !query.trim() || loading || disabled || isConverting;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <TextField
          fullWidth
          placeholder="Search for a song (e.g. Keith Whitley When You Say Nothing At All)"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setError(null);
          }}
          onKeyDown={handleKeyDown}
          disabled={disabled || isConverting}
          size="medium"
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon color="action" />
              </InputAdornment>
            ),
          }}
          inputProps={{
            'aria-label': 'YouTube search query',
          }}
          sx={{ flex: '1 1 200px', minWidth: 0 }}
        />
        <Button
          variant="contained"
          startIcon={<SearchIcon />}
          onClick={handleSearch}
          disabled={isSearchDisabled}
          sx={{ flexShrink: 0 }}
        >
          Search
        </Button>
      </Box>

      {error && (
        <Alert severity={results.length === 0 ? 'warning' : 'info'} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Loading skeleton */}
      {loading && (
        <Paper
          elevation={1}
          sx={{
            p: 2,
            borderRadius: 2,
            bgcolor: 'background.paper',
            border: 1,
            borderColor: 'divider',
          }}
        >
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {[1, 2, 3, 4, 5].map((i) => (
              <Box key={i} sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                <Skeleton variant="rectangular" width={160} height={90} sx={{ borderRadius: 1 }} />
                <Box sx={{ flexGrow: 1 }}>
                  <Skeleton variant="text" width="80%" height={24} sx={{ mb: 0.5 }} />
                  <Skeleton variant="text" width="50%" height={20} />
                </Box>
              </Box>
            ))}
          </Box>
        </Paper>
      )}

      {/* Results list */}
      {!loading && results.length > 0 && (
        <Paper
          elevation={1}
          sx={{
            borderRadius: 2,
            bgcolor: 'background.paper',
            border: 1,
            borderColor: 'divider',
            overflow: 'hidden',
          }}
        >
          <Box sx={{ px: 2, py: 1.5, borderBottom: 1, borderColor: 'divider' }}>
            <Typography variant="subtitle2" color="text.secondary">
              Click a result to select and preview
            </Typography>
          </Box>
          <List dense disablePadding sx={{ maxHeight: 400, overflow: 'auto' }}>
            {results.map((result, index) => (
              <ListItemButton
                key={result.id || index}
                onClick={() => handleSelect(result)}
                disabled={disabled || isConverting}
                sx={{
                  py: 1.5,
                  borderBottom: index < results.length - 1 ? 1 : 0,
                  borderColor: 'divider',
                  '&:hover': {
                    bgcolor: 'action.hover',
                  },
                }}
              >
                <ThumbnailWithFallback
                  thumbnail={result.thumbnail}
                  alt={result.title}
                  isPlaylist={false}
                  width={80}
                  height={45}
                />
                <Box sx={{ flexGrow: 1, minWidth: 0, ml: 2 }}>
                  <Typography
                    variant="body1"
                    sx={{
                      fontWeight: 500,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                    }}
                  >
                    {result.title}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1.5, mt: 0.5, flexWrap: 'wrap' }}>
                    {result.uploader && (
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 0.25,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          maxWidth: '100%',
                        }}
                      >
                        <PersonIcon sx={{ fontSize: 14 }} />
                        {result.uploader}
                      </Typography>
                    )}
                    {result.durationFormatted && (
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 0.25,
                        }}
                      >
                        <AccessTimeIcon sx={{ fontSize: 14 }} />
                        {result.durationFormatted}
                      </Typography>
                    )}
                  </Box>
                </Box>
              </ListItemButton>
            ))}
          </List>
        </Paper>
      )}

      {/* Empty state */}
      {!loading && results.length === 0 && !error && (
        <Box
          sx={{
            p: 4,
            textAlign: 'center',
            bgcolor: 'background.default',
            borderRadius: 2,
            border: 1,
            borderColor: 'divider',
            borderStyle: 'dashed',
          }}
        >
          <MusicNoteIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
          <Typography variant="body1" color="text.secondary" gutterBottom>
            Search for songs to learn
          </Typography>
          <Typography variant="body2" color="text.disabled">
            Enter an artist name and song title, then click Search. Select a result to load and
            download.
          </Typography>
        </Box>
      )}
    </Box>
  );
}

export default YouTubeSearchPanel;
