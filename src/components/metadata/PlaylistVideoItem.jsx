import { useState } from 'react';
import {
  Box,
  TextField,
  ListItem,
  ListItemButton,
  ListItemText,
  Collapse,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';

/**
 * PlaylistVideoItem - Expandable list item for individual playlist video metadata
 * Defined outside MetadataEditor to prevent remounting on parent re-renders
 */
function PlaylistVideoItem({
  video,
  index,
  fileMeta,
  onMetadataChange,
  totalTracks,
  useSharedArtist,
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <ListItem disablePadding>
      <Box sx={{ width: '100%' }}>
        <ListItemButton onClick={() => setExpanded(!expanded)}>
          <ListItemText
            primary={`${video.title}`}
            secondary={`Track ${fileMeta.trackNumber || index + 1} of ${totalTracks}`}
          />
          {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
        </ListItemButton>
        <Collapse in={expanded} timeout="auto" unmountOnExit>
          <Box sx={{ p: 2, bgcolor: 'background.default' }}>
            <TextField
              fullWidth
              label="Title"
              value={fileMeta.title || ''}
              onChange={(e) => onMetadataChange(index, 'title', e.target.value)}
              margin="normal"
              size="small"
            />
            {!useSharedArtist && (
              <TextField
                fullWidth
                label="Artist"
                value={fileMeta.artist || ''}
                onChange={(e) => onMetadataChange(index, 'artist', e.target.value)}
                margin="normal"
                size="small"
                helperText="Artist for this song (can be different for each song)"
              />
            )}
            <TextField
              fullWidth
              label="Track Number"
              value={fileMeta.trackNumber || ''}
              onChange={(e) => onMetadataChange(index, 'trackNumber', e.target.value)}
              type="number"
              margin="normal"
              size="small"
              helperText={`Total tracks: ${totalTracks} (automatic)`}
            />
          </Box>
        </Collapse>
      </Box>
    </ListItem>
  );
}

export default PlaylistVideoItem;
