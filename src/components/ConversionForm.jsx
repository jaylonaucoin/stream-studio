import { useState, useCallback, useRef, useEffect } from 'react';
import {
  Box,
  TextField,
  Button,
  IconButton,
  InputAdornment,
  Tooltip,
  Alert,
  ToggleButton,
  ToggleButtonGroup,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Paper,
  Typography,
  Skeleton,
  Chip,
  Divider,
  Checkbox,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  ListItemIcon,
  Collapse,
} from '@mui/material';
import ContentPasteIcon from '@mui/icons-material/ContentPaste';
import SyncIcon from '@mui/icons-material/Sync';
import CancelIcon from '@mui/icons-material/Cancel';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PersonIcon from '@mui/icons-material/Person';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import CheckBoxIcon from '@mui/icons-material/CheckBox';
import CheckBoxOutlineBlankIcon from '@mui/icons-material/CheckBoxOutlineBlank';

const AUDIO_FORMATS = [
  { value: 'best', label: 'Best Quality' },
  { value: 'mp3', label: 'MP3' },
  { value: 'm4a', label: 'M4A' },
  { value: 'flac', label: 'FLAC' },
  { value: 'wav', label: 'WAV' },
  { value: 'aac', label: 'AAC' },
  { value: 'opus', label: 'Opus' },
  { value: 'vorbis', label: 'Vorbis' },
  { value: 'alac', label: 'ALAC' },
];

const VIDEO_FORMATS = [
  { value: 'mp4', label: 'MP4' },
  { value: 'mkv', label: 'MKV' },
  { value: 'webm', label: 'WebM' },
  { value: 'mov', label: 'MOV' },
  { value: 'avi', label: 'AVI' },
  { value: 'flv', label: 'FLV' },
  { value: 'gif', label: 'GIF' },
];

const QUALITY_OPTIONS = [
  { value: 'best', label: 'Best', description: 'Highest available quality' },
  { value: 'high', label: 'High', description: '1080p / 192kbps' },
  { value: 'medium', label: 'Medium', description: '720p / 128kbps' },
  { value: 'low', label: 'Low', description: '480p / 96kbps' },
];

// Popular supported sites (yt-dlp supports 1000+ sites)
// This list is for display purposes only - we accept any URL and let yt-dlp handle validation
const SUPPORTED_SITES = [
  'YouTube',
  'Vimeo',
  'Dailymotion',
  'Facebook',
  'Twitter/X',
  'TikTok',
  'Instagram',
  'Reddit',
  'Twitch',
  'SoundCloud',
  'Bandcamp',
  'Mixcloud',
  'Bilibili',
  'Niconico',
  'VK',
  'Rumble',
  'BitChute',
  'Odysee',
  'PeerTube',
  'Streamable',
  'Flickr',
  'Imgur',
  'Pinterest',
  'TED',
  'Khan Academy',
  'Udemy',
  'Coursera',
  'and 1000+ more...',
];

// Normalize URL - add protocol if missing, clean up common issues
const normalizeUrl = (url) => {
  let normalized = url.trim();

  // Remove leading/trailing whitespace and newlines
  normalized = normalized.replace(/[\r\n]/g, '').trim();

  // If URL doesn't have a protocol, add https://
  if (normalized && !normalized.match(/^https?:\/\//i)) {
    // Check if it looks like a domain (has a dot and no spaces)
    if (normalized.includes('.') && !normalized.includes(' ')) {
      normalized = 'https://' + normalized;
    }
  }

  return normalized;
};

// Validate URL - accepts any valid URL, lets yt-dlp handle site-specific validation
const isValidUrl = (url) => {
  if (!url || url.trim().length === 0) {
    return { valid: false, reason: '' };
  }

  const normalized = normalizeUrl(url);

  // Basic URL structure validation
  try {
    const urlObj = new URL(normalized);

    // Must be http or https
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      return { valid: false, reason: 'URL must use http:// or https://' };
    }

    // Must have a valid hostname
    if (!urlObj.hostname || urlObj.hostname.length < 3 || !urlObj.hostname.includes('.')) {
      return { valid: false, reason: 'Please enter a valid website URL' };
    }

    return { valid: true, normalized };
  } catch {
    // Check if it might be a valid URL without protocol
    if (url.includes('.') && !url.includes(' ')) {
      try {
        const withProtocol = 'https://' + url.trim();
        const urlObj = new URL(withProtocol);
        if (urlObj.hostname && urlObj.hostname.includes('.')) {
          return { valid: true, normalized: withProtocol };
        }
      } catch {
        // Still invalid
      }
    }
    return { valid: false, reason: 'Please enter a valid URL' };
  }
};

