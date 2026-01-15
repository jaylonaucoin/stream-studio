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
} from '@mui/material';
import ContentPasteIcon from '@mui/icons-material/ContentPaste';
import SyncIcon from '@mui/icons-material/Sync';
import CancelIcon from '@mui/icons-material/Cancel';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PersonIcon from '@mui/icons-material/Person';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import CheckBoxIcon from '@mui/icons-material/CheckBox';
import CheckBoxOutlineBlankIcon from '@mui/icons-material/CheckBoxOutlineBlank';
import EditIcon from '@mui/icons-material/Edit';
import MetadataEditor from './MetadataEditor';
import ThumbnailWithFallback from './ThumbnailWithFallback';
import SegmentEditor from './SegmentEditor';

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
  const [playlistMode, setPlaylistMode] = useState('full'); // 'full' or 'selected'
  const [selectedVideos, setSelectedVideos] = useState([]); // Array of video indices (1-based)

  // Chapter state
  const [chapterInfo, setChapterInfo] = useState(null);
  const [loadingChapters, setLoadingChapters] = useState(false);
  const [selectedChapters, setSelectedChapters] = useState([]); // Array of chapter indices
  const [chapterDownloadMode, setChapterDownloadMode] = useState('split'); // 'full' or 'split'
  const [editedChapterTitles, setEditedChapterTitles] = useState({}); // Map of chapterIndex -> editedTitle
  const [editingChapterIndex, setEditingChapterIndex] = useState(null); // Currently editing chapter index
  const [editingChapterValue, setEditingChapterValue] = useState(''); // Temporary value while editing
  const chapterTimeoutRef = useRef(null);

  // Manual segment state (for videos without chapters)
  const [segments, setSegments] = useState([]); // Array of segment objects
  const [useSharedArtistForSegments, setUseSharedArtistForSegments] = useState(true);

  // Metadata editor state
  const [metadataEditorOpen, setMetadataEditorOpen] = useState(false);
  const [customMetadata, setCustomMetadata] = useState(null);

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
    setPlaylistMode('full'); // Reset to full playlist mode
    setSelectedChapters([]); // Reset selected chapters
    setSelectedVideos([]); // Reset selected videos
    setCustomMetadata(null); // Reset custom metadata
    setSegments([]); // Reset manual segments
    setEditedChapterTitles({}); // Reset edited chapter titles
    setEditingChapterIndex(null); // Reset editing state

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
          window.api?.getPlaylistInfo?.(normalizedUrl) ||
            Promise.resolve({ success: false, isPlaylist: false }),
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
            // Default to full playlist mode
            setPlaylistMode('full');
            // Reset selected videos
            setSelectedVideos([]);
          } else {
            setPlaylistInfo(null);
            setSelectedVideos([]);
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

    // Only fetch chapters if we have valid video info and NOT a playlist
    if (!videoInfo || !videoInfo.success) {
      return;
    }

    // Don't fetch chapters for playlists - chapters are only for single videos
    if (playlistInfo?.isPlaylist) {
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
          window.api?.getChapterInfo?.(normalizedUrl) ||
            Promise.resolve({ success: false, hasChapters: false }),
        ]);

        // Handle chapter info
        if (chapterInfoResult[0].status === 'fulfilled' && chapterInfoResult[0].value.success) {
          if (chapterInfoResult[0].value.hasChapters) {
            setChapterInfo(chapterInfoResult[0].value);
            // Select all chapters by default
            const allIndices = chapterInfoResult[0].value.chapters.map((_, idx) => idx);
            setSelectedChapters(allIndices);
            // Reset to split mode when chapters are detected
            setChapterDownloadMode('split');
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
  }, [videoInfo, playlistInfo, url]);

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

  // Chapter title editing handlers
  const handleChapterTitleEdit = useCallback((chapterIndex) => {
    const chapter = chapterInfo?.chapters?.[chapterIndex];
    if (!chapter) return;
    
    const currentTitle = editedChapterTitles[chapterIndex] ?? chapter.title;
    setEditingChapterIndex(chapterIndex);
    setEditingChapterValue(currentTitle);
  }, [chapterInfo, editedChapterTitles]);

  const handleChapterTitleSave = useCallback((chapterIndex) => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/dac7c01d-8c04-4c1f-981d-2c3182cd7201',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ConversionForm.jsx:468',message:'handleChapterTitleSave called',data:{chapterIndex,editingChapterValue:editingChapterValue.trim()},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    if (editingChapterValue.trim()) {
      setEditedChapterTitles((prev) => {
        const newTitles = { ...prev, [chapterIndex]: editingChapterValue.trim() };
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/dac7c01d-8c04-4c1f-981d-2c3182cd7201',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ConversionForm.jsx:472',message:'editedChapterTitles updated',data:{chapterIndex,newTitle:editingChapterValue.trim(),allEditedTitles:newTitles},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
        // #endregion
        return newTitles;
      });
    } else {
      // Remove from edited titles if empty
      setEditedChapterTitles((prev) => {
        const newTitles = { ...prev };
        delete newTitles[chapterIndex];
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/dac7c01d-8c04-4c1f-981d-2c3182cd7201',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ConversionForm.jsx:478',message:'editedChapterTitles removed',data:{chapterIndex,allEditedTitles:newTitles},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
        // #endregion
        return newTitles;
      });
    }
    setEditingChapterIndex(null);
    setEditingChapterValue('');
  }, [editingChapterValue]);

  const handleChapterTitleCancel = useCallback(() => {
    setEditingChapterIndex(null);
    setEditingChapterValue('');
  }, []);

  const handleChapterTitleKeyDown = useCallback((e, chapterIndex) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleChapterTitleSave(chapterIndex);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleChapterTitleCancel();
    }
  }, [handleChapterTitleSave, handleChapterTitleCancel]);

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
          // Pass selected videos when in 'selected' mode
          if (playlistMode === 'selected' && selectedVideos && selectedVideos.length > 0) {
            options.selectedVideos = selectedVideos;
          }
        }
        // Check if manual segments should be used
        // Manual segments take priority over chapters when segments are defined
        const useManualSegments = segments && segments.length > 0;
        
        if (useManualSegments) {
          // Pass manual segments for splitting
          options.manualSegments = segments;
          options.useSharedArtistForSegments = useSharedArtistForSegments;
          // Don't use chapter mode when using manual segments
          options.chapterDownloadMode = null;
          options.chapters = null;
        } else if (chapterInfo && chapterInfo.hasChapters) {
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/dac7c01d-8c04-4c1f-981d-2c3182cd7201',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ConversionForm.jsx:527',message:'Building chapterInfo with edits',data:{editedChapterTitles,originalChapters:chapterInfo.chapters.map(c=>c.title)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
          // #endregion
          // Merge edited chapter titles into chapterInfo
          const chaptersWithEdits = chapterInfo.chapters.map((chapter, index) => ({
            ...chapter,
            title: editedChapterTitles[index] ?? chapter.title,
          }));
          
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/dac7c01d-8c04-4c1f-981d-2c3182cd7201',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ConversionForm.jsx:532',message:'chaptersWithEdits created',data:{editedTitles:chaptersWithEdits.map(c=>c.title)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
          // #endregion
          
          // Create updated chapterInfo with edited titles
          const updatedChapterInfo = {
            ...chapterInfo,
            chapters: chaptersWithEdits,
          };
          
          // Pass chapter download mode and selected chapters if chapters exist
          options.chapterDownloadMode = chapterDownloadMode;
          // Only pass selectedChapters when mode is 'split'
          if (chapterDownloadMode === 'split' && selectedChapters && selectedChapters.length > 0) {
            options.chapters = selectedChapters;
            // Pass updated chapterInfo with edited titles
            options.chapterInfo = updatedChapterInfo;
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/dac7c01d-8c04-4c1f-981d-2c3182cd7201',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ConversionForm.jsx:546',message:'options.chapterInfo set',data:{chapterInfoTitles:updatedChapterInfo.chapters.map(c=>c.title),selectedChapters},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
            // #endregion
          }
        }
        // Pass custom metadata if set
        if (customMetadata) {
          options.customMetadata = customMetadata;
        }
        onConvert(normalizedUrl, options);
      }
    },
    [
      url,
      isValid,
      isConverting,
      mode,
      format,
      quality,
      playlistMode,
      playlistInfo,
      selectedVideos,
      selectedChapters,
      chapterInfo,
      chapterDownloadMode,
      segments,
      useSharedArtistForSegments,
      customMetadata,
      editedChapterTitles,
      onConvert,
    ]
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

      {/* Single Video Preview - only show when NOT a playlist */}
      {videoInfo && !loadingPreview && !playlistInfo?.isPlaylist && (
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
            <ThumbnailWithFallback
              thumbnail={videoInfo.thumbnail}
              alt={videoInfo.title}
              isPlaylist={false}
            />
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
                    flexGrow: 1,
                  }}
                >
                  {videoInfo.title}
                </Typography>
                {/* Only show Edit Metadata button if chapters are NOT available (chapter panel has its own) */}
                {!chapterInfo?.hasChapters && (
                  <Tooltip title="Edit Metadata">
                    <IconButton
                      size="small"
                      onClick={() => setMetadataEditorOpen(true)}
                      disabled={isConverting || disabled}
                      sx={{ flexShrink: 0 }}
                    >
                      <EditIcon />
                    </IconButton>
                  </Tooltip>
                )}
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
                {chapterInfo?.hasChapters && (
                  <Chip
                    icon={<PlayArrowIcon />}
                    label={`${chapterInfo.totalChapters} chapters`}
                    size="small"
                    variant="outlined"
                    color="primary"
                  />
                )}
                {customMetadata && (
                  <Chip
                    icon={<EditIcon />}
                    label="Custom Metadata"
                    size="small"
                    color="primary"
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

      {/* Playlist Info and Mode Toggle - only show when IS a playlist */}
      {playlistInfo?.isPlaylist && !loadingPreview && (
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
          <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', sm: 'row' } }}>
            {/* Playlist thumbnail from first video */}
            <ThumbnailWithFallback
              thumbnail={playlistInfo.videos?.[0]?.thumbnail}
              alt={playlistInfo.playlistTitle}
              isPlaylist={true}
            />
            <Box sx={{ flexGrow: 1, minWidth: 0 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1, flexWrap: 'wrap' }}>
                <PlayArrowIcon sx={{ color: 'primary.main' }} />
                <Typography
                  variant="subtitle1"
                  sx={{
                    fontWeight: 600,
                    color: 'text.primary',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    flexGrow: 1,
                    minWidth: 0,
                  }}
                >
                  {playlistInfo.playlistTitle}
                </Typography>
                <Chip
                  label="Playlist"
                  size="small"
                  sx={{ bgcolor: 'primary.main', color: 'background.paper', flexShrink: 0 }}
                />
                <Tooltip title="Edit Metadata">
                  <IconButton
                    size="small"
                    onClick={() => setMetadataEditorOpen(true)}
                    disabled={isConverting || disabled}
                    sx={{ flexShrink: 0 }}
                  >
                    <EditIcon />
                  </IconButton>
                </Tooltip>
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
                {customMetadata && (
                  <Chip
                    icon={<EditIcon />}
                    label="Custom Metadata"
                    size="small"
                    color="primary"
                    variant="outlined"
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
                  // Auto-select all videos when switching to 'selected' mode
                  if (newMode === 'selected' && playlistInfo && playlistInfo.videos) {
                    const allIndices = playlistInfo.videos.map((v) => v.index);
                    setSelectedVideos(allIndices);
                  } else if (newMode === 'full') {
                    setSelectedVideos([]);
                  }
                }
              }}
              aria-label="Playlist download mode"
              disabled={isConverting || disabled}
              fullWidth
              sx={{ height: '40px' }}
            >
              <ToggleButton value="full" aria-label="Full playlist mode">
                Full Playlist ({playlistInfo.playlistVideoCount} videos)
              </ToggleButton>
              <ToggleButton value="selected" aria-label="Selected videos mode">
                Selected Videos
              </ToggleButton>
            </ToggleButtonGroup>
          </Box>
        </Paper>
      )}

      {/* Playlist Video Selection */}
      {playlistInfo &&
        !loadingPreview &&
        playlistInfo.isPlaylist &&
        playlistMode === 'selected' &&
        playlistInfo.videos &&
        playlistInfo.videos.length > 0 && (
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
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                mb: 1.5,
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <PlayArrowIcon sx={{ color: 'primary.main' }} />
                <Typography variant="subtitle1" sx={{ fontWeight: 600, color: 'text.primary' }}>
                  Select Videos
                </Typography>
                <Chip
                  label={`${selectedVideos.length} of ${playlistInfo.videos.length} selected`}
                  size="small"
                  sx={{ bgcolor: 'primary.main', color: 'background.paper' }}
                />
              </Box>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  size="small"
                  onClick={() => {
                    const allIndices = playlistInfo.videos.map((v) => v.index);
                    setSelectedVideos(allIndices);
                  }}
                  disabled={
                    isConverting || disabled || selectedVideos.length === playlistInfo.videos.length
                  }
                  sx={{ minWidth: 'auto', px: 1 }}
                >
                  Select All
                </Button>
                <Button
                  size="small"
                  onClick={() => setSelectedVideos([])}
                  disabled={isConverting || disabled || selectedVideos.length === 0}
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
                {playlistInfo.videos.map((video, index) => (
                  <ListItem
                    key={video.index}
                    disablePadding
                    sx={{
                      borderBottom: index < playlistInfo.videos.length - 1 ? 1 : 0,
                      borderColor: 'divider',
                    }}
                  >
                    <ListItemButton
                      onClick={() => {
                        if (selectedVideos.includes(video.index)) {
                          setSelectedVideos((prev) => prev.filter((idx) => idx !== video.index));
                        } else {
                          setSelectedVideos((prev) => [...prev, video.index].sort((a, b) => a - b));
                        }
                      }}
                      disabled={isConverting || disabled}
                      sx={{ py: 1 }}
                    >
                      <ListItemIcon sx={{ minWidth: 40 }}>
                        <Checkbox
                          edge="start"
                          checked={selectedVideos.includes(video.index)}
                          tabIndex={-1}
                          disableRipple
                          icon={<CheckBoxOutlineBlankIcon />}
                          checkedIcon={<CheckBoxIcon />}
                        />
                      </ListItemIcon>
                      <Box sx={{ display: 'flex', gap: 2, width: '100%', alignItems: 'center' }}>
                        <ThumbnailWithFallback
                          thumbnail={video.thumbnail}
                          alt={video.title}
                          isPlaylist={false}
                          width={80}
                          height={45}
                        />
                        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                          <ListItemText
                            primary={
                              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                {video.title}
                              </Typography>
                            }
                            secondary={
                              <Box sx={{ display: 'flex', gap: 1, mt: 0.5, alignItems: 'center' }}>
                                <Chip
                                  label={`#${video.index}`}
                                  size="small"
                                  variant="outlined"
                                  sx={{ height: 20, fontSize: '0.7rem' }}
                                />
                                {video.durationFormatted && (
                                  <Chip
                                    label={video.durationFormatted}
                                    size="small"
                                    variant="outlined"
                                    sx={{ height: 20, fontSize: '0.7rem' }}
                                  />
                                )}
                              </Box>
                            }
                          />
                        </Box>
                      </Box>
                    </ListItemButton>
                  </ListItem>
                ))}
              </List>
            </Box>
            {selectedVideos.length === 0 && (
              <Alert severity="info" sx={{ mt: 1.5 }}>
                No videos selected. Please select at least one video to download.
              </Alert>
            )}
          </Paper>
        )}

      {/* Manual Segmentation - show for single videos without chapters or with override option */}
      {videoInfo && !loadingPreview && !playlistInfo?.isPlaylist && (
        <SegmentEditor
          videoInfo={videoInfo}
          chapterInfo={chapterInfo}
          segments={segments}
          setSegments={setSegments}
          useSharedArtist={useSharedArtistForSegments}
          setUseSharedArtist={setUseSharedArtistForSegments}
          disabled={isConverting}
          onOpenMetadataEditor={() => setMetadataEditorOpen(true)}
        />
      )}

      {/* Chapter Selection - only show for single videos (not playlists) when not using manual segments */}
      {loadingChapters && !playlistInfo?.isPlaylist && segments.length === 0 && (
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

      {chapterInfo && !loadingChapters && !playlistInfo?.isPlaylist && chapterInfo.hasChapters && segments.length === 0 && (
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
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              mb: 1.5,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexGrow: 1 }}>
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
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              <Button
                size="small"
                onClick={handleSelectAllChapters}
                disabled={
                  isConverting || disabled || selectedChapters.length === chapterInfo.totalChapters
                }
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
              <Tooltip title="Edit Metadata">
                <IconButton
                  size="small"
                  onClick={() => setMetadataEditorOpen(true)}
                  disabled={isConverting || disabled}
                >
                  <EditIcon />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>
          <Divider sx={{ my: 1.5, borderColor: 'divider' }} />
          <Box sx={{ mb: 1.5 }}>
            <Typography variant="body2" sx={{ mb: 1, color: 'text.secondary' }}>
              Download mode:
            </Typography>
            <ToggleButtonGroup
              value={chapterDownloadMode}
              exclusive
              onChange={(e, newMode) => {
                if (newMode !== null) {
                  setChapterDownloadMode(newMode);
                }
              }}
              aria-label="Chapter download mode"
              disabled={isConverting || disabled || selectedChapters.length === 0}
              fullWidth
              sx={{ height: '40px' }}
            >
              <ToggleButton value="full" aria-label="Full video mode">
                Full Video
              </ToggleButton>
              <ToggleButton value="split" aria-label="Selected chapters mode">
                Selected Chapters
              </ToggleButton>
            </ToggleButtonGroup>
            {selectedChapters.length > 0 && chapterDownloadMode === 'full' && (
              <Typography
                variant="caption"
                sx={{ mt: 0.5, color: 'text.secondary', display: 'block' }}
              >
                The entire video will be downloaded as one file, ignoring chapter selection.
              </Typography>
            )}
            {selectedChapters.length > 0 && chapterDownloadMode === 'split' && (
              <Typography
                variant="caption"
                sx={{ mt: 0.5, color: 'text.secondary', display: 'block' }}
              >
                Selected chapters will be downloaded as separate files.
              </Typography>
            )}
          </Box>
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
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {editingChapterIndex === index ? (
                            <TextField
                              value={editingChapterValue}
                              onChange={(e) => setEditingChapterValue(e.target.value)}
                              onBlur={() => handleChapterTitleSave(index)}
                              onKeyDown={(e) => handleChapterTitleKeyDown(e, index)}
                              size="small"
                              autoFocus
                              fullWidth
                              sx={{ flexGrow: 1 }}
                              inputProps={{ style: { fontSize: '0.875rem' } }}
                            />
                          ) : (
                            <>
                              <Typography variant="body2" sx={{ fontWeight: 500, flexGrow: 1 }}>
                                {editedChapterTitles[index] ?? chapter.title}
                              </Typography>
                              <Tooltip title="Edit chapter title">
                                <IconButton
                                  size="small"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleChapterTitleEdit(index);
                                  }}
                                  disabled={isConverting || disabled}
                                  sx={{ ml: 0.5 }}
                                >
                                  <EditIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </>
                          )}
                        </Box>
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

      <MetadataEditor
        open={metadataEditorOpen}
        onClose={() => setMetadataEditorOpen(false)}
        onSave={(metadata) => {
          setCustomMetadata(metadata);
          setMetadataEditorOpen(false);
        }}
        videoInfo={videoInfo}
        playlistInfo={playlistInfo}
        chapterInfo={chapterInfo}
        selectedChapters={selectedChapters}
        selectedVideos={selectedVideos}
        segments={segments}
        useSharedArtistForSegments={useSharedArtistForSegments}
        customMetadata={customMetadata}
        mode={
          segments && segments.length > 0
            ? 'segment'
            : chapterInfo && chapterInfo.hasChapters
              ? 'chapter'
              : playlistInfo && playlistInfo.isPlaylist
                ? 'playlist'
                : 'single'
        }
      />
    </Box>
  );
}

export default ConversionForm;
