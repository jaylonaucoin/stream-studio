import { useState, useCallback, useRef, useEffect } from 'react';
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
  IconButton,
  CircularProgress,
  LinearProgress,
  Tooltip,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import PersonIcon from '@mui/icons-material/Person';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import ThumbnailWithFallback from './ThumbnailWithFallback';

/**
 * YouTubeSearchPanel - Chordify-style YouTube search for songs
 * Search by song/artist, select result to populate URL and load preview
 */
function YouTubeSearchPanel({ onSelect, disabled, isConverting }) {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [skeletonCount, setSkeletonCount] = useState(5); // shrinks as real results stream in
  const [error, setError] = useState(null);
  const [results, setResults] = useState([]);
  // A search epoch counter lets us discard stale streaming events from a previous search
  const searchEpochRef = useRef(0);

  // Audio preview state
  // playingId  — ID of the track currently emitting sound
  // loadedId   — ID of the track whose Audio element is alive (playing OR paused)
  const [playingId, setPlayingId] = useState(null);
  const [loadedId, setLoadedId] = useState(null);
  const [loadingAudioId, setLoadingAudioId] = useState(null);
  const [audioProgress, setAudioProgress] = useState(0); // 0-100
  const [audioError, setAudioError] = useState(null);
  const audioRef = useRef(null);

  // Fully stop and destroy the current audio element
  const stopAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      // Remove src after pausing so no error event fires from clearing it
      audioRef.current.removeAttribute('src');
      audioRef.current.load();
      audioRef.current = null;
    }
    setPlayingId(null);
    setLoadedId(null);
    setAudioProgress(0);
  }, []);

  // Clean up audio when component unmounts or new search starts
  useEffect(() => {
    return () => {
      stopAudio();
    };
  }, [stopAudio]);

  const handleSearch = useCallback(async () => {
    const trimmed = query.trim();
    if (!trimmed || loading || disabled || isConverting) return;

    stopAudio();
    setAudioError(null);
    setLoading(true);
    setError(null);
    setResults([]);
    setSkeletonCount(5);

    // Increment epoch so any stale listeners from a previous search are ignored
    const epoch = ++searchEpochRef.current;

    // Subscribe to streaming results BEFORE invoking search so we don't miss early items
    window.api?.offSearchResultItem?.();
    window.api?.onSearchResultItem?.((item) => {
      if (searchEpochRef.current !== epoch) return; // discard stale events
      setResults((prev) => {
        // Guard against duplicate items (shouldn't happen, but be safe)
        if (prev.some((r) => r.id === item.id)) return prev;
        return [...prev, item];
      });
      // Replace one skeleton row with the real result
      setSkeletonCount((n) => Math.max(0, n - 1));
      // Hide the full skeleton once we have something to show
      setLoading(false);
    });

    try {
      const response = await window.api?.searchYouTube?.(trimmed, 15);

      if (!response?.success) {
        setError(response?.error || 'Search failed. Please try again.');
        if (searchEpochRef.current === epoch) setResults([]);
      } else if (response.results?.length === 0) {
        setError(`No results found for "${trimmed}"`);
      }
    } catch (err) {
      setError(err?.message || 'Search failed. Please try again.');
      if (searchEpochRef.current === epoch) setResults([]);
    } finally {
      window.api?.offSearchResultItem?.();
      setLoading(false);
    }
  }, [query, loading, disabled, isConverting, stopAudio]);

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

  const handlePlayPause = useCallback(
    async (result, e) => {
      e.stopPropagation();

      if (disabled || isConverting) return;

      setAudioError(null);

      const audio = audioRef.current;

      // The audio element for this track is already loaded (playing or paused)
      if (loadedId === result.id && audio) {
        if (playingId === result.id) {
          // Currently playing → pause
          audio.pause();
          setPlayingId(null);
        } else {
          // Currently paused → resume without re-fetching
          try {
            await audio.play();
            setPlayingId(result.id);
          } catch (err) {
            setAudioError(`Could not resume preview for "${result.title}". Please try again.`);
            stopAudio();
          }
        }
        return;
      }

      // Different track (or first play) → stop current and load a fresh stream
      stopAudio();

      if (!result.webpageUrl) return;

      setLoadingAudioId(result.id);

      try {
        const response = await window.api?.getAudioStreamUrl?.(result.webpageUrl);

        if (!response?.success || !response.url) {
          throw new Error(response?.error || 'Could not get audio stream.');
        }

        const newAudio = new Audio(response.url);
        audioRef.current = newAudio;

        newAudio.addEventListener('timeupdate', () => {
          if (newAudio.duration && newAudio.duration > 0) {
            setAudioProgress((newAudio.currentTime / newAudio.duration) * 100);
          }
        });

        newAudio.addEventListener('ended', () => {
          setPlayingId(null);
          setLoadedId(null);
          setAudioProgress(0);
          audioRef.current = null;
        });

        newAudio.addEventListener('error', () => {
          setAudioError(`Could not play preview for "${result.title}". Please try again.`);
          setPlayingId(null);
          setLoadedId(null);
          setAudioProgress(0);
          audioRef.current = null;
        });

        setLoadedId(result.id);
        await newAudio.play();
        setPlayingId(result.id);
      } catch (err) {
        setAudioError(err?.message || 'Audio preview failed. Please try again.');
        setPlayingId(null);
        setLoadedId(null);
        audioRef.current = null;
      } finally {
        setLoadingAudioId(null);
      }
    },
    [playingId, loadedId, disabled, isConverting, stopAudio]
  );

  const isSearchDisabled = !query.trim() || loading || disabled || isConverting;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Box
        sx={{
          display: 'flex',
          gap: 2,
          alignItems: 'stretch',
          flexWrap: 'wrap',
        }}
      >
        <TextField
          placeholder="Search for a song (e.g. Keith Whitley When You Say Nothing At All)"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setError(null);
          }}
          onKeyDown={handleKeyDown}
          disabled={disabled || isConverting}
          size="small"
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon color="action" fontSize="small" />
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
          sx={{ flexShrink: 0, minWidth: 100 }}
        >
          Search
        </Button>
      </Box>

      {error && (
        <Alert severity={results.length === 0 ? 'warning' : 'info'} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {audioError && (
        <Alert severity="warning" onClose={() => setAudioError(null)}>
          {audioError}
        </Alert>
      )}

      {/* Results list — shows skeleton while waiting, then real rows as they stream in */}
      {(results.length > 0 || loading) && (
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
              {loading && results.length === 0
                ? 'Searching…'
                : loading
                ? `${results.length} results so far…`
                : 'Click a result to select · use the play button to preview audio'}
            </Typography>
          </Box>
          <List dense disablePadding sx={{ maxHeight: 400, overflow: 'auto' }}>
            {/* Real results */}
            {/* Real results */}
            {results.map((result, index) => {
              const isLoaded = loadedId === result.id;
              const isPlaying = playingId === result.id;
              const isLoadingAudio = loadingAudioId === result.id;

              let tooltipTitle = 'Preview audio';
              if (isLoadingAudio) tooltipTitle = 'Loading…';
              else if (isPlaying) tooltipTitle = 'Pause preview';
              else if (isLoaded) tooltipTitle = 'Resume preview';

              return (
                <Box
                  key={result.id || index}
                  sx={{ position: 'relative' }}
                >
                  <ListItemButton
                    onClick={() => handleSelect(result)}
                    disabled={disabled || isConverting}
                    sx={{
                      py: 1.5,
                      borderBottom: index < results.length - 1 ? 1 : 0,
                      borderColor: 'divider',
                      bgcolor: isLoaded ? 'action.selected' : undefined,
                      '&:hover': {
                        bgcolor: isLoaded ? 'action.selected' : 'action.hover',
                      },
                    }}
                  >
                    {/* Play/Pause button */}
                    <Tooltip title={tooltipTitle} placement="top">
                      <span>
                        <IconButton
                          size="small"
                          onClick={(e) => handlePlayPause(result, e)}
                          disabled={disabled || isConverting || isLoadingAudio}
                          sx={{
                            mr: 1,
                            flexShrink: 0,
                            color: isLoaded ? 'primary.main' : 'text.secondary',
                            '&:hover': { color: 'primary.main' },
                          }}
                        >
                          {isLoadingAudio ? (
                            <CircularProgress size={18} color="inherit" />
                          ) : isPlaying ? (
                            <PauseIcon fontSize="small" />
                          ) : (
                            <PlayArrowIcon fontSize="small" />
                          )}
                        </IconButton>
                      </span>
                    </Tooltip>

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
                          fontWeight: isLoaded ? 600 : 500,
                          color: isLoaded ? 'primary.main' : 'text.primary',
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

                  {/* Progress bar — visible while loaded (playing or paused) */}
                  {isLoaded && (
                    <LinearProgress
                      variant="determinate"
                      value={audioProgress}
                      sx={{
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        right: 0,
                        height: 2,
                        borderRadius: 0,
                        opacity: isPlaying ? 1 : 0.5,
                      }}
                    />
                  )}
                </Box>
              );
            })}

            {/* Skeleton rows for results still in-flight during streaming */}
            {loading && skeletonCount > 0 &&
              Array.from({ length: skeletonCount }).map((_, i) => (
                <Box
                  key={`skel-${i}`}
                  sx={{
                    display: 'flex',
                    gap: 2,
                    alignItems: 'center',
                    px: 2,
                    py: 1.5,
                    borderTop: 1,
                    borderColor: 'divider',
                  }}
                >
                  <Skeleton variant="circular" width={28} height={28} sx={{ flexShrink: 0 }} />
                  <Skeleton variant="rectangular" width={80} height={45} sx={{ borderRadius: 1, flexShrink: 0 }} />
                  <Box sx={{ flexGrow: 1 }}>
                    <Skeleton variant="text" width="70%" height={20} sx={{ mb: 0.5 }} />
                    <Skeleton variant="text" width="40%" height={16} />
                  </Box>
                </Box>
              ))
            }

            {/* Full skeleton before first result arrives */}
            {loading && results.length === 0 &&
              Array.from({ length: 5 }).map((_, i) => (
                <Box
                  key={`pre-${i}`}
                  sx={{
                    display: 'flex',
                    gap: 2,
                    alignItems: 'center',
                    px: 2,
                    py: 1.5,
                    borderTop: i > 0 ? 1 : 0,
                    borderColor: 'divider',
                  }}
                >
                  <Skeleton variant="circular" width={28} height={28} sx={{ flexShrink: 0 }} />
                  <Skeleton variant="rectangular" width={80} height={45} sx={{ borderRadius: 1, flexShrink: 0 }} />
                  <Box sx={{ flexGrow: 1 }}>
                    <Skeleton variant="text" width="70%" height={20} sx={{ mb: 0.5 }} />
                    <Skeleton variant="text" width="40%" height={16} />
                  </Box>
                </Box>
              ))
            }
          </List>
        </Paper>
      )}

      {/* Empty state — only when not loading and nothing to show */}
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
