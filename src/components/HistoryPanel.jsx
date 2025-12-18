import { useState, useEffect, useCallback, useMemo } from 'react';
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
  TextField,
  InputAdornment,
} from '@mui/material';
import HistoryIcon from '@mui/icons-material/History';
import DeleteIcon from '@mui/icons-material/Delete';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import VideoFileIcon from '@mui/icons-material/VideoFile';
import CloseIcon from '@mui/icons-material/Close';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import PlaylistPlayIcon from '@mui/icons-material/PlaylistPlay';

function HistoryPanel({ open, onClose }) {
  const [history, setHistory] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

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

  const handleOpenLocation = async (item) => {
    if (window.api && window.api.openFileLocation) {
      try {
        // For playlists, use playlistFolder, otherwise use filePath
        const pathToOpen = item.isPlaylist ? item.playlistFolder || item.filePath : item.filePath;
        await window.api.openFileLocation(pathToOpen);
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

  // Filter history based on search query
  const filteredHistory = useMemo(() => {
    if (!searchQuery.trim()) return history;

    const query = searchQuery.toLowerCase();
    return history.filter((item) => {
      const fileName = item.fileName?.toLowerCase() || '';
      const url = item.url?.toLowerCase() || '';
      const format = item.format?.toLowerCase() || '';
      return fileName.includes(query) || url.includes(query) || format.includes(query);
    });
  }, [history, searchQuery]);

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
            {history.length > 0 && (
              <Chip
                label={history.length}
                size="small"
                color="primary"
                title={`${history.length} item${history.length !== 1 ? 's' : ''} in history`}
              />
            )}
          </Box>
          <IconButton onClick={onClose} aria-label="Close history panel">
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

        {history.length > 0 && (
          <TextField
            fullWidth
            size="small"
            placeholder="Search history..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
              endAdornment: searchQuery && (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={() => setSearchQuery('')} edge="end">
                    <ClearIcon fontSize="small" />
                  </IconButton>
                </InputAdornment>
              ),
            }}
            sx={{ mb: 2 }}
          />
        )}

        <Divider sx={{ mb: 2 }} />

        {history.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 6 }}>
            <HistoryIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2, opacity: 0.5 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No conversion history yet
            </Typography>
            <Typography variant="body2" color="text.disabled" sx={{ maxWidth: 300, mx: 'auto' }}>
              Your converted files will appear here for easy access and management
            </Typography>
          </Box>
        ) : filteredHistory.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 6 }}>
            <SearchIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2, opacity: 0.5 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No results found
            </Typography>
            <Typography variant="body2" color="text.disabled" sx={{ maxWidth: 300, mx: 'auto' }}>
              Try a different search term or clear the search to see all items
            </Typography>
          </Box>
        ) : (
          <List sx={{ maxHeight: 'calc(100vh - 200px)', overflow: 'auto' }}>
            {filteredHistory.map((item) => (
              <Paper
                key={item.id}
                elevation={1}
                sx={{
                  mb: 1,
                  bgcolor: 'background.paper',
                  transition: 'all 0.2s ease-in-out',
                  '&:hover': {
                    elevation: 2,
                    transform: 'translateY(-1px)',
                  },
                }}
              >
                <ListItem sx={{ flexDirection: 'column', alignItems: 'flex-start' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%', mb: 1 }}>
                    {item.isPlaylist ? (
                      <PlaylistPlayIcon color="primary" fontSize="small" />
                    ) : item.mode === 'audio' ? (
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
                        fontWeight: 500,
                      }}
                      title={item.fileName}
                    >
                      {item.fileName}
                    </Typography>
                  </Box>

                  <Box sx={{ display: 'flex', gap: 0.5, mb: 1, flexWrap: 'wrap' }}>
                    {item.isPlaylist && (
                      <Chip
                        icon={<PlaylistPlayIcon />}
                        label={`Playlist (${item.playlistFiles?.length || 0} files)`}
                        size="small"
                        color="primary"
                        variant="filled"
                      />
                    )}
                    <Chip
                      label={item.format?.toUpperCase() || 'Unknown'}
                      size="small"
                      variant="outlined"
                    />
                    {!item.isPlaylist && (
                      <Chip
                        label={item.mode === 'audio' ? 'Audio' : 'Video'}
                        size="small"
                        variant="outlined"
                        color={item.mode === 'audio' ? 'primary' : 'secondary'}
                      />
                    )}
                    <Chip
                      label={formatDate(item.timestamp)}
                      size="small"
                      variant="outlined"
                      color="default"
                    />
                  </Box>

                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Tooltip
                      title={item.isPlaylist ? 'Open playlist folder' : 'Open file location'}
                    >
                      <IconButton size="small" onClick={() => handleOpenLocation(item)}>
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
