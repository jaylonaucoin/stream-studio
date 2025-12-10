import { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  IconButton,
  List,
  ListItem,
  Paper,
  Chip,
  Tooltip,
  Button,
  Drawer,
  Divider,
} from '@mui/material';
import HistoryIcon from '@mui/icons-material/History';
import DeleteIcon from '@mui/icons-material/Delete';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import VideoFileIcon from '@mui/icons-material/VideoFile';
import CloseIcon from '@mui/icons-material/Close';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';

function HistoryPanel({ open, onClose }) {
  const [history, setHistory] = useState([]);

  const loadHistory = useCallback(async () => {
    if (window.api && window.api.getHistory) {
      try {
        const items = await window.api.getHistory();
        setHistory(items || []);
      } catch (err) {
        console.error('Failed to load history:', err);
      }
    }
  }, []);

  useEffect(() => {
    if (open) {
      loadHistory();
    }
  }, [open, loadHistory]);

  const handleRemoveItem = async (id) => {
    if (window.api && window.api.removeHistoryItem) {
      try {
        const updated = await window.api.removeHistoryItem(id);
        setHistory(updated || []);
      } catch (err) {
        console.error('Failed to remove history item:', err);
      }
    }
  };

  const handleClearAll = async () => {
    if (window.api && window.api.clearHistory) {
      try {
        await window.api.clearHistory();
        setHistory([]);
      } catch (err) {
        console.error('Failed to clear history:', err);
      }
    }
  };

  const handleOpenLocation = async (filePath) => {
    if (window.api && window.api.openFileLocation) {
      try {
        await window.api.openFileLocation(filePath);
      } catch (err) {
        console.error('Failed to open file location:', err);
      }
    }
  };

  const handleCopyUrl = async (url) => {
    try {
      await navigator.clipboard.writeText(url);
    } catch (err) {
      console.error('Failed to copy URL:', err);
    }
  };

  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;

    // Less than 1 hour ago
    if (diff < 3600000) {
      const mins = Math.floor(diff / 60000);
      return mins <= 1 ? 'Just now' : `${mins} minutes ago`;
    }

    // Less than 24 hours ago
    if (diff < 86400000) {
      const hours = Math.floor(diff / 3600000);
      return hours === 1 ? '1 hour ago' : `${hours} hours ago`;
    }

    // Less than 7 days ago
    if (diff < 604800000) {
      const days = Math.floor(diff / 86400000);
      return days === 1 ? 'Yesterday' : `${days} days ago`;
    }

    // Show full date
    return date.toLocaleDateString();
  };

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: { width: { xs: '100%', sm: 400 }, bgcolor: 'background.default' },
      }}
    >
      <Box sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <HistoryIcon />
            <Typography variant="h6">Conversion History</Typography>
            {history.length > 0 && <Chip label={history.length} size="small" color="primary" />}
          </Box>
          <IconButton onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </Box>

        {history.length > 0 && (
          <Button
            startIcon={<DeleteSweepIcon />}
            size="small"
            color="error"
            onClick={handleClearAll}
            sx={{ mb: 2 }}
          >
            Clear All
          </Button>
        )}

        <Divider sx={{ mb: 2 }} />

        {history.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <HistoryIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
            <Typography color="text.secondary">No conversion history yet</Typography>
            <Typography variant="body2" color="text.disabled">
              Your converted files will appear here
            </Typography>
          </Box>
        ) : (
          <List sx={{ maxHeight: 'calc(100vh - 200px)', overflow: 'auto' }}>
            {history.map((item) => (
              <Paper key={item.id} elevation={1} sx={{ mb: 1, bgcolor: 'background.paper' }}>
                <ListItem sx={{ flexDirection: 'column', alignItems: 'flex-start' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%', mb: 1 }}>
                    {item.mode === 'audio' ? (
                      <MusicNoteIcon color="primary" fontSize="small" />
                    ) : (
                      <VideoFileIcon color="secondary" fontSize="small" />
                    )}
                    <Typography
                      variant="body2"
                      sx={{
                        flexGrow: 1,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {item.fileName}
                    </Typography>
                  </Box>

                  <Box sx={{ display: 'flex', gap: 0.5, mb: 1 }}>
                    <Chip
                      label={item.format?.toUpperCase() || 'Unknown'}
                      size="small"
                      variant="outlined"
                    />
                    <Chip
                      label={formatDate(item.timestamp)}
                      size="small"
                      variant="outlined"
                      color="default"
                    />
                  </Box>

                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Tooltip title="Open file location">
                      <IconButton size="small" onClick={() => handleOpenLocation(item.filePath)}>
                        <FolderOpenIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Copy URL">
                      <IconButton size="small" onClick={() => handleCopyUrl(item.url)}>
                        <ContentCopyIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Remove from history">
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleRemoveItem(item.id)}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </ListItem>
              </Paper>
            ))}
          </List>
        )}
      </Box>
    </Drawer>
  );
}

export default HistoryPanel;
