import {
  Box,
  Paper,
  Typography,
  IconButton,
  Tooltip,
  Chip,
  Divider,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import EditIcon from '@mui/icons-material/Edit';
import ThumbnailWithFallback from '../ThumbnailWithFallback';

/**
 * PlaylistPreviewCard - Displays playlist preview with mode toggle
 */
function PlaylistPreviewCard({
  playlistInfo,
  playlistMode,
  onPlaylistModeChange,
  customMetadata,
  onEditMetadata,
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
      <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', sm: 'row' } }}>
        {/* Playlist thumbnail - prefer playlist thumbnail, fallback to first video */}
        <ThumbnailWithFallback
          thumbnail={playlistInfo.playlistThumbnail || playlistInfo.videos?.[0]?.thumbnail}
          alt={playlistInfo.playlistTitle}
          isPlaylist={true}
        />
        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1, flexWrap: 'wrap' }}>
            <PlayArrowIcon sx={{ color: 'primary.main' }} />
            <Typography
              variant="subtitle1"
              sx={{
                fontWeight: 600,
                color: 'text.primary',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                flexGrow: 1,
                minWidth: 0,
              }}
            >
              {playlistInfo.playlistTitle}
            </Typography>
            <Chip
              label="Playlist"
              size="small"
              sx={{ bgcolor: 'primary.main', color: 'background.paper', flexShrink: 0 }}
            />
            <Tooltip title="Edit Metadata">
              <IconButton
                size="small"
                onClick={onEditMetadata}
                disabled={isConverting || disabled}
                sx={{ flexShrink: 0 }}
              >
                <EditIcon />
              </IconButton>
            </Tooltip>
          </Box>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mt: 1 }}>
            <Chip
              icon={<AccessTimeIcon />}
              label={`${playlistInfo.playlistVideoCount} videos`}
              size="small"
              variant="outlined"
              sx={{ borderColor: 'primary.main', color: 'text.primary' }}
            />
            {playlistInfo.playlistTotalDurationFormatted && (
              <Chip
                icon={<AccessTimeIcon />}
                label={`~${playlistInfo.playlistTotalDurationFormatted}`}
                size="small"
                variant="outlined"
                sx={{ borderColor: 'primary.main', color: 'text.primary' }}
              />
            )}
            {customMetadata && (
              <Chip
                icon={<EditIcon />}
                label="Custom Metadata"
                size="small"
                color="primary"
                variant="outlined"
              />
            )}
          </Box>
        </Box>
      </Box>
      <Divider sx={{ my: 1.5, borderColor: 'divider' }} />
      <Box>
        <Typography variant="body2" sx={{ mb: 1, color: 'text.primary' }}>
          Download mode:
        </Typography>
        <ToggleButtonGroup
          value={playlistMode}
          exclusive
          onChange={(e, newMode) => {
            if (newMode !== null) {
              onPlaylistModeChange(newMode);
            }
          }}
          aria-label="Playlist download mode"
          disabled={isConverting || disabled}
          fullWidth
          sx={{ height: '40px' }}
        >
          <ToggleButton value="full" aria-label="Full playlist mode">
            Full Playlist ({playlistInfo.playlistVideoCount} videos)
          </ToggleButton>
          <ToggleButton value="selected" aria-label="Selected videos mode">
            Selected Videos
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>
    </Paper>
  );
}

export default PlaylistPreviewCard;
