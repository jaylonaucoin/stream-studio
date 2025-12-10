import { useState, useCallback } from 'react';
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
} from '@mui/material';
import QueueIcon from '@mui/icons-material/Queue';
import DeleteIcon from '@mui/icons-material/Delete';
import ClearIcon from '@mui/icons-material/Clear';
import CloseIcon from '@mui/icons-material/Close';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';

function QueuePanel({ open, onClose, onProcessQueue, isProcessing }) {
  const [urls, setUrls] = useState('');
  const [queue, setQueue] = useState([]);

  const validateYouTubeUrl = (url) => {
    const patterns = [
      /^https?:\/\/(www\.)?youtube\.com\/watch\?v=[\w-]+/,
      /^https?:\/\/(www\.)?youtube\.com\/embed\/[\w-]+/,
      /^https?:\/\/youtu\.be\/[\w-]+/,
      /^https?:\/\/(www\.)?youtube\.com\/v\/[\w-]+/,
    ];
    return patterns.some((pattern) => pattern.test(url.trim()));
  };

  const handleAddToQueue = useCallback(() => {
    const lines = urls.split('\n').filter((line) => line.trim());
    const validUrls = lines.filter(validateYouTubeUrl);
    
    if (validUrls.length === 0) return;

    const newItems = validUrls.map((url, index) => ({
      id: Date.now().toString() + index,
      url: url.trim(),
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
    setQueue([]);
  }, []);

  const handleClearCompleted = useCallback(() => {
    setQueue((prev) => prev.filter((item) => item.status !== 'completed'));
  }, []);

  const handleStartQueue = useCallback(() => {
    const pendingItems = queue.filter((item) => item.status === 'pending');
    if (pendingItems.length > 0 && onProcessQueue) {
      onProcessQueue(pendingItems.map((item) => item.url));
    }
  }, [queue, onProcessQueue]);

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

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
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
          <IconButton onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </Box>

        <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Paste YouTube URLs (one per line):
          </Typography>
          <TextField
            multiline
            rows={4}
            fullWidth
            placeholder="https://www.youtube.com/watch?v=...&#10;https://youtu.be/..."
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
            <Button
              startIcon={<PlayArrowIcon />}
              variant="contained"
              size="small"
              onClick={handleStartQueue}
              disabled={pendingCount === 0 || isProcessing}
            >
              Start ({pendingCount})
            </Button>
            {completedCount > 0 && (
              <Button
                startIcon={<ClearIcon />}
                size="small"
                onClick={handleClearCompleted}
                disabled={isProcessing}
              >
                Clear Completed
              </Button>
            )}
            <Button
              startIcon={<DeleteIcon />}
              size="small"
              color="error"
              onClick={handleClearQueue}
              disabled={isProcessing}
            >
              Clear All
            </Button>
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
                      <IconButton
                        edge="end"
                        size="small"
                        onClick={() => handleRemoveItem(item.id)}
                        disabled={item.status === 'processing'}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
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
                    <LinearProgress sx={{ borderRadius: '0 0 4px 4px' }} />
                  )}
                </Paper>
              ))}
            </List>
          )}
        </Box>
      </Box>
    </Drawer>
  );
}

export default QueuePanel;
