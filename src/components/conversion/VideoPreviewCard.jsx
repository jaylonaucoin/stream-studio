import { Box, Paper, Typography, IconButton, Tooltip, Chip } from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PersonIcon from '@mui/icons-material/Person';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import EditIcon from '@mui/icons-material/Edit';
import ThumbnailWithFallback from '../ThumbnailWithFallback';

/**
 * VideoPreviewCard - Displays single video preview information
 */
function VideoPreviewCard({
  videoInfo,
  chapterInfo,
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
        border: 1,
        borderColor: 'divider',
      }}
    >
      <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', sm: 'row' } }}>
        <ThumbnailWithFallback
          thumbnail={videoInfo.thumbnail}
          alt={videoInfo.title}
          isPlaylist={false}
        />
        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, mb: 1 }}>
            <PlayArrowIcon sx={{ color: 'primary.main', mt: 0.5, flexShrink: 0 }} />
            <Typography
              variant="subtitle1"
              sx={{
                fontWeight: 600,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                flexGrow: 1,
              }}
            >
              {videoInfo.title}
            </Typography>
            {/* Only show Edit Metadata button if chapters are NOT available */}
            {!chapterInfo?.hasChapters && (
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
            )}
          </Box>

          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, mt: 1 }}>
            {videoInfo.durationFormatted && (
              <Chip
                icon={<AccessTimeIcon />}
                label={videoInfo.durationFormatted}
                size="small"
                variant="outlined"
              />
            )}
            {videoInfo.uploader && (
              <Chip
                icon={<PersonIcon />}
                label={videoInfo.uploader}
                size="small"
                variant="outlined"
              />
            )}
            {chapterInfo?.hasChapters && (
              <Chip
                icon={<PlayArrowIcon />}
                label={`${chapterInfo.totalChapters} chapters`}
                size="small"
                variant="outlined"
                color="primary"
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
    </Paper>
  );
}

export default VideoPreviewCard;
