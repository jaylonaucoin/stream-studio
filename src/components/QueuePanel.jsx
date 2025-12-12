import { useState, useCallback, useRef } from 'react';
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
  Fade,
  Tooltip,
  alpha,
} from '@mui/material';
import QueueMusicIcon from '@mui/icons-material/QueueMusic';
import DeleteIcon from '@mui/icons-material/Delete';
import ClearIcon from '@mui/icons-material/Clear';
import CloseIcon from '@mui/icons-material/Close';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import StopIcon from '@mui/icons-material/Stop';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import RefreshIcon from '@mui/icons-material/Refresh';
import AddLinkIcon from '@mui/icons-material/AddLink';
import LinkIcon from '@mui/icons-material/Link';
import PublicIcon from '@mui/icons-material/Public';
import { colors } from '../styles/theme';

// Normalize URL - add protocol if missing
const normalizeUrl = (url) => {
  let normalized = url.trim();
  normalized = normalized.replace(/[\r\n]/g, '').trim();

  if (normalized && !normalized.match(/^https?:\/\//i)) {
    if (normalized.includes('.') && !normalized.includes(' ')) {
      normalized = 'https://' + normalized;
    }
  }

  return normalized;
};

// Validate any URL (not just YouTube)
const isValidUrl = (url) => {
  if (!url || url.trim().length === 0) {
    return false;
  }

  const normalized = normalizeUrl(url);

  try {
    const urlObj = new URL(normalized);
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      return false;
    }
    if (!urlObj.hostname || urlObj.hostname.length < 3 || !urlObj.hostname.includes('.')) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
};

// Extract domain from URL for display
const getDomain = (url) => {
  try {
    const urlObj = new URL(normalizeUrl(url));
    return urlObj.hostname.replace('www.', '');
  } catch {
    return '';
  }
};

function QueuePanel({
  open,
  onClose,
  outputFolder,
  defaultMode,
  defaultFormat,
  defaultQuality,
  onQueueComplete,
}) {
  const [urls, setUrls] = useState('');
  const [queue, setQueue] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentProgress, setCurrentProgress] = useState(0);
  const stopRequestedRef = useRef(false);

  const handleAddToQueue = useCallback(() => {
    const lines = urls.split('\n').filter((line) => line.trim());
    const validUrls = lines.filter(isValidUrl);

    if (validUrls.length === 0) return;

    const newItems = validUrls.map((url, index) => ({
      id: Date.now().toString() + index,
      url: normalizeUrl(url.trim()),
      status: 'pending', // pending, processing, completed, error
      error: null,
    }));

    setQueue((prev) => [...prev, ...newItems]);
    setUrls('');
  }, [urls]);

  const handleRemoveItem = useCallback((id) => {
    setQueue((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const handleClearQueue = useCallback(() => {
    if (!isProcessing) {
      setQueue([]);
    }
  }, [isProcessing]);

  const handleClearCompleted = useCallback(() => {
    setQueue((prev) =>
      prev.filter((item) => item.status !== 'completed' && item.status !== 'error')
    );
  }, []);

  const handleRetryFailed = useCallback(() => {
    setQueue((prev) =>
      prev.map((item) =>
        item.status === 'error' ? { ...item, status: 'pending', error: null } : item
      )
    );
  }, []);

  const handleStopQueue = useCallback(() => {
    stopRequestedRef.current = true;
    if (window.api && window.api.cancel) {
      window.api.cancel();
    }
  }, []);

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
          if (data.type === 'progress' && data.percent !== undefined) {
            setCurrentProgress(data.percent);
          }
        };

        if (window.api && window.api.onProgress) {
          window.api.offProgress();
          window.api.onProgress(progressHandler);
        }

        const result = await window.api.convert(item.url, {
          outputFolder,
          mode: defaultMode || 'audio',
          format: defaultFormat || 'mp3',
          quality: defaultQuality || 'best',
        });

        if (result.success) {
          setQueue((prev) =>
            prev.map((q) =>
              q.id === item.id ? { ...q, status: 'completed', fileName: result.fileName } : q
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
  ]);

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircleIcon sx={{ fontSize: 20, color: 'success.main' }} />;
      case 'error':
        return <ErrorIcon sx={{ fontSize: 20, color: 'error.main' }} />;
      case 'processing':
        return (
          <HourglassEmptyIcon
            sx={{
              fontSize: 20,
              color: 'primary.main',
              animation: 'spin 1s linear infinite',
              '@keyframes spin': {
                from: { transform: 'rotate(0deg)' },
                to: { transform: 'rotate(360deg)' },
              },
            }}
          />
        );
      default:
        return <LinkIcon sx={{ fontSize: 20, color: 'text.disabled' }} />;
    }
  };

  const pendingCount = queue.filter((item) => item.status === 'pending').length;
  const completedCount = queue.filter((item) => item.status === 'completed').length;
  const errorCount = queue.filter((item) => item.status === 'error').length;
  const processingItem = queue.find((item) => item.status === 'processing');

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={isProcessing ? undefined : onClose}
      PaperProps={{
        sx: {
          width: { xs: '100%', sm: 480 },
          bgcolor: colors.background.default,
          backgroundImage: `linear-gradient(180deg, ${colors.background.elevated} 0%, ${colors.background.default} 100%)`,
        },
      }}
    >
      <Box sx={{ p: 2.5, height: '100%', display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: 2,
                bgcolor: alpha(colors.secondary.main, 0.15),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <QueueMusicIcon sx={{ color: 'secondary.main' }} />
            </Box>
            <Box>
              <Typography variant="h6" fontWeight={700}>
                Batch Queue
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {queue.length} item{queue.length !== 1 ? 's' : ''} in queue
              </Typography>
            </Box>
          </Box>
          <IconButton onClick={onClose} disabled={isProcessing} sx={{ color: 'text.secondary' }}>
            <CloseIcon />
          </IconButton>
        </Box>

        {/* Processing Alert */}
        {isProcessing && processingItem && (
          <Alert
            severity="info"
            sx={{
              mb: 2,
              borderRadius: 2,
              bgcolor: alpha(colors.info.main, 0.1),
              border: `1px solid ${alpha(colors.info.main, 0.3)}`,
            }}
          >
            <Typography variant="body2" fontWeight={500}>
              Processing: {getDomain(processingItem.url)}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {queue.length - pendingCount} of {queue.length} items
            </Typography>
          </Alert>
        )}

        {/* URL Input Section */}
        <Paper
          elevation={0}
          sx={{
            p: 2,
            mb: 2,
            borderRadius: 2,
            bgcolor: alpha(colors.background.card, 0.5),
            border: `1px solid ${colors.divider}`,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
            <AddLinkIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
            <Typography variant="subtitle2" color="text.secondary">
              Add URLs (one per line)
            </Typography>
          </Box>
          <TextField
            multiline
            rows={3}
            fullWidth
            placeholder="https://youtube.com/watch?v=...&#10;https://vimeo.com/...&#10;https://twitter.com/user/status/..."
            value={urls}
            onChange={(e) => setUrls(e.target.value)}
            disabled={isProcessing}
            size="small"
            sx={{ mb: 1.5 }}
          />
          <Button
            variant="contained"
            size="small"
            onClick={handleAddToQueue}
            disabled={!urls.trim() || isProcessing}
            startIcon={<AddLinkIcon />}
            fullWidth
          >
            Add to Queue
          </Button>
        </Paper>

        {/* Queue Actions */}
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
                sx={{ flexGrow: 1 }}
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
                sx={{ flexGrow: 1 }}
              >
                Stop
              </Button>
            )}
            {errorCount > 0 && !isProcessing && (
              <Tooltip title="Retry all failed items">
                <Button
                  startIcon={<RefreshIcon />}
                  size="small"
                  variant="outlined"
                  onClick={handleRetryFailed}
                  color="warning"
                >
                  Retry ({errorCount})
                </Button>
              </Tooltip>
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

        <Divider sx={{ mb: 2 }} />

        {/* Queue List */}
        <Box sx={{ flexGrow: 1, overflow: 'auto', mx: -1, px: 1 }}>
          {queue.length === 0 ? (
            <Fade in>
              <Box sx={{ textAlign: 'center', py: 6 }}>
                <Box
                  sx={{
                    width: 80,
                    height: 80,
                    borderRadius: 3,
                    bgcolor: alpha(colors.text.secondary, 0.08),
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mx: 'auto',
                    mb: 2,
                  }}
                >
                  <QueueMusicIcon sx={{ fontSize: 40, color: 'text.disabled' }} />
                </Box>
                <Typography variant="h6" color="text.secondary" fontWeight={600} gutterBottom>
                  Queue is empty
                </Typography>
                <Typography variant="body2" color="text.disabled">
                  Add URLs above to batch convert multiple files
                </Typography>
              </Box>
            </Fade>
          ) : (
            <List dense sx={{ py: 0 }}>
              {queue.map((item, index) => (
                <Fade in key={item.id} style={{ transitionDelay: `${index * 30}ms` }}>
                  <Paper
                    elevation={0}
                    sx={{
                      mb: 1.5,
                      bgcolor: alpha(colors.background.card, 0.6),
                      border: `1px solid ${
                        item.status === 'processing'
                          ? alpha(colors.primary.main, 0.5)
                          : item.status === 'completed'
                            ? alpha(colors.success.main, 0.3)
                            : item.status === 'error'
                              ? alpha(colors.error.main, 0.3)
                              : colors.divider
                      }`,
                      borderRadius: 2,
                      overflow: 'hidden',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <ListItem
                      sx={{ py: 1.5, px: 2 }}
                      secondaryAction={
                        item.status !== 'processing' && !isProcessing ? (
                          <IconButton
                            edge="end"
                            size="small"
                            onClick={() => handleRemoveItem(item.id)}
                            sx={{ color: 'text.secondary' }}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        ) : null
                      }
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mr: 1 }}>
                        <Typography
                          variant="caption"
                          color="text.disabled"
                          sx={{ minWidth: 20, textAlign: 'right' }}
                        >
                          {index + 1}.
                        </Typography>
                        {getStatusIcon(item.status)}
                      </Box>
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Chip
                              icon={<PublicIcon sx={{ fontSize: 12 }} />}
                              label={getDomain(item.url)}
                              size="small"
                              sx={{
                                height: 20,
                                fontSize: '0.7rem',
                                bgcolor: alpha(colors.primary.main, 0.1),
                                '& .MuiChip-icon': { fontSize: 12, color: 'primary.main' },
                              }}
                            />
                          </Box>
                        }
                        secondary={
                          <Box sx={{ mt: 0.5 }}>
                            <Typography
                              variant="caption"
                              sx={{
                                display: 'block',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                maxWidth: 280,
                                color: 'text.disabled',
                                fontSize: '0.7rem',
                              }}
                            >
                              {item.url}
                            </Typography>
                            {item.error && (
                              <Typography
                                variant="caption"
                                color="error.main"
                                sx={{
                                  display: 'block',
                                  mt: 0.5,
                                  fontSize: '0.7rem',
                                }}
                              >
                                {item.error.length > 60
                                  ? item.error.substring(0, 60) + '...'
                                  : item.error}
                              </Typography>
                            )}
                            {item.fileName && (
                              <Typography
                                variant="caption"
                                color="success.main"
                                sx={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 0.5,
                                  mt: 0.5,
                                  fontSize: '0.7rem',
                                }}
                              >
                                <CheckCircleIcon sx={{ fontSize: 12 }} />
                                {item.fileName}
                              </Typography>
                            )}
                            {item.status === 'pending' && (
                              <Chip
                                label="Pending"
                                size="small"
                                variant="outlined"
                                sx={{
                                  mt: 0.5,
                                  height: 18,
                                  fontSize: '0.65rem',
                                  borderColor: colors.divider,
                                  color: 'text.secondary',
                                }}
                              />
                            )}
                          </Box>
                        }
                      />
                    </ListItem>
                    {item.status === 'processing' && (
                      <LinearProgress
                        variant="determinate"
                        value={currentProgress}
                        sx={{
                          height: 3,
                          '& .MuiLinearProgress-bar': {
                            background: colors.gradients.primary,
                          },
                        }}
                      />
                    )}
                  </Paper>
                </Fade>
              ))}
            </List>
          )}
        </Box>

        {/* Queue Status Footer */}
        {queue.length > 0 && (
          <Box
            sx={{
              pt: 2,
              mt: 'auto',
              borderTop: `1px solid ${colors.divider}`,
              display: 'flex',
              gap: 2,
              justifyContent: 'center',
            }}
          >
            {completedCount > 0 && (
              <Chip
                icon={<CheckCircleIcon sx={{ fontSize: 14 }} />}
                label={`${completedCount} completed`}
                size="small"
                color="success"
                variant="outlined"
                sx={{ fontSize: '0.75rem' }}
              />
            )}
            {pendingCount > 0 && (
              <Chip
                label={`${pendingCount} pending`}
                size="small"
                variant="outlined"
                sx={{ fontSize: '0.75rem', borderColor: colors.divider, color: 'text.secondary' }}
              />
            )}
            {errorCount > 0 && (
              <Chip
                icon={<ErrorIcon sx={{ fontSize: 14 }} />}
                label={`${errorCount} failed`}
                size="small"
                color="error"
                variant="outlined"
                sx={{ fontSize: '0.75rem' }}
              />
            )}
          </Box>
        )}
      </Box>
    </Drawer>
  );
}

export default QueuePanel;
