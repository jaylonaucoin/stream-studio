import { useState, useCallback, useRef, useEffect } from 'react';
import {
  Box,
  TextField,
  Button,
  IconButton,
  InputAdornment,
  Tooltip,
  Alert,
  Paper,
  Skeleton,
  Tabs,
  Tab,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import LinkIcon from '@mui/icons-material/Link';
import ContentPasteIcon from '@mui/icons-material/ContentPaste';
import SyncIcon from '@mui/icons-material/Sync';
import CancelIcon from '@mui/icons-material/Cancel';
import MetadataEditor from './MetadataEditor';
import SegmentEditor from './SegmentEditor';
import YouTubeSearchPanel from './YouTubeSearchPanel';
import {
  VideoPreviewCard,
  PlaylistPreviewCard,
  PlaylistVideoSelector,
  ChapterSelector,
  FormatControls,
} from './conversion';
import { SUPPORTED_SITES } from '../constants';
import { normalizeUrl, isValidUrl, isLikelyUrl } from '../utils';

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
  const [playlistMode, setPlaylistMode] = useState('full');
  const [selectedVideos, setSelectedVideos] = useState([]);

  // Chapter state
  const [chapterInfo, setChapterInfo] = useState(null);
  const [loadingChapters, setLoadingChapters] = useState(false);
  const [selectedChapters, setSelectedChapters] = useState([]);
  const [chapterDownloadMode, setChapterDownloadMode] = useState('split');
  const [editedChapterTitles, setEditedChapterTitles] = useState({});
  const chapterTimeoutRef = useRef(null);

  // Manual segment state
  const [segments, setSegments] = useState([]);
  const [useSharedArtistForSegments, setUseSharedArtistForSegments] = useState(true);

  // Metadata editor state
  const [metadataEditorOpen, setMetadataEditorOpen] = useState(false);
  const [customMetadata, setCustomMetadata] = useState(null);

  // Input mode: 'search' (YouTube search) or 'paste' (URL input)
  const [inputMode, setInputMode] = useState('search');

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
    if (previewTimeoutRef.current) {
      clearTimeout(previewTimeoutRef.current);
    }

    // Reset preview state
    setVideoInfo(null);
    setPlaylistInfo(null);
    setChapterInfo(null);
    setPreviewError(null);
    setLoadingPreview(false);
    setPlaylistMode('full');
    setSelectedChapters([]);
    setSelectedVideos([]);
    setCustomMetadata(null);
    setSegments([]);
    setEditedChapterTitles({});

    const trimmed = url.trim();
    if (!trimmed) return;

    const validation = isValidUrl(trimmed);
    if (!validation.valid) return;

    setLoadingPreview(true);
    previewTimeoutRef.current = setTimeout(async () => {
      try {
        const normalizedUrl = normalizeUrl(trimmed);

        const [videoInfoResult, playlistInfoResult] = await Promise.allSettled([
          window.api?.getVideoInfo?.(normalizedUrl) || Promise.resolve({ success: false }),
          window.api?.getPlaylistInfo?.(normalizedUrl) ||
            Promise.resolve({ success: false, isPlaylist: false }),
        ]);

        if (videoInfoResult.status === 'fulfilled' && videoInfoResult.value.success) {
          setVideoInfo(videoInfoResult.value);
          setPreviewError(null);
        } else if (videoInfoResult.status === 'fulfilled' && !videoInfoResult.value?.success) {
          setPreviewError(videoInfoResult.value?.error || 'Failed to load video preview');
          setVideoInfo(null);
        } else if (videoInfoResult.status === 'rejected') {
          setPreviewError('Failed to load video preview');
          setVideoInfo(null);
        }

        if (playlistInfoResult.status === 'fulfilled' && playlistInfoResult.value.success) {
          if (playlistInfoResult.value.isPlaylist) {
            setPlaylistInfo(playlistInfoResult.value);
            setPlaylistMode('full');
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
    if (chapterTimeoutRef.current) {
      clearTimeout(chapterTimeoutRef.current);
    }

    setChapterInfo(null);
    setSelectedChapters([]);
    setLoadingChapters(false);

    if (!videoInfo || !videoInfo.success) return;
    if (playlistInfo?.isPlaylist) return;

    const trimmed = url.trim();
    if (!trimmed) return;

    const validation = isValidUrl(trimmed);
    if (!validation.valid) return;

    setLoadingChapters(true);
    chapterTimeoutRef.current = setTimeout(async () => {
      try {
        const normalizedUrl = normalizeUrl(trimmed);

        const chapterInfoResult = await Promise.allSettled([
          window.api?.getChapterInfo?.(normalizedUrl) ||
            Promise.resolve({ success: false, hasChapters: false }),
        ]);

        if (chapterInfoResult[0].status === 'fulfilled' && chapterInfoResult[0].value.success) {
          if (chapterInfoResult[0].value.hasChapters) {
            setChapterInfo(chapterInfoResult[0].value);
            const allIndices = chapterInfoResult[0].value.chapters.map((_, idx) => idx);
            setSelectedChapters(allIndices);
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
      if (text.trim()) setInputMode('paste');
    } catch (err) {
      console.error('Failed to read clipboard:', err);
    }
  }, [validateUrl]);

  const handleSearchSelect = useCallback((selectedUrl) => {
    if (selectedUrl) {
      setUrl(selectedUrl);
      validateUrl(selectedUrl);
      setInputMode('paste');
    }
  }, [validateUrl]);

  const handleModeChange = useCallback((newMode) => {
    setMode(newMode);
    if (newMode === 'audio') {
      setFormat('mp3');
    } else {
      setFormat('mp4');
    }
  }, []);

  const handlePlaylistModeChange = useCallback(
    (newMode) => {
      setPlaylistMode(newMode);
      if (newMode === 'selected' && playlistInfo && playlistInfo.videos) {
        const allIndices = playlistInfo.videos.map((v) => v.index);
        setSelectedVideos(allIndices);
      } else if (newMode === 'full') {
        setSelectedVideos([]);
      }
    },
    [playlistInfo]
  );

  const handleVideoToggle = useCallback((videoIndex) => {
    setSelectedVideos((prev) => {
      if (prev.includes(videoIndex)) {
        return prev.filter((idx) => idx !== videoIndex);
      } else {
        return [...prev, videoIndex].sort((a, b) => a - b);
      }
    });
  }, []);

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

  const handleChapterTitleChange = useCallback((chapterIndex, newTitle) => {
    setEditedChapterTitles((prev) => {
      if (newTitle === null) {
        const newTitles = { ...prev };
        delete newTitles[chapterIndex];
        return newTitles;
      }
      return { ...prev, [chapterIndex]: newTitle };
    });
  }, []);

  const handleSubmit = useCallback(
    (e) => {
      e.preventDefault();
      if (isValid && url.trim() && !isConverting) {
        const normalizedUrl = normalizeUrl(url.trim());
        const options = { mode, format, quality };

        if (playlistInfo && playlistInfo.isPlaylist) {
          options.playlistMode = playlistMode;
          if (playlistMode === 'selected' && selectedVideos && selectedVideos.length > 0) {
            options.selectedVideos = selectedVideos;
          }
        }

        const useManualSegments = segments && segments.length > 0;

        if (useManualSegments) {
          options.manualSegments = segments;
          options.useSharedArtistForSegments = useSharedArtistForSegments;
          options.chapterDownloadMode = null;
          options.chapters = null;
        } else if (chapterInfo && chapterInfo.hasChapters) {
          const chaptersWithEdits = chapterInfo.chapters.map((chapter, index) => ({
            ...chapter,
            title: editedChapterTitles[index] ?? chapter.title,
          }));

          const updatedChapterInfo = {
            ...chapterInfo,
            chapters: chaptersWithEdits,
          };

          options.chapterDownloadMode = chapterDownloadMode;
          if (chapterDownloadMode === 'split' && selectedChapters && selectedChapters.length > 0) {
            options.chapters = selectedChapters;
            options.chapterInfo = updatedChapterInfo;
          }
        }

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
        const trimmed = text.trim();
        setUrl(trimmed);
        validateUrl(trimmed);
        if (isLikelyUrl(trimmed)) setInputMode('paste');
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

      <Tabs
        value={inputMode}
        onChange={(_, newValue) => setInputMode(newValue)}
        sx={{
          mb: 3,
          mt: 0.5,
          minHeight: 48,
          borderBottom: 1,
          borderColor: 'divider',
          '& .MuiTab-root': { minHeight: 48, py: 1.5 },
        }}
        aria-label="Input mode tabs"
      >
        <Tab
          value="search"
          label="Search"
          icon={<SearchIcon fontSize="small" />}
          iconPosition="start"
          aria-controls="tabpanel-search"
          id="tab-search"
        />
        <Tab
          value="paste"
          label="Paste URL"
          icon={<LinkIcon fontSize="small" />}
          iconPosition="start"
          aria-controls="tabpanel-paste"
          id="tab-paste"
        />
      </Tabs>

      {inputMode === 'search' && (
        <Box
          id="tabpanel-search"
          role="tabpanel"
          aria-labelledby="tab-search"
          sx={{ mb: 2, mt: 1 }}
        >
          <YouTubeSearchPanel
            onSelect={handleSearchSelect}
            disabled={disabled}
            isConverting={isConverting}
          />
        </Box>
      )}

      {inputMode === 'paste' && (
        <Box
          id="tabpanel-paste"
          role="tabpanel"
          aria-labelledby="tab-paste"
          sx={{ mt: 1 }}
        >
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
        </Box>
      )}

      {/* Preview, chapters, format etc. - only show when on paste tab */}
      {inputMode === 'paste' && (
        <>
      {/* Loading Preview Skeleton */}
      {loadingPreview && (
        <Paper elevation={1} sx={{ p: 2, mb: 2, borderRadius: 2, bgcolor: 'background.paper' }}>
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

      {/* Single Video Preview */}
      {videoInfo && !loadingPreview && !playlistInfo?.isPlaylist && (
        <VideoPreviewCard
          videoInfo={videoInfo}
          chapterInfo={chapterInfo}
          customMetadata={customMetadata}
          onEditMetadata={() => setMetadataEditorOpen(true)}
          disabled={disabled}
          isConverting={isConverting}
        />
      )}

      {previewError && !loadingPreview && (
        <Alert severity="info" sx={{ mb: 2 }}>
          {previewError}
        </Alert>
      )}

      {/* Playlist Preview */}
      {playlistInfo?.isPlaylist && !loadingPreview && (
        <PlaylistPreviewCard
          playlistInfo={playlistInfo}
          playlistMode={playlistMode}
          onPlaylistModeChange={handlePlaylistModeChange}
          customMetadata={customMetadata}
          onEditMetadata={() => setMetadataEditorOpen(true)}
          disabled={disabled}
          isConverting={isConverting}
        />
      )}

      {/* Playlist Video Selection */}
      {playlistInfo &&
        !loadingPreview &&
        playlistInfo.isPlaylist &&
        playlistMode === 'selected' &&
        playlistInfo.videos &&
        playlistInfo.videos.length > 0 && (
          <PlaylistVideoSelector
            videos={playlistInfo.videos}
            selectedVideos={selectedVideos}
            onVideoToggle={handleVideoToggle}
            onSelectAll={() => {
              const allIndices = playlistInfo.videos.map((v) => v.index);
              setSelectedVideos(allIndices);
            }}
            onDeselectAll={() => setSelectedVideos([])}
            disabled={disabled}
            isConverting={isConverting}
          />
        )}

      {/* Manual Segmentation */}
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

      {/* Chapter Loading Skeleton */}
      {loadingChapters && !playlistInfo?.isPlaylist && segments.length === 0 && (
        <Paper elevation={1} sx={{ p: 2, mb: 2, borderRadius: 2, bgcolor: 'background.paper' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Skeleton variant="circular" width={24} height={24} />
            <Skeleton variant="text" width="60%" height={24} />
          </Box>
          <Box sx={{ mt: 1 }}>
            <Skeleton variant="text" width="40%" height={20} />
          </Box>
        </Paper>
      )}

      {/* Chapter Selection */}
      {chapterInfo &&
        !loadingChapters &&
        !playlistInfo?.isPlaylist &&
        chapterInfo.hasChapters &&
        segments.length === 0 && (
          <ChapterSelector
            chapterInfo={chapterInfo}
            selectedChapters={selectedChapters}
            onChapterToggle={handleChapterToggle}
            onSelectAll={handleSelectAllChapters}
            onDeselectAll={handleDeselectAllChapters}
            chapterDownloadMode={chapterDownloadMode}
            onChapterDownloadModeChange={setChapterDownloadMode}
            editedChapterTitles={editedChapterTitles}
            onChapterTitleChange={handleChapterTitleChange}
            onEditMetadata={() => setMetadataEditorOpen(true)}
            disabled={disabled}
            isConverting={isConverting}
          />
        )}

      {/* Format Controls */}
      <FormatControls
        mode={mode}
        format={format}
        quality={quality}
        onModeChange={handleModeChange}
        onFormatChange={setFormat}
        onQualityChange={setQuality}
        disabled={disabled}
        isConverting={isConverting}
      />

      {/* Submit/Cancel Buttons */}
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
        </>
      )}

      {/* Metadata Editor Dialog */}
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
