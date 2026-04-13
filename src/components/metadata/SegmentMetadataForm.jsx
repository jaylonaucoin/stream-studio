import { useCallback } from 'react';
import {
  Box,
  TextField,
  Typography,
  Alert,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  List,
  ListItem,
} from '@mui/material';
import { GENRES } from '../../constants';
import ThumbnailSection from './ThumbnailSection';
import CatalogLinkSection from './CatalogLinkSection';

/**
 * SegmentMetadataForm component for editing segment/manual split metadata
 */
function SegmentMetadataForm({
  segmentMetadata,
  onSegmentMetadataChange,
  useSharedArtistForSegments,
  thumbnailUrl,
  onThumbnailChange,
  onError,
}) {
  const handleAlbumFieldChange = useCallback(
    (field, value) => {
      onSegmentMetadataChange((prev) => ({
        ...prev,
        albumMetadata: {
          ...prev.albumMetadata,
          [field]: value,
        },
      }));
    },
    [onSegmentMetadataChange]
  );

  const handlePerTrackChange = useCallback(
    (index, field, value) => {
      onSegmentMetadataChange((prev) => {
        const updated = [...prev.perSegmentMetadata];
        updated[index] = { ...updated[index], [field]: value };
        return {
          ...prev,
          perSegmentMetadata: updated,
        };
      });
    },
    [onSegmentMetadataChange]
  );

  return (
    <Box>
      <Alert severity="info" sx={{ mb: 2 }}>
        Album metadata will be applied to all segments. Each segment will be downloaded as a
        separate track with its own title.
      </Alert>
      <CatalogLinkSection
        variant="albumShared"
        onMetadataLoaded={(m) => {
          onSegmentMetadataChange((prev) => ({
            ...prev,
            albumMetadata: { ...prev.albumMetadata, ...m },
          }));
        }}
        onCoverLoaded={(dataUrl) => {
          if (dataUrl) onThumbnailChange(dataUrl);
        }}
        onError={onError}
      />
      <Typography variant="h6" gutterBottom>
        Album Metadata
      </Typography>
      <TextField
        fullWidth
        label="Artist"
        value={segmentMetadata.albumMetadata.artist}
        onChange={(e) => handleAlbumFieldChange('artist', e.target.value)}
        margin="normal"
        helperText={
          useSharedArtistForSegments
            ? 'This artist will be applied to all segments'
            : 'Default artist (can be overridden per segment)'
        }
      />
      <TextField
        fullWidth
        label="Album"
        value={segmentMetadata.albumMetadata.album}
        onChange={(e) => handleAlbumFieldChange('album', e.target.value)}
        margin="normal"
      />
      <TextField
        fullWidth
        label="Album Artist"
        value={segmentMetadata.albumMetadata.albumArtist}
        onChange={(e) => handleAlbumFieldChange('albumArtist', e.target.value)}
        margin="normal"
      />
      <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
        <FormControl fullWidth>
          <InputLabel>Genre</InputLabel>
          <Select
            value={segmentMetadata.albumMetadata.genre}
            label="Genre"
            onChange={(e) => handleAlbumFieldChange('genre', e.target.value)}
          >
            <MenuItem value="">None</MenuItem>
            {GENRES.map((genre) => (
              <MenuItem key={genre} value={genre}>
                {genre}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <TextField
          fullWidth
          label="Year"
          value={segmentMetadata.albumMetadata.year}
          onChange={(e) => handleAlbumFieldChange('year', e.target.value)}
          type="number"
        />
      </Box>
      <TextField
        fullWidth
        label="Composer"
        value={segmentMetadata.albumMetadata.composer}
        onChange={(e) => handleAlbumFieldChange('composer', e.target.value)}
        margin="normal"
      />
      <TextField
        fullWidth
        label="Comment"
        value={segmentMetadata.albumMetadata.comment}
        onChange={(e) => handleAlbumFieldChange('comment', e.target.value)}
        margin="normal"
        multiline
        rows={2}
      />

      <Divider sx={{ my: 2 }} />

      <Typography variant="h6" gutterBottom>
        Segment Titles ({segmentMetadata.perSegmentMetadata.length} segments)
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Review and edit the title{!useSharedArtistForSegments && ' and artist'} for each segment.
      </Typography>

      <List sx={{ bgcolor: 'background.default', borderRadius: 1 }}>
        {segmentMetadata.perSegmentMetadata.map((seg, index) => (
          <ListItem key={index} sx={{ borderBottom: 1, borderColor: 'divider', py: 1.5 }}>
            <Box sx={{ width: '100%' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <Typography variant="caption" color="text.secondary">
                  Track {index + 1}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
                <TextField
                  fullWidth
                  label="Title"
                  value={seg.title}
                  onChange={(e) => handlePerTrackChange(index, 'title', e.target.value)}
                  size="small"
                />
                {!useSharedArtistForSegments && (
                  <TextField
                    label="Artist"
                    value={seg.artist}
                    onChange={(e) => handlePerTrackChange(index, 'artist', e.target.value)}
                    size="small"
                    sx={{ minWidth: 200 }}
                  />
                )}
              </Box>
            </Box>
          </ListItem>
        ))}
      </List>

      <ThumbnailSection
        thumbnailUrl={thumbnailUrl}
        onThumbnailChange={onThumbnailChange}
        onError={onError}
      />
    </Box>
  );
}

export default SegmentMetadataForm;
