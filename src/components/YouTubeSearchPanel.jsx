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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import PersonIcon from '@mui/icons-material/Person';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import ThumbnailWithFallback from './ThumbnailWithFallback';
import { SEARCH_SITES } from '../constants';

function YouTubeSearchPanel({ onSelect, disabled, isConverting, defaultSearchSite = 'youtube', defaultSearchLimit = 15 }) {
  const [query, setQuery] = useState('');
  const [searchSite, setSearchSite] = useState(defaultSearchSite);
  const [searchLimit, setSearchLimit] = useState(defaultSearchLimit);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [results, setResults] = useState([]);

  // Audio preview state
  // playingId  — ID of the track currently emitting sound
  // loadedId   — ID of the track whose Audio element is alive (playing OR paused)
  const [playingId, setPlayingId] = useState(null);
  const [loadedId, setLoadedId] = useState(null);
  const [loadingAudioId, setLoadingAudioId] = useState(null);
  const [audioProgress, setAudioProgress] = useState(0);
  const [audioError, setAudioError] = useState(null);
  const audioRef = useRef(null);

  // Fully stop and destroy the current audio element
  const stopAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.removeAttribute('src');
      audioRef.current.load();
      audioRef.current = null;
    }
    setPlayingId(null);
    setLoadedId(null);
    setAudioProgress(0);
  }, []);

  useEffect(() => {
    return () => stopAudio();
  }, [stopAudio]);

  const handleSearch = useCallback(async () => {
    const trimmed = query.trim();
    if (!trimmed || loading || disabled || isConverting) return;

    stopAudio();
    setAudioError(null);
    setLoading(true);
    setError(null);
    setResults([]);

    try {
      const response = window.api?.searchMultiSite
        ? await window.api.searchMultiSite(searchSite, trimmed, searchLimit)
        : await window.api?.searchYouTube?.(trimmed, searchLimit);

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
    } finally {
      setLoading(false);
    }
  }, [query, loading, disabled, isConverting, stopAudio, searchSite, searchLimit]);

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

      // Audio element for this track already loaded — just toggle play/pause
      if (loadedId === result.id && audio) {
        if (playingId === result.id) {
          audio.pause();
          setPlayingId(null);
        } else {
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

      // Different track — stop current and fetch a new stream URL
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
          if (newAudio.duration > 0) {
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
      {/* Site selector and search bar */}
      <Box sx={{ display: 'flex', gap: 2, alignItems: 'stretch', flexWrap: 'wrap' }}>
        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel>Search site</InputLabel>
          <Select
            value={searchSite}
            label="Search site"
            onChange={(e) => setSearchSite(e.target.value)}
            disabled={disabled || isConverting}
          >
            {SEARCH_SITES.map((site) => (
              <MenuItem key={site.id} value={site.id}>
                {site.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <TextField
          placeholder={`Search ${SEARCH_SITES.find((s) => s.id === searchSite)?.label || 'this site'}...`}
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
          inputProps={{ 'aria-label': 'YouTube search query' }}
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

      {/* Loading skeleton */}
      {loading && (
        <Paper
          elevation={1}
          sx={{ borderRadius: 2, bgcolor: 'background.paper', border: 1, borderColor: 'divider', overflow: 'hidden' }}
        >
          <Box sx={{ px: 2, py: 1.5, borderBottom: 1, borderColor: 'divider' }}>
            <Typography variant="subtitle2" color="text.secondary">Searching…</Typography>
          </Box>
          <Box sx={{ display: 'flex', flexDirection: 'column' }}>
            {[0, 1, 2, 3, 4].map((i) => (
              <Box
                key={i}
                sx={{
                  display: 'flex',
                  gap: 2,
                  alignItems: 'center',
                  px: 2,
                  py: 1.5,
                  borderBottom: i < 4 ? 1 : 0,
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
            ))}
          </Box>
        </Paper>
      )}

      {/* Results list */}
      {!loading && results.length > 0 && (
        <Paper
          elevation={1}
          sx={{ borderRadius: 2, bgcolor: 'background.paper', border: 1, borderColor: 'divider', overflow: 'hidden' }}
        >
          <Box sx={{ px: 2, py: 1.5, borderBottom: 1, borderColor: 'divider' }}>
            <Typography variant="subtitle2" color="text.secondary">
              Click a result to select · use the play button to preview audio
            </Typography>
          </Box>
          <List dense disablePadding sx={{ maxHeight: 400, overflow: 'auto' }}>
            {results.map((result, index) => {
              const isLoaded = loadedId === result.id;
              const isPlaying = playingId === result.id;
              const isLoadingAudio = loadingAudioId === result.id;

              let tooltipTitle = 'Preview audio';
              if (isLoadingAudio) tooltipTitle = 'Loading…';
              else if (isPlaying) tooltipTitle = 'Pause preview';
              else if (isLoaded) tooltipTitle = 'Resume preview';

              return (
                <Box key={result.id || index} sx={{ position: 'relative' }}>
                  <ListItemButton
                    onClick={() => handleSelect(result)}
                    disabled={disabled || isConverting}
                    sx={{
                      py: 1.5,
                      borderBottom: index < results.length - 1 ? 1 : 0,
                      borderColor: 'divider',
                      bgcolor: isLoaded ? 'action.selected' : undefined,
                      '&:hover': { bgcolor: isLoaded ? 'action.selected' : 'action.hover' },
                    }}
                  >
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
                            sx={{ display: 'flex', alignItems: 'center', gap: 0.25, overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}
                          >
                            <PersonIcon sx={{ fontSize: 14 }} />
                            {result.uploader}
                          </Typography>
                        )}
                        {result.durationFormatted && (
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}
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
