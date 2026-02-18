import {
  Box,
  Paper,
  Typography,
  Button,
  Chip,
  Divider,
  Checkbox,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  ListItemIcon,
  Alert,
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import CheckBoxIcon from '@mui/icons-material/CheckBox';
import CheckBoxOutlineBlankIcon from '@mui/icons-material/CheckBoxOutlineBlank';
import ThumbnailWithFallback from '../ThumbnailWithFallback';

/**
 * PlaylistVideoSelector - Displays list of videos in playlist for selection
 */
function PlaylistVideoSelector({
  videos,
  selectedVideos,
  onVideoToggle,
  onSelectAll,
  onDeselectAll,
  disabled,
  isConverting,
}) {
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
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <PlayArrowIcon sx={{ color: 'primary.main' }} />
          <Typography variant="subtitle1" sx={{ fontWeight: 600, color: 'text.primary' }}>
            Select Videos
          </Typography>
          <Chip
            label={`${selectedVideos.length} of ${videos.length} selected`}
            size="small"
            sx={{ bgcolor: 'primary.main', color: 'background.paper' }}
          />
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            size="small"
            onClick={onSelectAll}
            disabled={isConverting || disabled || selectedVideos.length === videos.length}
            sx={{ minWidth: 'auto', px: 1 }}
          >
            Select All
          </Button>
          <Button
            size="small"
            onClick={onDeselectAll}
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
          {videos.map((video, index) => (
            <ListItem
              key={video.index}
              disablePadding
              sx={{
                borderBottom: index < videos.length - 1 ? 1 : 0,
                borderColor: 'divider',
              }}
            >
              <ListItemButton
                onClick={() => onVideoToggle(video.index)}
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
  );
}

export default PlaylistVideoSelector;
