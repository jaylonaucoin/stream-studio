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
  Select,
  MenuItem,
  Typography,
  Chip,
  Fade,
  Zoom,
  alpha,
} from '@mui/material';
import ContentPasteIcon from '@mui/icons-material/ContentPaste';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import StopIcon from '@mui/icons-material/Stop';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import MovieIcon from '@mui/icons-material/Movie';
import CloudDownloadIcon from '@mui/icons-material/CloudDownload';
import LinkIcon from '@mui/icons-material/Link';
import HighQualityIcon from '@mui/icons-material/HighQuality';
import TuneIcon from '@mui/icons-material/Tune';
import KeyboardReturnIcon from '@mui/icons-material/KeyboardReturn';
import { colors } from '../styles/theme';

const AUDIO_FORMATS = [
  { value: 'best', label: 'Best Quality', description: 'Highest available' },
  { value: 'mp3', label: 'MP3', description: 'Universal compatibility' },
  { value: 'm4a', label: 'M4A', description: 'Apple/iTunes format' },
  { value: 'flac', label: 'FLAC', description: 'Lossless audio' },
  { value: 'wav', label: 'WAV', description: 'Uncompressed audio' },
  { value: 'aac', label: 'AAC', description: 'Advanced audio codec' },
  { value: 'opus', label: 'Opus', description: 'Modern efficient codec' },
  { value: 'vorbis', label: 'Vorbis', description: 'Open source codec' },
  { value: 'alac', label: 'ALAC', description: 'Apple lossless' },
];

const VIDEO_FORMATS = [
  { value: 'mp4', label: 'MP4', description: 'Universal compatibility' },
  { value: 'mkv', label: 'MKV', description: 'Feature-rich container' },
  { value: 'webm', label: 'WebM', description: 'Web optimized' },
  { value: 'mov', label: 'MOV', description: 'Apple QuickTime' },
  { value: 'avi', label: 'AVI', description: 'Legacy format' },
  { value: 'flv', label: 'FLV', description: 'Flash video' },
  { value: 'gif', label: 'GIF', description: 'Animated image' },
];

