import { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  IconButton,
  List,
  ListItem,
  Paper,
  Chip,
  Button,
  Drawer,
  Divider,
  TextField,
  InputAdornment,
  Fade,
  alpha,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
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
import SortIcon from '@mui/icons-material/Sort';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import TextFieldsIcon from '@mui/icons-material/TextFields';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { colors } from '../styles/theme';

function HistoryPanel({ open, onClose }) {
  const [history, setHistory] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('date'); // 'date', 'name', 'format'
  const [sortAnchor, setSortAnchor] = useState(null);
  const [itemMenuAnchor, setItemMenuAnchor] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [copiedId, setCopiedId] = useState(null);

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
    setItemMenuAnchor(null);
    setSelectedItem(null);
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
    setItemMenuAnchor(null);
    setSelectedItem(null);
  };

  const handleCopyUrl = async (url, id) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error('Failed to copy URL:', err);
    }
    setItemMenuAnchor(null);
    setSelectedItem(null);
  };

  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;

    // Less than 1 minute ago
    if (diff < 60000) {
      return 'Just now';
    }

    // Less than 1 hour ago
    if (diff < 3600000) {
      const mins = Math.floor(diff / 60000);
      return `${mins}m ago`;
    }

    // Less than 24 hours ago
    if (diff < 86400000) {
      const hours = Math.floor(diff / 3600000);
      return `${hours}h ago`;
    }

    // Less than 7 days ago
    if (diff < 604800000) {
      const days = Math.floor(diff / 86400000);
      return days === 1 ? 'Yesterday' : `${days}d ago`;
    }

    // Show full date
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  // Filter and sort history
  const filteredHistory = history
    .filter((item) => {
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      return (
        item.fileName?.toLowerCase().includes(query) ||
        item.url?.toLowerCase().includes(query) ||
        item.format?.toLowerCase().includes(query)
      );
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return (a.fileName || '').localeCompare(b.fileName || '');
        case 'format':
          return (a.format || '').localeCompare(b.format || '');
        case 'date':
        default:
          return new Date(b.timestamp) - new Date(a.timestamp);
      }
    });

  const handleItemMenu = (event, item) => {
    setItemMenuAnchor(event.currentTarget);
    setSelectedItem(item);
  };

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          width: { xs: '100%', sm: 420 },
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
                bgcolor: alpha(colors.primary.main, 0.15),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <HistoryIcon sx={{ color: 'primary.main' }} />
            </Box>
            <Box>
              <Typography variant="h6" fontWeight={700}>
                History
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {history.length} conversion{history.length !== 1 ? 's' : ''}
              </Typography>
            </Box>
          </Box>
          <IconButton onClick={onClose} sx={{ color: 'text.secondary' }}>
            <CloseIcon />
          </IconButton>
        </Box>

        {/* Search and Actions */}
        {history.length > 0 && (
          <Box sx={{ mb: 2 }}>
            <TextField
              fullWidth
              placeholder="Search history..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              size="small"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
                  </InputAdornment>
                ),
              }}
              sx={{ mb: 1.5 }}
            />

            <Box sx={{ display: 'flex', gap: 1, justifyContent: 'space-between' }}>
              <Button
                size="small"
                startIcon={<SortIcon />}
                onClick={(e) => setSortAnchor(e.currentTarget)}
                sx={{ color: 'text.secondary' }}
              >
                Sort: {sortBy === 'date' ? 'Date' : sortBy === 'name' ? 'Name' : 'Format'}
              </Button>
              <Button
                startIcon={<DeleteSweepIcon />}
                size="small"
                color="error"
                onClick={handleClearAll}
              >
                Clear All
              </Button>
            </Box>

            {/* Sort Menu */}
            <Menu
              anchorEl={sortAnchor}
              open={Boolean(sortAnchor)}
              onClose={() => setSortAnchor(null)}
            >
              <MenuItem
                onClick={() => {
                  setSortBy('date');
                  setSortAnchor(null);
                }}
                selected={sortBy === 'date'}
              >
                <ListItemIcon>
                  <AccessTimeIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText>Date</ListItemText>
              </MenuItem>
              <MenuItem
                onClick={() => {
                  setSortBy('name');
                  setSortAnchor(null);
                }}
                selected={sortBy === 'name'}
              >
                <ListItemIcon>
                  <TextFieldsIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText>Name</ListItemText>
              </MenuItem>
              <MenuItem
                onClick={() => {
                  setSortBy('format');
                  setSortAnchor(null);
                }}
                selected={sortBy === 'format'}
              >
                <ListItemIcon>
                  <InsertDriveFileIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText>Format</ListItemText>
              </MenuItem>
            </Menu>
          </Box>
        )}

        <Divider sx={{ mb: 2 }} />

        {/* History List */}
        <Box sx={{ flexGrow: 1, overflow: 'auto', mx: -1, px: 1 }}>
          {filteredHistory.length === 0 ? (
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
                  <HistoryIcon sx={{ fontSize: 40, color: 'text.disabled' }} />
                </Box>
                <Typography variant="h6" color="text.secondary" fontWeight={600} gutterBottom>
                  {searchQuery ? 'No results found' : 'No history yet'}
                </Typography>
                <Typography variant="body2" color="text.disabled">
                  {searchQuery
                    ? 'Try a different search term'
                    : 'Your converted files will appear here'}
                </Typography>
              </Box>
            </Fade>
          ) : (
            <List sx={{ py: 0 }}>
              {filteredHistory.map((item, index) => (
                <Fade in key={item.id} style={{ transitionDelay: `${index * 30}ms` }}>
                  <Paper
                    elevation={0}
                    sx={{
                      mb: 1.5,
                      bgcolor: alpha(colors.background.card, 0.6),
                      border: `1px solid ${colors.divider}`,
                      borderRadius: 2,
                      overflow: 'hidden',
                      transition: 'all 0.2s ease',
                      '&:hover': {
                        bgcolor: alpha(colors.background.card, 0.9),
                        borderColor: alpha(colors.primary.main, 0.3),
                        transform: 'translateX(-2px)',
                      },
                    }}
                  >
                    <ListItem
                      sx={{
                        flexDirection: 'column',
                        alignItems: 'flex-start',
                        py: 1.5,
                        px: 2,
                      }}
                    >
                      {/* Header Row */}
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: 1.5,
                          width: '100%',
                          mb: 1,
                        }}
                      >
                        {/* Icon */}
                        <Box
                          sx={{
                            width: 36,
                            height: 36,
                            borderRadius: 1.5,
                            bgcolor:
                              item.mode === 'audio'
                                ? alpha(colors.primary.main, 0.15)
                                : alpha(colors.secondary.main, 0.15),
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                          }}
                        >
                          {item.mode === 'audio' ? (
                            <MusicNoteIcon sx={{ fontSize: 20, color: 'primary.main' }} />
                          ) : (
                            <VideoFileIcon sx={{ fontSize: 20, color: 'secondary.main' }} />
                          )}
                        </Box>

                        {/* File Info */}
                        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                          <Typography
                            variant="body2"
                            fontWeight={600}
                            sx={{
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              mb: 0.25,
                            }}
                          >
                            {item.fileName}
                          </Typography>
                          <Typography
                            variant="caption"
                            color="text.disabled"
                            sx={{
                              display: 'block',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              fontSize: '0.7rem',
                            }}
                          >
                            {item.url}
                          </Typography>
                        </Box>

                        {/* Menu Button */}
                        <IconButton
                          size="small"
                          onClick={(e) => handleItemMenu(e, item)}
                          sx={{ color: 'text.secondary', ml: 'auto' }}
                        >
                          <MoreVertIcon fontSize="small" />
                        </IconButton>
                      </Box>

                      {/* Tags Row */}
                      <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
                        <Chip
                          label={item.format?.toUpperCase() || 'Unknown'}
                          size="small"
                          sx={{
                            height: 22,
                            fontSize: '0.7rem',
                            fontWeight: 600,
                            bgcolor: alpha(colors.primary.main, 0.1),
                            color: 'primary.main',
                          }}
                        />
                        {item.quality && (
                          <Chip
                            label={item.quality}
                            size="small"
                            variant="outlined"
                            sx={{
                              height: 22,
                              fontSize: '0.7rem',
                              borderColor: colors.divider,
                              color: 'text.secondary',
                            }}
                          />
                        )}
                        <Chip
                          icon={<AccessTimeIcon sx={{ fontSize: 12 }} />}
                          label={formatDate(item.timestamp)}
                          size="small"
                          variant="outlined"
                          sx={{
                            height: 22,
                            fontSize: '0.7rem',
                            borderColor: colors.divider,
                            color: 'text.secondary',
                            '& .MuiChip-icon': { color: 'text.disabled' },
                          }}
                        />
                      </Box>
                    </ListItem>
                  </Paper>
                </Fade>
              ))}
            </List>
          )}
        </Box>

        {/* Item Context Menu */}
        <Menu
          anchorEl={itemMenuAnchor}
          open={Boolean(itemMenuAnchor)}
          onClose={() => {
            setItemMenuAnchor(null);
            setSelectedItem(null);
          }}
        >
          <MenuItem onClick={() => selectedItem && handleOpenLocation(selectedItem.filePath)}>
            <ListItemIcon>
              <FolderOpenIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Open Location</ListItemText>
          </MenuItem>
          <MenuItem
            onClick={() => selectedItem && handleCopyUrl(selectedItem.url, selectedItem.id)}
          >
            <ListItemIcon>
              {copiedId === selectedItem?.id ? (
                <CheckCircleIcon fontSize="small" color="success" />
              ) : (
                <ContentCopyIcon fontSize="small" />
              )}
            </ListItemIcon>
            <ListItemText>{copiedId === selectedItem?.id ? 'Copied!' : 'Copy URL'}</ListItemText>
          </MenuItem>
          <Divider />
          <MenuItem
            onClick={() => selectedItem && handleRemoveItem(selectedItem.id)}
            sx={{ color: 'error.main' }}
          >
            <ListItemIcon>
              <DeleteIcon fontSize="small" color="error" />
            </ListItemIcon>
            <ListItemText>Remove</ListItemText>
          </MenuItem>
        </Menu>
      </Box>
    </Drawer>
  );
}

export default HistoryPanel;
