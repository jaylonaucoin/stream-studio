import { useState, useCallback, useRef, useEffect } from 'react';
import {
  Box,
  Typography,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Paper,
  Chip,
  Button,
  TextField,
  Drawer,
  Divider,
  LinearProgress,
  Alert,
  Tooltip,
  CircularProgress,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material';
import QueueIcon from '@mui/icons-material/Queue';
import DeleteIcon from '@mui/icons-material/Delete';
import ClearIcon from '@mui/icons-material/Clear';
import CloseIcon from '@mui/icons-material/Close';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import FileUploadIcon from '@mui/icons-material/FileUpload';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import StopIcon from '@mui/icons-material/Stop';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import ReplayIcon from '@mui/icons-material/Replay';
import PlaylistPlayIcon from '@mui/icons-material/PlaylistPlay';
import UnfoldMoreIcon from '@mui/icons-material/UnfoldMore';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import { normalizeUrl, isValidUrl as validateUrl } from '../utils';
import { isAudioOnlyExtractor, isAudioOnlyUrl } from '../constants';

// Simple boolean wrapper for URL validation
const isValidUrl = (url) => {
  const result = validateUrl(url);
  return result.valid;
};

function QueuePanel({
  open,
  onClose,
  queue = [],
  setQueue,
  outputFolder,
  defaultMode,
  defaultFormat,
  defaultQuality,
  onQueueComplete,
  onRegisterAddToQueue,
}) {
  const [urls, setUrls] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentProgress, setCurrentProgress] = useState(0);
  const [isChecking, setIsChecking] = useState(false);
  const stopRequestedRef = useRef(false);

  const addUrlsToQueue = useCallback(
    async (urlStrings) => {
      const validUrls = urlStrings.filter((u) => u?.trim()).filter(isValidUrl);
      if (validUrls.length === 0) return;

      const baseIds = validUrls.map((_, i) => Date.now().toString() + i);
      const initialItems = validUrls.map((url, index) => {
        const normalizedUrl = normalizeUrl(url.trim());
        return {
          id: baseIds[index],
          url: normalizedUrl,
          status: 'pending',
          error: null,
          isPlaylist: false,
          playlistInfo: null,
          playlistMode: 'full',
          title: null,
          thumbnail: null,
        };
      });

      setQueue((prev) => [...prev, ...initialItems]);

      validUrls.forEach(async (url, index) => {
        const normalizedUrl = normalizeUrl(url.trim());
        const id = baseIds[index];
        try {
          const [videoInfoResult, playlistInfoResult] = await Promise.allSettled([
            window.api?.getVideoInfo?.(normalizedUrl) || Promise.resolve({ success: false }),
            window.api?.getPlaylistInfo?.(normalizedUrl) ||
              Promise.resolve({ success: false, isPlaylist: false }),
          ]);

          setQueue((prev) =>
            prev.map((item) => {
              if (item.id !== id) return item;
              const next = { ...item };
              if (videoInfoResult.status === 'fulfilled' && videoInfoResult.value.success) {
                next.title = videoInfoResult.value.title;
                next.thumbnail = videoInfoResult.value.thumbnail;
                next.extractor = videoInfoResult.value.extractor || null;
              }
              if (
                playlistInfoResult.status === 'fulfilled' &&
                playlistInfoResult.value.success &&
                playlistInfoResult.value.isPlaylist
              ) {
                next.isPlaylist = true;
                next.playlistInfo = playlistInfoResult.value;
                next.title = playlistInfoResult.value.playlistTitle;
                next.thumbnail = playlistInfoResult.value.videos?.[0]?.thumbnail || null;
                next.extractor = playlistInfoResult.value.extractor || next.extractor;
              }
              return next;
            })
          );
        } catch (error) {
          console.error('Error enriching URL:', error);
        }
      });
    },
    [setQueue]
  );

  const handleAddToQueue = useCallback(async () => {
    const lines = urls.split('\n').filter((line) => line.trim());
    if (lines.filter(isValidUrl).length === 0) return;

    setIsChecking(true);
    try {
      await addUrlsToQueue(lines);
      setUrls('');
    } finally {
      setIsChecking(false);
    }
  }, [urls, addUrlsToQueue]);

  const addSingleToQueue = useCallback(
    (urlOrItem) => {
      if (typeof urlOrItem === 'string') {
        addUrlsToQueue([urlOrItem]);
        return;
      }
      if (urlOrItem?.url) {
        const normalizedUrl = normalizeUrl(urlOrItem.url.trim());
        if (!isValidUrl(normalizedUrl)) return;
        const item = {
          id: Date.now().toString(),
          url: normalizedUrl,
          status: 'pending',
          error: null,
          isPlaylist: false,
          playlistInfo: null,
          playlistMode: 'full',
          title: urlOrItem.title ?? null,
          thumbnail: Array.isArray(urlOrItem.thumbnail)
            ? urlOrItem.thumbnail[0]
            : (urlOrItem.thumbnail ?? null),
        };
        setQueue((prev) => [...prev, item]);
        (async () => {
          try {
            const [videoInfoResult, playlistInfoResult] = await Promise.allSettled([
              window.api?.getVideoInfo?.(normalizedUrl) || Promise.resolve({ success: false }),
              window.api?.getPlaylistInfo?.(normalizedUrl) ||
                Promise.resolve({ success: false, isPlaylist: false }),
            ]);
            setQueue((prev) =>
              prev.map((q) => {
                if (q.id !== item.id) return q;
                const next = { ...q };
                if (videoInfoResult.status === 'fulfilled' && videoInfoResult.value.success) {
                  next.title = videoInfoResult.value.title;
                  next.thumbnail = videoInfoResult.value.thumbnail;
                  next.extractor = videoInfoResult.value.extractor || null;
                }
                if (
                  playlistInfoResult.status === 'fulfilled' &&
                  playlistInfoResult.value.success &&
                  playlistInfoResult.value.isPlaylist
                ) {
                  next.isPlaylist = true;
                  next.playlistInfo = playlistInfoResult.value;
                  next.title = playlistInfoResult.value.playlistTitle;
                  next.thumbnail = playlistInfoResult.value.videos?.[0]?.thumbnail || null;
                  next.extractor = playlistInfoResult.value.extractor || next.extractor;
                }
                return next;
              })
            );
          } catch (error) {
            console.error('Error enriching URL:', error);
          }
        })();
      }
    },
    [addUrlsToQueue, setQueue]
  );

  useEffect(() => {
    onRegisterAddToQueue?.(addSingleToQueue);
    return () => onRegisterAddToQueue?.(null);
  }, [addSingleToQueue, onRegisterAddToQueue]);

  // Expand playlist into individual video items
  const handleExpandPlaylist = useCallback(
    (item) => {
      if (!item.isPlaylist || !item.playlistInfo?.videos) return;

      const videos = item.playlistInfo.videos;
      const newItems = videos.map((video, index) => ({
        id: `${item.id}-video-${index}`,
        url: video.url || item.url,
        status: 'pending',
        error: null,
        isPlaylist: false,
        playlistInfo: null,
        playlistMode: 'single',
        title: video.title,
        thumbnail: video.thumbnail,
        parentPlaylistId: item.id,
        extractor: item.playlistInfo?.extractor || item.extractor,
      }));

      // Replace the playlist item with individual video items
      setQueue((prev) => {
        const index = prev.findIndex((q) => q.id === item.id);
        if (index === -1) return prev;
        return [...prev.slice(0, index), ...newItems, ...prev.slice(index + 1)];
      });
    },
    [setQueue]
  );

  // Toggle playlist mode between full and single
  const handleTogglePlaylistMode = useCallback(
    (id, newMode) => {
      if (newMode === null) return;
      setQueue((prev) =>
        prev.map((item) => (item.id === id ? { ...item, playlistMode: newMode } : item))
      );
    },
    [setQueue]
  );

  const handleRemoveItem = useCallback(
    (id) => {
      setQueue((prev) => prev.filter((item) => item.id !== id));
    },
    [setQueue]
  );

  const handleClearQueue = useCallback(() => {
    if (!isProcessing) {
      setQueue([]);
    }
  }, [isProcessing, setQueue]);

  const handleClearCompleted = useCallback(() => {
    setQueue((prev) =>
      prev.filter((item) => item.status !== 'completed' && item.status !== 'error')
    );
  }, [setQueue]);

  const handleStopQueue = useCallback(() => {
    stopRequestedRef.current = true;
    if (window.api && window.api.cancel) {
      window.api.cancel();
    }
  }, []);

  const handleRetryItem = useCallback(
    (id) => {
      setQueue((prev) =>
        prev.map((item) => (item.id === id ? { ...item, status: 'pending', error: null } : item))
      );
    },
    [setQueue]
  );

  const handleRetryAllFailed = useCallback(() => {
    setQueue((prev) =>
      prev.map((item) =>
        item.status === 'error' ? { ...item, status: 'pending', error: null } : item
      )
    );
  }, [setQueue]);

  const handleExportQueue = useCallback(async () => {
    if (!window.api?.saveQueueFile || queue.length === 0) return;
    try {
      const exportData = queue.map((item) => ({
        url: item.url,
        isPlaylist: item.isPlaylist,
        playlistMode: item.playlistMode || 'full',
        title: item.title,
      }));
      const result = await window.api.saveQueueFile(exportData);
      if (!result?.success && !result?.cancelled) {
        console.error('Export failed:', result?.error);
      }
    } catch (err) {
      console.error('Export queue error:', err);
    }
  }, [queue]);

  const handleImportQueue = useCallback(async () => {
    if (!window.api?.openQueueFile || isProcessing) return;
    try {
      const result = await window.api.openQueueFile();
      if (result?.success && Array.isArray(result.data)) {
        const newItems = result.data.map((item, index) => ({
          id: Date.now().toString() + index,
          url: item.url,
          status: 'pending',
          error: null,
          isPlaylist: item.isPlaylist || false,
          playlistInfo: null,
          playlistMode: item.playlistMode || 'full',
          title: item.title || null,
          thumbnail: null,
        }));
        setQueue((prev) => [...prev, ...newItems]);
      }
    } catch (err) {
      console.error('Import queue error:', err);
    }
  }, [isProcessing, setQueue]);

  // Process queue items one by one
  const processQueue = useCallback(async () => {
    const pendingItems = queue.filter((item) => item.status === 'pending');
    if (pendingItems.length === 0 || isProcessing) return;

    setIsProcessing(true);
    stopRequestedRef.current = false;

    for (let i = 0; i < queue.length; i++) {
      if (stopRequestedRef.current) {
        break;
      }

      const item = queue[i];
      if (item.status !== 'pending') continue;

      setCurrentProgress(0);

      // Update status to processing
      setQueue((prev) => prev.map((q) => (q.id === item.id ? { ...q, status: 'processing' } : q)));

      try {
        // Set up progress listener for this item
        const progressHandler = (data) => {
          if (
            (data.type === 'progress' || data.type === 'playlist-progress') &&
            data.percent !== undefined
          ) {
            setCurrentProgress(data.percent);
          }
        };

        if (window.api && window.api.onProgress) {
          window.api.offProgress();
          window.api.onProgress(progressHandler);
        }

        // Force audio mode for audio-only sources (SoundCloud, Bandcamp, Mixcloud)
        const isAudioOnly =
          (item.extractor && isAudioOnlyExtractor(item.extractor)) || isAudioOnlyUrl(item.url);
        const effectiveMode = isAudioOnly ? 'audio' : defaultMode || 'audio';
        const effectiveFormat = isAudioOnly
          ? defaultFormat === 'mp3'
            ? 'mp3'
            : 'mp3'
          : defaultFormat || 'mp3';
        const effectiveQuality = defaultQuality || 'best';

        const convertOptions = {
          outputFolder,
          mode: effectiveMode,
          format: effectiveMode === 'audio' ? effectiveFormat : defaultFormat,
          quality: effectiveQuality,
        };

        // If it's a playlist, pass the playlist mode
        if (item.isPlaylist) {
          convertOptions.playlistMode = item.playlistMode;
        }

        const result = await window.api.convert(item.url, convertOptions);

        if (result.success) {
          setQueue((prev) =>
            prev.map((q) =>
              q.id === item.id
                ? {
                    ...q,
                    status: 'completed',
                    fileName: result.isPlaylist ? `${result.fileCount} files` : result.fileName,
                    fileCount: result.fileCount,
                  }
                : q
            )
          );
        }
      } catch (error) {
        setQueue((prev) =>
          prev.map((q) =>
            q.id === item.id
              ? { ...q, status: 'error', error: error.message || 'Conversion failed' }
              : q
          )
        );
      }
    }

    setIsProcessing(false);
    setCurrentProgress(0);

    // Notify parent that queue processing is complete
    if (onQueueComplete) {
      onQueueComplete();
    }
  }, [
    queue,
    isProcessing,
    outputFolder,
    defaultMode,
    defaultFormat,
    defaultQuality,
    onQueueComplete,
    setQueue,
  ]);

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircleIcon color="success" fontSize="small" />;
      case 'error':
        return <ErrorIcon color="error" fontSize="small" />;
      case 'processing':
        return <HourglassEmptyIcon color="primary" fontSize="small" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'success';
      case 'error':
        return 'error';
      case 'processing':
        return 'primary';
      default:
        return 'default';
    }
  };

  const pendingCount = queue.filter((item) => item.status === 'pending').length;
  const completedCount = queue.filter((item) => item.status === 'completed').length;
  const errorCount = queue.filter((item) => item.status === 'error').length;
  const playlistCount = queue.filter((item) => item.isPlaylist).length;

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={isProcessing ? undefined : onClose}
      ModalProps={{ keepMounted: true }}
      PaperProps={{
        sx: { width: { xs: '100%', sm: 480 }, bgcolor: 'background.default' },
      }}
    >
      <Box sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <QueueIcon />
            <Typography variant="h6">Batch Queue</Typography>
            {queue.length > 0 && (
              <Chip
                label={queue.length}
                size="small"
                color="primary"
                aria-label={`${queue.length} items in queue`}
              />
            )}
          </Box>
          <IconButton onClick={onClose} disabled={isProcessing} aria-label="Close queue panel">
            <CloseIcon />
          </IconButton>
        </Box>

        {isProcessing && (
          <Alert severity="info" sx={{ mb: 2 }}>
            Processing queue... ({queue.length - pendingCount} of {queue.length})
          </Alert>
        )}

        <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Paste video or playlist URLs (one per line) - supports 1000+ sites:
          </Typography>
          <TextField
            multiline
            rows={4}
            fullWidth
            placeholder="https://www.youtube.com/watch?v=...&#10;https://www.youtube.com/playlist?list=...&#10;https://vimeo.com/...&#10;https://twitter.com/user/status/..."
            value={urls}
            onChange={(e) => setUrls(e.target.value)}
            disabled={isProcessing || isChecking}
            size="small"
            sx={{ mb: 1 }}
          />
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
            <Button
              variant="contained"
              size="small"
              onClick={handleAddToQueue}
              disabled={!urls.trim() || isProcessing || isChecking}
              startIcon={isChecking ? <CircularProgress size={16} color="inherit" /> : null}
            >
              {isChecking ? 'Checking URLs...' : 'Add to Queue'}
            </Button>
            <Typography variant="caption" color="text.secondary" sx={{ mx: 0.5 }}>
              ·
            </Typography>
            <Tooltip title="Import queue from a saved JSON file">
              <span>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={handleImportQueue}
                  disabled={isProcessing}
                  startIcon={<FileUploadIcon />}
                >
                  Import
                </Button>
              </span>
            </Tooltip>
            <Tooltip title="Export queue to a JSON file">
              <span>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={handleExportQueue}
                  disabled={queue.length === 0 || isProcessing}
                  startIcon={<FileDownloadIcon />}
                >
                  Export
                </Button>
              </span>
            </Tooltip>
          </Box>
        </Paper>

        <Divider sx={{ mb: 2 }} />

        {queue.length > 0 && (
          <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
            {!isProcessing ? (
              <Button
                startIcon={<PlayArrowIcon />}
                variant="contained"
                size="small"
                onClick={processQueue}
                disabled={pendingCount === 0}
                color="success"
              >
                Start ({pendingCount})
              </Button>
            ) : (
              <Button
                startIcon={<StopIcon />}
                variant="contained"
                size="small"
                onClick={handleStopQueue}
                color="error"
              >
                Stop
              </Button>
            )}
            {errorCount > 0 && !isProcessing && (
              <Button
                startIcon={<ReplayIcon />}
                size="small"
                onClick={handleRetryAllFailed}
                color="warning"
              >
                Retry Failed ({errorCount})
              </Button>
            )}
            {(completedCount > 0 || errorCount > 0) && !isProcessing && (
              <Button startIcon={<ClearIcon />} size="small" onClick={handleClearCompleted}>
                Clear Done
              </Button>
            )}
            {!isProcessing && (
              <Button
                startIcon={<DeleteIcon />}
                size="small"
                color="error"
                onClick={handleClearQueue}
              >
                Clear All
              </Button>
            )}
          </Box>
        )}

        <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
          {queue.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 6 }}>
              <QueueIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2, opacity: 0.5 }} />
              <Typography variant="h6" color="text.secondary" gutterBottom>
                Queue is empty
              </Typography>
              <Typography variant="body2" color="text.disabled" sx={{ maxWidth: 300, mx: 'auto' }}>
                Paste multiple URLs above and click &quot;Add to Queue&quot; to batch convert
                multiple files. Playlists are automatically detected!
              </Typography>
            </Box>
          ) : (
            <List dense>
              {queue.map((item, index) => (
                <Paper
                  key={item.id}
                  elevation={1}
                  sx={{
                    mb: 1,
                    bgcolor: 'background.paper',
                    transition: 'all 0.2s ease-in-out',
                    border: item.isPlaylist ? 2 : 0,
                    borderColor: item.isPlaylist ? 'primary.main' : 'transparent',
                    '&:hover': {
                      elevation: 2,
                    },
                  }}
                >
                  <ListItem
                    secondaryAction={
                      item.status !== 'processing' && !isProcessing ? (
                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                          {item.isPlaylist && item.status === 'pending' && (
                            <Tooltip title="Expand to individual videos">
                              <IconButton
                                edge="end"
                                size="small"
                                onClick={() => handleExpandPlaylist(item)}
                                color="primary"
                              >
                                <UnfoldMoreIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}
                          {item.status === 'error' && (
                            <Tooltip title="Retry">
                              <IconButton
                                edge="end"
                                size="small"
                                onClick={() => handleRetryItem(item.id)}
                                color="warning"
                              >
                                <ReplayIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}
                          <Tooltip title="Remove">
                            <IconButton
                              edge="end"
                              size="small"
                              onClick={() => handleRemoveItem(item.id)}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      ) : null
                    }
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mr: 1 }}>
                      <Typography variant="body2" color="text.secondary">
                        {index + 1}.
                      </Typography>
                      {getStatusIcon(item.status)}
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', flexGrow: 1 }}>
                      {/* Thumbnail */}
                      {item.thumbnail ? (
                        <Box
                          component="img"
                          src={item.thumbnail}
                          alt={item.title || 'Thumbnail'}
                          sx={{
                            width: 60,
                            height: 34,
                            objectFit: 'cover',
                            borderRadius: 0.5,
                            flexShrink: 0,
                          }}
                          onError={(e) => {
                            e.target.style.display = 'none';
                          }}
                        />
                      ) : (
                        <Box
                          sx={{
                            width: 60,
                            height: 34,
                            bgcolor: 'action.hover',
                            borderRadius: 0.5,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                          }}
                        >
                          {item.isPlaylist ? (
                            <PlaylistPlayIcon sx={{ fontSize: 18, color: 'text.disabled' }} />
                          ) : (
                            <MusicNoteIcon sx={{ fontSize: 18, color: 'text.disabled' }} />
                          )}
                        </Box>
                      )}
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            {item.isPlaylist && (
                              <Chip
                                icon={<PlaylistPlayIcon />}
                                label={`${item.playlistInfo?.playlistVideoCount || '?'} ${item.extractor && isAudioOnlyExtractor(item.extractor) ? 'tracks' : 'videos'}`}
                                size="small"
                                color="primary"
                                sx={{ height: 20, fontSize: '0.7rem' }}
                              />
                            )}
                            <Typography
                              variant="body2"
                              sx={{
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                maxWidth: item.isPlaylist ? 180 : 220,
                                fontWeight: item.title ? 500 : 400,
                              }}
                              title={item.title || item.url}
                            >
                              {item.title || item.url}
                            </Typography>
                          </Box>
                        }
                        secondary={
                          item.error ? (
                            <Typography variant="caption" color="error">
                              {item.error}
                            </Typography>
                          ) : item.fileName ? (
                            <Typography variant="caption" color="success.main">
                              ✓ {item.fileName}
                            </Typography>
                          ) : item.isPlaylist && item.status === 'pending' ? (
                            <Box sx={{ mt: 0.5 }}>
                              <ToggleButtonGroup
                                value={item.playlistMode}
                                exclusive
                                onChange={(e, newMode) =>
                                  handleTogglePlaylistMode(item.id, newMode)
                                }
                                size="small"
                                sx={{ height: 24 }}
                              >
                                <ToggleButton
                                  value="single"
                                  sx={{ px: 1, py: 0, fontSize: '0.65rem' }}
                                >
                                  First Only
                                </ToggleButton>
                                <ToggleButton
                                  value="full"
                                  sx={{ px: 1, py: 0, fontSize: '0.65rem' }}
                                >
                                  All Videos
                                </ToggleButton>
                              </ToggleButtonGroup>
                            </Box>
                          ) : (
                            <Chip
                              label={item.status}
                              size="small"
                              color={getStatusColor(item.status)}
                              sx={{ mt: 0.5, height: 20, fontSize: '0.7rem' }}
                            />
                          )
                        }
                      />
                    </Box>
                  </ListItem>
                  {item.status === 'processing' && (
                    <LinearProgress
                      variant="determinate"
                      value={currentProgress}
                      sx={{ borderRadius: '0 0 4px 4px' }}
                    />
                  )}
                </Paper>
              ))}
            </List>
          )}
        </Box>

        {queue.length > 0 && (
          <Box sx={{ pt: 2, borderTop: 1, borderColor: 'divider' }}>
            <Typography variant="body2" color="text.secondary">
              {completedCount > 0 && (
                <span style={{ color: '#22c55e' }}>✓ {completedCount} completed</span>
              )}
              {completedCount > 0 && (pendingCount > 0 || errorCount > 0) && ' • '}
              {pendingCount > 0 && <span>{pendingCount} pending</span>}
              {pendingCount > 0 && errorCount > 0 && ' • '}
              {errorCount > 0 && <span style={{ color: '#ef4444' }}>✗ {errorCount} failed</span>}
              {playlistCount > 0 && (
                <span style={{ marginLeft: 8, color: '#3b82f6' }}>
                  ({playlistCount} playlist{playlistCount > 1 ? 's' : ''})
                </span>
              )}
            </Typography>
          </Box>
        )}
      </Box>
    </Drawer>
  );
}

export default QueuePanel;