const QUALITY_OPTIONS = [
  { value: 'best', label: 'Best', description: 'Highest available quality', icon: '✨' },
  { value: 'high', label: 'High', description: '1080p / 192kbps', icon: '🎯' },
  { value: 'medium', label: 'Medium', description: '720p / 128kbps', icon: '⚖️' },
  { value: 'low', label: 'Low', description: '480p / 96kbps', icon: '💾' },
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

  // Update mode/format/quality when defaults change
  useEffect(() => {
    setMode(defaultMode);
    setFormat(defaultMode === 'audio' ? defaultAudioFormat : defaultVideoFormat);
  }, [defaultMode, defaultAudioFormat, defaultVideoFormat]);

  useEffect(() => {
    setQuality(defaultQuality);
  }, [defaultQuality]);

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

  const currentFormats = mode === 'audio' ? AUDIO_FORMATS : VIDEO_FORMATS;

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
        borderRadius: 3,
        bgcolor: alpha(colors.background.card, 0.8),
        backdropFilter: 'blur(20px)',
        border: `2px solid ${isDragging ? colors.primary.main : colors.divider}`,
        borderStyle: isDragging ? 'solid' : 'solid',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: isDragging
          ? `0 0 30px ${alpha(colors.primary.main, 0.3)}, inset 0 0 60px ${alpha(colors.primary.main, 0.05)}`
          : '0 8px 32px rgba(0,0,0,0.3)',
        '&:hover': {
          borderColor: alpha(colors.primary.main, 0.3),
        },
      }}
    >
      {/* Drag Overlay */}
      <Fade in={isDragging}>
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            bgcolor: alpha(colors.primary.main, 0.1),
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10,
            borderRadius: 2,
          }}
        >
          <Box sx={{ textAlign: 'center' }}>
            <Zoom in={isDragging}>
              <CloudDownloadIcon
                sx={{
                  fontSize: 64,
                  color: 'primary.main',
                  mb: 1,
                  animation: 'bounce 1s infinite',
                  '@keyframes bounce': {
                    '0%, 100%': { transform: 'translateY(0)' },
                    '50%': { transform: 'translateY(-10px)' },
                  },
                }}
              />
            </Zoom>
            <Typography variant="h6" color="primary.main" fontWeight={600}>
              Drop URL here
            </Typography>
          </Box>
        </Box>
      </Fade>

      {/* Disabled Alert */}
      {disabled && (
        <Alert
          severity="warning"
          sx={{
            mb: 3,
            borderRadius: 2,
            '& .MuiAlert-icon': { alignItems: 'center' },
          }}
        >
          <Typography variant="body2" fontWeight={500}>
            FFmpeg is not available. Please ensure FFmpeg is installed before converting.
          </Typography>
        </Alert>
      )}

      {/* URL Input */}
      <Box sx={{ mb: 3 }}>
        <TextField
          fullWidth
          label="Video or Audio URL"
          placeholder="Paste any URL from YouTube, Vimeo, TikTok, Twitter, SoundCloud..."
          value={url}
          onChange={handleUrlChange}
          onKeyDown={handleKeyPress}
          disabled={isConverting || disabled}
          error={!isValid && url.length > 0}
          helperText={
            errorMessage || (
              <Box component="span" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Typography variant="caption" color="text.secondary">
                  Supports 1000+ sites including YouTube, Vimeo, TikTok, Twitter, Instagram,
                  SoundCloud & more
                </Typography>
              </Box>
            )
          }
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <LinkIcon sx={{ color: 'text.secondary' }} />
              </InputAdornment>
            ),
            endAdornment: (
              <InputAdornment position="end">
                <Tooltip title="Paste from clipboard (Ctrl+V)" arrow>
                  <IconButton
                    onClick={handlePaste}
                    edge="end"
                    disabled={isConverting || disabled}
                    aria-label="paste"
                    sx={{
                      color: 'text.secondary',
                      '&:hover': { color: 'primary.main' },
                    }}
                  >
                    <ContentPasteIcon />
                  </IconButton>
                </Tooltip>
              </InputAdornment>
            ),
          }}
          sx={{
            '& .MuiOutlinedInput-root': {
              fontSize: '1rem',
            },
          }}
        />
      </Box>

      {/* Controls Row */}
      <Box
        sx={{
          mb: 3,
          display: 'grid',
          gap: 2,
          gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr 1fr' },
        }}
      >
        {/* Mode Toggle */}
        <Box>
          <Typography
            variant="subtitle2"
            color="text.secondary"
            sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 0.5 }}
          >
            <TuneIcon sx={{ fontSize: 16 }} />
            Mode
          </Typography>
          <ToggleButtonGroup
            value={mode}
            exclusive
            onChange={handleModeChange}
            aria-label="conversion mode"
            disabled={isConverting || disabled}
            fullWidth
            sx={{
              height: 48,
              '& .MuiToggleButton-root': {
                gap: 1,
                fontSize: '0.9rem',
              },
            }}
          >
            <ToggleButton value="audio" aria-label="audio mode">
              <MusicNoteIcon sx={{ fontSize: 20 }} />
              Audio
            </ToggleButton>
            <ToggleButton value="video" aria-label="video mode">
              <MovieIcon sx={{ fontSize: 20 }} />
              Video
            </ToggleButton>
          </ToggleButtonGroup>
        </Box>

        {/* Format Select */}
        <Box>
          <Typography
            variant="subtitle2"
            color="text.secondary"
            sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 0.5 }}
          >
            {mode === 'audio' ? (
              <MusicNoteIcon sx={{ fontSize: 16 }} />
            ) : (
              <MovieIcon sx={{ fontSize: 16 }} />
            )}
            Format
          </Typography>
          <FormControl fullWidth size="medium">
            <Select
              value={format}
              onChange={handleFormatChange}
              disabled={isConverting || disabled}
              MenuProps={{
                PaperProps: {
                  sx: {
                    maxHeight: 300,
                    '& .MuiMenuItem-root': {
                      py: 1.5,
                    },
                  },
                },
              }}
            >
              {currentFormats.map((fmt) => (
                <MenuItem key={fmt.value} value={fmt.value}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Typography fontWeight={500}>{fmt.label}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {fmt.description}
                    </Typography>
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>

        {/* Quality Select */}
        <Box>
          <Typography
            variant="subtitle2"
            color="text.secondary"
            sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 0.5 }}
          >
            <HighQualityIcon sx={{ fontSize: 16 }} />
            Quality
          </Typography>
          <FormControl fullWidth size="medium">
            <Select
              value={quality}
              onChange={handleQualityChange}
              disabled={isConverting || disabled}
              renderValue={(value) => {
                const opt = QUALITY_OPTIONS.find((q) => q.value === value);
                return (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <span>{opt?.icon}</span>
                    <Typography fontWeight={500}>{opt?.label}</Typography>
                  </Box>
                );
              }}
            >
              {QUALITY_OPTIONS.map((opt) => (
                <MenuItem key={opt.value} value={opt.value}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <span style={{ fontSize: '1.2rem' }}>{opt.icon}</span>
                    <Box>
                      <Typography fontWeight={500}>{opt.label}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {opt.description}
                      </Typography>
                    </Box>
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      </Box>

      {/* Action Button */}
      <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', alignItems: 'center' }}>
        {/* Keyboard Shortcut Hint */}
        {!isConverting && url.trim() && isValid && (
          <Fade in>
            <Chip
              icon={<KeyboardReturnIcon sx={{ fontSize: 16 }} />}
              label="Press Enter to convert"
              size="small"
              variant="outlined"
              sx={{
                borderColor: alpha(colors.text.secondary, 0.3),
                color: 'text.secondary',
                '& .MuiChip-icon': { color: 'text.secondary' },
              }}
            />
          </Fade>
        )}

        {isConverting ? (
          <Button
            variant="outlined"
            color="error"
            startIcon={<StopIcon />}
            onClick={onCancel}
            size="large"
            sx={{
              minWidth: 140,
              height: 48,
              borderWidth: 2,
              '&:hover': { borderWidth: 2 },
            }}
          >
            Cancel
          </Button>
        ) : (
          <Button
            type="submit"
            variant="contained"
            startIcon={<PlayArrowIcon />}
            disabled={!isValid || !url.trim() || disabled}
            size="large"
            sx={{
              minWidth: 140,
              height: 48,
              fontSize: '1rem',
            }}
          >
            Convert
          </Button>
        )}
      </Box>
    </Box>
  );
}

export default ConversionForm;
