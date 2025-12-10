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
} from '@mui/material';
import QueueIcon from '@mui/icons-material/Queue';
import DeleteIcon from '@mui/icons-material/Delete';
import ClearIcon from '@mui/icons-material/Clear';
import CloseIcon from '@mui/icons-material/Close';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import StopIcon from '@mui/icons-material/Stop';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';

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

function QueuePanel({ open, onClose, outputFolder, defaultMode, defaultFormat, onQueueComplete }) {
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
  }, [queue, isProcessing, outputFolder, defaultMode, defaultFormat, onQueueComplete]);

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

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={isProcessing ? undefined : onClose}
      PaperProps={{
        sx: { width: { xs: '100%', sm: 450 }, bgcolor: 'background.default' },
      }}
    >
      <Box sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <QueueIcon />
            <Typography variant="h6">Batch Queue</Typography>
            {queue.length > 0 && <Chip label={queue.length} size="small" color="primary" />}
          </Box>
          <IconButton onClick={onClose} disabled={isProcessing}>
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
            Paste video URLs (one per line) - supports 1000+ sites:
          </Typography>
          <TextField
            multiline
            rows={4}
            fullWidth
            placeholder="https://www.youtube.com/watch?v=...&#10;https://vimeo.com/...&#10;https://twitter.com/user/status/...&#10;https://tiktok.com/@user/video/..."
            value={urls}
            onChange={(e) => setUrls(e.target.value)}
            disabled={isProcessing}
            size="small"
            sx={{ mb: 1 }}
          />
          <Button
            variant="contained"
            size="small"
            onClick={handleAddToQueue}
            disabled={!urls.trim() || isProcessing}
          >
            Add to Queue
          </Button>
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
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <QueueIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
              <Typography color="text.secondary">Queue is empty</Typography>
              <Typography variant="body2" color="text.disabled">
                Add URLs above to batch convert
              </Typography>
            </Box>
          ) : (
            <List dense>
              {queue.map((item, index) => (
                <Paper key={item.id} elevation={1} sx={{ mb: 1, bgcolor: 'background.paper' }}>
                  <ListItem
                    secondaryAction={
                      item.status !== 'processing' && !isProcessing ? (
                        <IconButton
                          edge="end"
                          size="small"
                          onClick={() => handleRemoveItem(item.id)}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      ) : null
                    }
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mr: 1 }}>
                      <Typography variant="body2" color="text.secondary">
                        {index + 1}.
                      </Typography>
                      {getStatusIcon(item.status)}
                    </Box>
                    <ListItemText
                      primary={
                        <Typography
                          variant="body2"
                          sx={{
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            maxWidth: 280,
                          }}
                        >
                          {item.url}
                        </Typography>
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
                        ) : (
                          <Chip
                            label={item.status}
                            size="small"
                            color={getStatusColor(item.status)}
                            sx={{ mt: 0.5 }}
                          />
                        )
                      }
                    />
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
            </Typography>
          </Box>
        )}
      </Box>
    </Drawer>
  );
}

export default QueuePanel;