function ConversionForm({
  onConvert,
  onCancel,
  isConverting,
  disabled,
  defaultMode = 'audio',
  defaultAudioFormat = 'mp3',
  defaultVideoFormat = 'mp4',
  defaultQuality = 'best',
}) {
  const [url, setUrl] = useState('');
  const [isValid, setIsValid] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const containerRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [mode, setMode] = useState(defaultMode);
  const [format, setFormat] = useState(
    defaultMode === 'audio' ? defaultAudioFormat : defaultVideoFormat
  );
  const [quality, setQuality] = useState(defaultQuality);
  
  // Preview state
  const [videoInfo, setVideoInfo] = useState(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [previewError, setPreviewError] = useState(null);
  const previewTimeoutRef = useRef(null);
  
  // Playlist state
  const [playlistInfo, setPlaylistInfo] = useState(null);
  const [playlistMode, setPlaylistMode] = useState('single'); // 'single' or 'full'
  
  // Chapter state
  const [chapterInfo, setChapterInfo] = useState(null);
  const [loadingChapters, setLoadingChapters] = useState(false);
  const [selectedChapters, setSelectedChapters] = useState([]); // Array of chapter indices
  const chapterTimeoutRef = useRef(null);

  // Update mode/format/quality when defaults change
  useEffect(() => {
    setMode(defaultMode);
    setFormat(defaultMode === 'audio' ? defaultAudioFormat : defaultVideoFormat);
  }, [defaultMode, defaultAudioFormat, defaultVideoFormat]);

  useEffect(() => {
    setQuality(defaultQuality);
  }, [defaultQuality]);

  // Fetch video preview and playlist info when URL changes (debounced)
  useEffect(() => {
    // Clear previous timeout
    if (previewTimeoutRef.current) {
      clearTimeout(previewTimeoutRef.current);
    }
    
    // Reset preview state
    setVideoInfo(null);
    setPlaylistInfo(null);
    setChapterInfo(null);
    setPreviewError(null);
    setLoadingPreview(false);
    setPlaylistMode('single'); // Reset to single mode
    setSelectedChapters([]); // Reset selected chapters
    
    // Validate URL first
    const trimmed = url.trim();
    if (!trimmed) {
      return;
    }
    
    const validation = isValidUrl(trimmed);
    if (!validation.valid) {
      return;
    }
    
    // Debounce preview fetch (500ms)
    setLoadingPreview(true);
    previewTimeoutRef.current = setTimeout(async () => {
      try {
        const normalizedUrl = normalizeUrl(trimmed);
        
        // Fetch both video info and playlist info in parallel
        const [videoInfoResult, playlistInfoResult] = await Promise.allSettled([
          window.api?.getVideoInfo?.(normalizedUrl) || Promise.resolve({ success: false }),
          window.api?.getPlaylistInfo?.(normalizedUrl) || Promise.resolve({ success: false, isPlaylist: false })
        ]);
        
        // Handle video info
        if (videoInfoResult.status === 'fulfilled' && videoInfoResult.value.success) {
          setVideoInfo(videoInfoResult.value);
          setPreviewError(null);
        } else if (videoInfoResult.status === 'rejected') {
          setPreviewError('Failed to load video preview');
          setVideoInfo(null);
        }
        
        // Handle playlist info
        if (playlistInfoResult.status === 'fulfilled' && playlistInfoResult.value.success) {
          if (playlistInfoResult.value.isPlaylist) {
            setPlaylistInfo(playlistInfoResult.value);
            // Default to single mode even if playlist is detected
            setPlaylistMode('single');
          } else {
            setPlaylistInfo(null);
          }
        }
      } catch (error) {
        console.error('Preview fetch error:', error);
        setPreviewError(error.message || 'Failed to load video preview');
        setVideoInfo(null);
        setPlaylistInfo(null);
      } finally {
        setLoadingPreview(false);
      }
    }, 500);
    
    return () => {
      if (previewTimeoutRef.current) {
        clearTimeout(previewTimeoutRef.current);
      }
    };
  }, [url]);

  // Fetch chapter info when video info is loaded
  useEffect(() => {
    // Clear previous timeout
    if (chapterTimeoutRef.current) {
      clearTimeout(chapterTimeoutRef.current);
    }
    
    // Reset chapter state
    setChapterInfo(null);
    setSelectedChapters([]);
    setLoadingChapters(false);
    
    // Only fetch chapters if we have valid video info
    // Fetch chapters even if playlist is detected, as long as we're in single video mode
    if (!videoInfo || !videoInfo.success) {
      return;
    }
    
    // Don't fetch chapters if we're in full playlist mode
    if (playlistInfo?.isPlaylist && playlistMode === 'full') {
      return;
    }
    
    const trimmed = url.trim();
    if (!trimmed) {
      return;
    }
    
    const validation = isValidUrl(trimmed);
    if (!validation.valid) {
      return;
    }
    
    // Debounce chapter fetch (500ms after video info loads)
    setLoadingChapters(true);
    chapterTimeoutRef.current = setTimeout(async () => {
      try {
        const normalizedUrl = normalizeUrl(trimmed);
        
        const chapterInfoResult = await Promise.allSettled([
          window.api?.getChapterInfo?.(normalizedUrl) || Promise.resolve({ success: false, hasChapters: false })
        ]);
        
        // Handle chapter info
        if (chapterInfoResult[0].status === 'fulfilled' && chapterInfoResult[0].value.success) {
          if (chapterInfoResult[0].value.hasChapters) {
            setChapterInfo(chapterInfoResult[0].value);
            // Select all chapters by default
            const allIndices = chapterInfoResult[0].value.chapters.map((_, idx) => idx);
            setSelectedChapters(allIndices);
          } else {
            setChapterInfo(null);
          }
        }
      } catch (error) {
        console.error('Chapter fetch error:', error);
        setChapterInfo(null);
      } finally {
        setLoadingChapters(false);
      }
    }, 500);
    
    return () => {
      if (chapterTimeoutRef.current) {
        clearTimeout(chapterTimeoutRef.current);
      }
    };
  }, [videoInfo, playlistInfo, playlistMode, url]);

  const validateUrl = useCallback((urlToValidate) => {
    const trimmed = urlToValidate.trim();

    if (trimmed.length === 0) {
      setIsValid(true);
      setErrorMessage('');
      return false;
    }

    const result = isValidUrl(trimmed);
    setIsValid(result.valid);

    if (!result.valid && trimmed.length > 0) {
      setErrorMessage(result.reason || 'Please enter a valid URL');
    } else {
      setErrorMessage('');
    }

    return result.valid;
  }, []);

  const handleUrlChange = useCallback(
    (e) => {
      const newUrl = e.target.value;
      setUrl(newUrl);
      validateUrl(newUrl);
    },
    [validateUrl]
  );

  const handlePaste = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      setUrl(text);
      validateUrl(text);
    } catch (err) {
      console.error('Failed to read clipboard:', err);
    }
  }, [validateUrl]);

  const handleModeChange = useCallback((event, newMode) => {
    if (newMode !== null) {
      setMode(newMode);
      // Set default format when mode changes
      if (newMode === 'audio') {
        setFormat('mp3');
      } else {
        setFormat('mp4');
      }
    }
  }, []);

  const handleFormatChange = useCallback((e) => {
    setFormat(e.target.value);
  }, []);

  const handleQualityChange = useCallback((e) => {
    setQuality(e.target.value);
  }, []);

  // Chapter selection handlers
  const handleChapterToggle = useCallback((chapterIndex) => {
    setSelectedChapters((prev) => {
      if (prev.includes(chapterIndex)) {
        return prev.filter((idx) => idx !== chapterIndex);
      } else {
        return [...prev, chapterIndex].sort((a, b) => a - b);
      }
    });
  }, []);

  const handleSelectAllChapters = useCallback(() => {
    if (chapterInfo && chapterInfo.chapters) {
      const allIndices = chapterInfo.chapters.map((_, idx) => idx);
      setSelectedChapters(allIndices);
    }
  }, [chapterInfo]);

  const handleDeselectAllChapters = useCallback(() => {
    setSelectedChapters([]);
  }, []);

  const handleSubmit = useCallback(
    (e) => {
      e.preventDefault();
      if (isValid && url.trim() && !isConverting) {
        // Use normalized URL to ensure protocol is included
        const normalizedUrl = normalizeUrl(url.trim());
        // Only pass playlistMode if playlist is detected
        const options = { mode, format, quality };
        if (playlistInfo && playlistInfo.isPlaylist) {
          options.playlistMode = playlistMode;
        }
        // Pass selected chapters if any are selected
        if (selectedChapters && selectedChapters.length > 0 && chapterInfo && chapterInfo.hasChapters) {
          options.chapters = selectedChapters;
        }
        onConvert(normalizedUrl, options);
      }
    },
    [url, isValid, isConverting, mode, format, quality, playlistMode, playlistInfo, selectedChapters, chapterInfo, onConvert]
  );

  const handleKeyPress = useCallback(
    (e) => {
      if (e.key === 'Enter' && isValid && url.trim() && !isConverting) {
        handleSubmit(e);
      } else if (e.key === 'Escape' && isConverting) {
        onCancel();
      }
    },
    [url, isValid, isConverting, handleSubmit, onCancel]
  );

  // Drag and drop handlers
  const handleDragEnter = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      const dt = e.dataTransfer;
      const text = dt.getData('text/plain');

      if (text) {
        setUrl(text.trim());
        validateUrl(text.trim());
      }
    },
    [validateUrl]
  );

  return (
    <Box
      ref={containerRef}
      component="form"
      onSubmit={handleSubmit}
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      sx={{
        p: 3,
        borderRadius: 2,
        bgcolor: 'background.paper',
        border: isDragging ? 2 : 1,
        borderColor: isDragging ? 'primary.main' : 'divider',
        borderStyle: 'dashed',
        transition: 'all 0.2s ease-in-out',
        '&:hover': {
          borderColor: isDragging ? 'primary.main' : 'action.hover',
        },
      }}
    >
      {disabled && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          FFmpeg is not available. Please ensure FFmpeg is installed before converting.
        </Alert>
      )}

      <TextField
        fullWidth
        label="Video or Audio URL"
        placeholder="Paste any video or audio URL (YouTube, Vimeo, TikTok, Twitter, SoundCloud, etc.)"
        value={url}
        onChange={handleUrlChange}
        onKeyDown={handleKeyPress}
        disabled={isConverting || disabled}
        error={!isValid && url.length > 0}
        helperText={
          errorMessage ||
          (url.length === 0
            ? `Supports ${SUPPORTED_SITES.slice(0, 6).join(', ')} and 1000+ more sites`
            : '')
        }
        InputProps={{
          endAdornment: (
            <InputAdornment position="end">
              <Tooltip title="Paste from clipboard (Ctrl+V)">
                <IconButton
                  onClick={handlePaste}
                  edge="center"
                  disabled={isConverting || disabled}
                  aria-label="Paste URL from clipboard"
                >
                  <ContentPasteIcon />
                </IconButton>
              </Tooltip>
            </InputAdornment>
          ),
        }}
        inputProps={{
          'aria-label': 'Video or audio URL input',
        }}
        sx={{ mb: 2 }}
      />

      {/* Video Preview */}
      {loadingPreview && (
        <Paper
          elevation={1}
          sx={{
            p: 2,
            mb: 2,
            borderRadius: 2,
            bgcolor: 'background.paper',
          }}
        >
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Skeleton variant="rectangular" width={160} height={90} sx={{ borderRadius: 1 }} />
            <Box sx={{ flexGrow: 1 }}>
              <Skeleton variant="text" width="80%" height={24} sx={{ mb: 1 }} />
              <Skeleton variant="text" width="60%" height={20} />
              <Skeleton variant="text" width="40%" height={20} sx={{ mt: 1 }} />
            </Box>
          </Box>
        </Paper>
      )}

      {videoInfo && !loadingPreview && (
        <Paper
          elevation={1}
          sx={{
            p: 2,
            mb: 2,
            borderRadius: 2,
            bgcolor: 'background.paper',
            border: 1,
            borderColor: 'divider',
          }}
        >
          <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', sm: 'row' } }}>
            {videoInfo.thumbnail && (
              <Box
                component="img"
                src={videoInfo.thumbnail}
                alt={videoInfo.title}
                sx={{
                  width: { xs: '100%', sm: 160 },
                  height: { xs: 'auto', sm: 90 },
                  objectFit: 'cover',
                  borderRadius: 1,
                  flexShrink: 0,
                }}
                onError={(e) => {
                  e.target.style.display = 'none';
                }}
              />
            )}
            <Box sx={{ flexGrow: 1, minWidth: 0 }}>
              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, mb: 1 }}>
                <PlayArrowIcon sx={{ color: 'primary.main', mt: 0.5, flexShrink: 0 }} />
                <Typography
                  variant="subtitle1"
                  sx={{
                    fontWeight: 600,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                  }}
                >
                  {videoInfo.title}
                </Typography>
              </Box>
              
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, mt: 1 }}>
                {videoInfo.durationFormatted && (
                  <Chip
                    icon={<AccessTimeIcon />}
                    label={videoInfo.durationFormatted}
                    size="small"
                    variant="outlined"
                  />
                )}
                {videoInfo.uploader && (
                  <Chip
                    icon={<PersonIcon />}
                    label={videoInfo.uploader}
                    size="small"
                    variant="outlined"
                  />
                )}
              </Box>
            </Box>
          </Box>
        </Paper>
      )}

      {previewError && !loadingPreview && (
        <Alert severity="info" sx={{ mb: 2 }}>
          {previewError}
        </Alert>
      )}

      {/* Playlist Info and Mode Toggle */}
      {playlistInfo && !loadingPreview && (
        <Paper
          elevation={1}
          sx={{
            p: 2,
            mb: 2,
            borderRadius: 2,
            bgcolor: 'background.paper',
            border: 2,
            borderColor: 'primary.main',
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
            <Box sx={{ flexGrow: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <PlayArrowIcon sx={{ color: 'primary.main' }} />
                <Typography variant="subtitle1" sx={{ fontWeight: 600, color: 'text.primary' }}>
                  {playlistInfo.playlistTitle}
                </Typography>
                <Chip
                  label="Playlist"
                  size="small"
                  sx={{ bgcolor: 'primary.main', color: 'background.paper' }}
                />
              </Box>
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mt: 1 }}>
                <Chip
                  icon={<AccessTimeIcon />}
                  label={`${playlistInfo.playlistVideoCount} videos`}
                  size="small"
                  variant="outlined"
                  sx={{ borderColor: 'primary.main', color: 'text.primary' }}
                />
                {playlistInfo.playlistTotalDurationFormatted && (
                  <Chip
                    icon={<AccessTimeIcon />}
                    label={`~${playlistInfo.playlistTotalDurationFormatted}`}
                    size="small"
                    variant="outlined"
                    sx={{ borderColor: 'primary.main', color: 'text.primary' }}
                  />
                )}
              </Box>
            </Box>
          </Box>
          <Divider sx={{ my: 1.5, borderColor: 'divider' }} />
          <Box>
            <Typography variant="body2" sx={{ mb: 1, color: 'text.primary' }}>
              Download mode:
            </Typography>
            <ToggleButtonGroup
              value={playlistMode}
              exclusive
              onChange={(e, newMode) => {
                if (newMode !== null) {
                  setPlaylistMode(newMode);
                }
              }}
              aria-label="Playlist download mode"
              disabled={isConverting || disabled}
              fullWidth
              sx={{ height: '40px' }}
            >
              <ToggleButton value="single" aria-label="Single video mode">
                Single Video
              </ToggleButton>
              <ToggleButton value="full" aria-label="Full playlist mode">
                Full Playlist ({playlistInfo.playlistVideoCount} videos)
              </ToggleButton>
            </ToggleButtonGroup>
          </Box>
        </Paper>
      )}

      {/* Chapter Selection */}
      {loadingChapters && !(playlistInfo?.isPlaylist && playlistMode === 'full') && (
        <Paper
          elevation={1}
          sx={{
            p: 2,
            mb: 2,
            borderRadius: 2,
            bgcolor: 'background.paper',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Skeleton variant="circular" width={24} height={24} />
            <Skeleton variant="text" width="60%" height={24} />
          </Box>
          <Box sx={{ mt: 1 }}>
            <Skeleton variant="text" width="40%" height={20} />
          </Box>
        </Paper>
      )}

      {chapterInfo && !loadingChapters && !(playlistInfo?.isPlaylist && playlistMode === 'full') && chapterInfo.hasChapters && (
        <Paper
          elevation={1}
          sx={{
            p: 2,
            mb: 2,
            borderRadius: 2,
            bgcolor: 'background.paper',
            border: 2,
            borderColor: 'primary.main',
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <PlayArrowIcon sx={{ color: 'primary.main' }} />
              <Typography variant="subtitle1" sx={{ fontWeight: 600, color: 'text.primary' }}>
                Chapters
              </Typography>
              <Chip
                label={`${selectedChapters.length} of ${chapterInfo.totalChapters} selected`}
                size="small"
                sx={{ bgcolor: 'primary.main', color: 'background.paper' }}
              />
            </Box>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                size="small"
                onClick={handleSelectAllChapters}
                disabled={isConverting || disabled || selectedChapters.length === chapterInfo.totalChapters}
                sx={{ minWidth: 'auto', px: 1 }}
              >
                Select All
              </Button>
              <Button
                size="small"
                onClick={handleDeselectAllChapters}
                disabled={isConverting || disabled || selectedChapters.length === 0}
                sx={{ minWidth: 'auto', px: 1 }}
              >
                Deselect All
              </Button>
            </Box>
          </Box>
          <Divider sx={{ my: 1.5, borderColor: 'divider' }} />
          <Box
            sx={{
              maxHeight: 300,
              overflowY: 'auto',
              border: 1,
              borderColor: 'divider',
              borderRadius: 1,
            }}
          >
            <List dense sx={{ py: 0 }}>
              {chapterInfo.chapters.map((chapter, index) => (
                <ListItem
                  key={index}
                  disablePadding
                  sx={{
                    borderBottom: index < chapterInfo.chapters.length - 1 ? 1 : 0,
                    borderColor: 'divider',
                  }}
                >
                  <ListItemButton
                    onClick={() => handleChapterToggle(index)}
                    disabled={isConverting || disabled}
                    sx={{ py: 1 }}
                  >
                    <ListItemIcon sx={{ minWidth: 40 }}>
                      <Checkbox
                        edge="start"
                        checked={selectedChapters.includes(index)}
                        tabIndex={-1}
                        disableRipple
                        icon={<CheckBoxOutlineBlankIcon />}
                        checkedIcon={<CheckBoxIcon />}
                      />
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {chapter.title}
                        </Typography>
                      }
                      secondary={
                        <Box sx={{ display: 'flex', gap: 1, mt: 0.5, alignItems: 'center' }}>
                          <Chip
                            label={chapter.timeRange}
                            size="small"
                            variant="outlined"
                            sx={{ height: 20, fontSize: '0.7rem' }}
                          />
                          <Chip
                            label={chapter.durationFormatted}
                            size="small"
                            variant="outlined"
                            sx={{ height: 20, fontSize: '0.7rem' }}
                          />
                        </Box>
                      }
                    />
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
          </Box>
          {selectedChapters.length === 0 && (
            <Alert severity="info" sx={{ mt: 1.5 }}>
              No chapters selected. The full video will be downloaded.
            </Alert>
          )}
        </Paper>
      )}

      <Box
        sx={{
          mb: 2,
          display: 'flex',
          gap: 2,
          flexDirection: { xs: 'column', sm: 'row' },
          alignItems: { xs: 'stretch', sm: 'flex-end' },
        }}
      >
        <Box sx={{ flex: 1 }}>
          <Box sx={{ mb: 1 }}>
            <Box
              component="label"
              sx={{ fontSize: '0.875rem', color: 'text.secondary', display: 'block' }}
            >
              Mode
            </Box>
          </Box>
          <ToggleButtonGroup
            value={mode}
            exclusive
            onChange={handleModeChange}
            aria-label="Conversion mode selection"
            disabled={isConverting || disabled}
            fullWidth
            sx={{ height: '56px' }}
          >
            <ToggleButton value="audio" aria-label="Audio mode">
              Audio
            </ToggleButton>
            <ToggleButton value="video" aria-label="Video mode">
              Video
            </ToggleButton>
          </ToggleButtonGroup>
        </Box>

        <Box sx={{ flex: 1 }}>
          <FormControl fullWidth>
            <InputLabel id="format-select-label">Format</InputLabel>
            <Select
              value={format}
              label="Format"
              labelId="format-select-label"
              onChange={handleFormatChange}
              disabled={isConverting || disabled}
              aria-label="Output format selection"
            >
              {(mode === 'audio' ? AUDIO_FORMATS : VIDEO_FORMATS).map((fmt) => (
                <MenuItem key={fmt.value} value={fmt.value}>
                  {fmt.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>

        <Box sx={{ flex: 1 }}>
          <FormControl fullWidth>
            <InputLabel id="quality-select-label">Quality</InputLabel>
            <Select
              value={quality}
              label="Quality"
              labelId="quality-select-label"
              onChange={handleQualityChange}
              disabled={isConverting || disabled}
              aria-label="Quality selection"
            >
              {QUALITY_OPTIONS.map((opt) => (
                <MenuItem key={opt.value} value={opt.value}>
                  {opt.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      </Box>

      <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
        {isConverting ? (
          <Button variant="outlined" color="error" startIcon={<CancelIcon />} onClick={onCancel}>
            Cancel
          </Button>
        ) : (
          <Button
            type="submit"
            variant="contained"
            startIcon={<SyncIcon />}
            disabled={!isValid || !url.trim() || disabled}
          >
            Convert
          </Button>
        )}
      </Box>
    </Box>
  );
}

export default ConversionForm;
