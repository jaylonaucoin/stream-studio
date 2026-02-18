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
} from '@mui/material';
import { GENRES } from '../../constants';
import ThumbnailSection from './ThumbnailSection';

/**
 * ChapterMetadataForm component for editing chapter/album metadata
 */
function ChapterMetadataForm({
  chapterMetadata,
  onChapterMetadataChange,
  thumbnailUrl,
  onThumbnailChange,
  onError,
}) {
  const handleFieldChange = useCallback((field, value) => {
    onChapterMetadataChange((prev) => ({
      ...prev,
      albumMetadata: {
        ...prev.albumMetadata,
        [field]: value,
      },
    }));
  }, [onChapterMetadataChange]);

  const handleTemplateChange = useCallback((value) => {
    onChapterMetadataChange((prev) => ({
      ...prev,
      chapterTitleTemplate: value,
    }));
  }, [onChapterMetadataChange]);

  return (
    <Box>
      <Alert severity="info" sx={{ mb: 2 }}>
        Album metadata will be applied to all chapters. Track numbers will auto-increment based on
        selected chapters.
      </Alert>
      <Typography variant="h6" gutterBottom>
        Album Metadata
      </Typography>
      <TextField
        fullWidth
        label="Artist"
        value={chapterMetadata.albumMetadata.artist}
        onChange={(e) => handleFieldChange('artist', e.target.value)}
        margin="normal"
      />
      <TextField
        fullWidth
        label="Album"
        value={chapterMetadata.albumMetadata.album}
        onChange={(e) => handleFieldChange('album', e.target.value)}
        margin="normal"
      />
      <TextField
        fullWidth
        label="Album Artist"
        value={chapterMetadata.albumMetadata.albumArtist}
        onChange={(e) => handleFieldChange('albumArtist', e.target.value)}
        margin="normal"
      />
      <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
        <FormControl fullWidth>
          <InputLabel>Genre</InputLabel>
          <Select
            value={chapterMetadata.albumMetadata.genre}
            label="Genre"
            onChange={(e) => handleFieldChange('genre', e.target.value)}
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
          value={chapterMetadata.albumMetadata.year}
          onChange={(e) => handleFieldChange('year', e.target.value)}
          type="number"
        />
      </Box>
      <TextField
        fullWidth
        label="Composer"
        value={chapterMetadata.albumMetadata.composer}
        onChange={(e) => handleFieldChange('composer', e.target.value)}
        margin="normal"
      />
      <TextField
        fullWidth
        label="Comment"
        value={chapterMetadata.albumMetadata.comment}
        onChange={(e) => handleFieldChange('comment', e.target.value)}
        margin="normal"
        multiline
        rows={2}
      />
      <Divider sx={{ my: 2 }} />
      <Typography variant="h6" gutterBottom>
        Chapter Titles
      </Typography>
      <FormControl fullWidth margin="normal">
        <InputLabel>Title Template</InputLabel>
        <Select
          value={chapterMetadata.chapterTitleTemplate}
          label="Title Template"
          onChange={(e) => handleTemplateChange(e.target.value)}
        >
          <MenuItem value="{chapterTitle}">Use Original Chapter Title</MenuItem>
          <MenuItem value="{album} - {chapterTitle}">Album - Chapter Title</MenuItem>
          <MenuItem value="Track {trackNumber}: {chapterTitle}">Track N: Chapter Title</MenuItem>
        </Select>
      </FormControl>
      <ThumbnailSection
        thumbnailUrl={thumbnailUrl}
        onThumbnailChange={onThumbnailChange}
        onError={onError}
      />
    </Box>
  );
}

export default ChapterMetadataForm;
