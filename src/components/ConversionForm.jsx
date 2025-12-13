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
} from '@mui/material';
import ContentPasteIcon from '@mui/icons-material/ContentPaste';
import SyncIcon from '@mui/icons-material/Sync';
import CancelIcon from '@mui/icons-material/Cancel';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PersonIcon from '@mui/icons-material/Person';
import AccessTimeIcon from '@mui/icons-material/AccessTime';

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

  // Update mode/format/quality when defaults change
  useEffect(() => {
    setMode(defaultMode);
    setFormat(defaultMode === 'audio' ? defaultAudioFormat : defaultVideoFormat);
  }, [defaultMode, defaultAudioFormat, defaultVideoFormat]);

  useEffect(() => {
    setQuality(defaultQuality);
  }, [defaultQuality]);

  // Fetch video preview when URL changes (debounced)
  useEffect(() => {
    // Clear previous timeout
    if (previewTimeoutRef.current) {
      clearTimeout(previewTimeoutRef.current);
    }
    
    // Reset preview state
    setVideoInfo(null);
    setPreviewError(null);
    setLoadingPreview(false);
    
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
        if (window.api && window.api.getVideoInfo) {
          const info = await window.api.getVideoInfo(normalizedUrl);
          if (info.success) {
            setVideoInfo(info);
            setPreviewError(null);
          } else {
            setPreviewError('Failed to load video preview');
            setVideoInfo(null);
          }
        }
      } catch (error) {
        console.error('Preview fetch error:', error);
        setPreviewError(error.message || 'Failed to load video preview');
        setVideoInfo(null);
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

  const handleSubmit = useCallback(
    (e) => {
      e.preventDefault();
      if (isValid && url.trim() && !isConverting) {
        // Use normalized URL to ensure protocol is included
        const normalizedUrl = normalizeUrl(url.trim());
        onConvert(normalizedUrl, { mode, format, quality });
      }
    },
    [url, isValid, isConverting, mode, format, quality, onConvert]
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
