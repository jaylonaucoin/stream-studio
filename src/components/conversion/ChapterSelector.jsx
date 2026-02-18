import { useCallback, useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  IconButton,
  Tooltip,
  Chip,
  Divider,
  Checkbox,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  ListItemIcon,
  Alert,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import EditIcon from '@mui/icons-material/Edit';
import CheckBoxIcon from '@mui/icons-material/CheckBox';
import CheckBoxOutlineBlankIcon from '@mui/icons-material/CheckBoxOutlineBlank';

/**
 * ChapterSelector - Displays chapter selection panel with editable titles
 */
function ChapterSelector({
  chapterInfo,
  selectedChapters,
  onChapterToggle,
  onSelectAll,
  onDeselectAll,
  chapterDownloadMode,
  onChapterDownloadModeChange,
  editedChapterTitles,
  onChapterTitleChange,
  onEditMetadata,
  disabled,
  isConverting,
}) {
  const [editingChapterIndex, setEditingChapterIndex] = useState(null);
  const [editingChapterValue, setEditingChapterValue] = useState('');

  const handleChapterTitleEdit = useCallback((chapterIndex) => {
    const chapter = chapterInfo?.chapters?.[chapterIndex];
    if (!chapter) return;
    
    const currentTitle = editedChapterTitles[chapterIndex] ?? chapter.title;
    setEditingChapterIndex(chapterIndex);
    setEditingChapterValue(currentTitle);
  }, [chapterInfo, editedChapterTitles]);

  const handleChapterTitleSave = useCallback((chapterIndex) => {
    if (editingChapterValue.trim()) {
      onChapterTitleChange(chapterIndex, editingChapterValue.trim());
    } else {
      onChapterTitleChange(chapterIndex, null); // Remove edited title
    }
    setEditingChapterIndex(null);
    setEditingChapterValue('');
  }, [editingChapterValue, onChapterTitleChange]);

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

  return (
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
            onClick={onSelectAll}
            disabled={isConverting || disabled || selectedChapters.length === chapterInfo.totalChapters}
            sx={{ minWidth: 'auto', px: 1 }}
          >
            Select All
          </Button>
          <Button
            size="small"
            onClick={onDeselectAll}
            disabled={isConverting || disabled || selectedChapters.length === 0}
            sx={{ minWidth: 'auto', px: 1 }}
          >
            Deselect All
          </Button>
          <Tooltip title="Edit Metadata">
            <IconButton
              size="small"
              onClick={onEditMetadata}
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
              onChapterDownloadModeChange(newMode);
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
          <Typography variant="caption" sx={{ mt: 0.5, color: 'text.secondary', display: 'block' }}>
            The entire video will be downloaded as one file, ignoring chapter selection.
          </Typography>
        )}
        {selectedChapters.length > 0 && chapterDownloadMode === 'split' && (
          <Typography variant="caption" sx={{ mt: 0.5, color: 'text.secondary', display: 'block' }}>
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
                onClick={() => onChapterToggle(index)}
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
                        <Box
                          onClick={(e) => e.stopPropagation()}
                          onMouseDown={(e) => e.stopPropagation()}
                          sx={{ flexGrow: 1 }}
                        >
                          <TextField
                            value={editingChapterValue}
                            onChange={(e) => setEditingChapterValue(e.target.value)}
                            onBlur={() => handleChapterTitleSave(index)}
                            onKeyDown={(e) => handleChapterTitleKeyDown(e, index)}
                            size="small"
                            autoFocus
                            fullWidth
                            inputProps={{ style: { fontSize: '0.875rem' } }}
                          />
                        </Box>
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
  );
}

export default ChapterSelector;
