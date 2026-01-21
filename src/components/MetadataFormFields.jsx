import {
  Box,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
} from '@mui/material';
import { GENRES } from '../constants';

export function MetadataFormFields({
  metadata,
  onChange,
  errors = {},
  showTrackNumbers = false,
  totalTracksDisplay = null,
  hideTitle = false,
}) {
  return (
    <>
      {!hideTitle && (
        <TextField
          fullWidth
          label="Title"
          value={metadata.title || ''}
          onChange={(e) => onChange('title', e.target.value)}
          margin="normal"
          error={!!errors.title}
          helperText={errors.title}
        />
      )}
      <TextField
        fullWidth
        label="Artist"
        value={metadata.artist || ''}
        onChange={(e) => onChange('artist', e.target.value)}
        margin="normal"
        error={!!errors.artist}
        helperText={errors.artist}
      />
      <TextField
        fullWidth
        label="Album"
        value={metadata.album || ''}
        onChange={(e) => onChange('album', e.target.value)}
        margin="normal"
        error={!!errors.album}
        helperText={errors.album}
      />
      <TextField
        fullWidth
        label="Album Artist"
        value={metadata.albumArtist || ''}
        onChange={(e) => onChange('albumArtist', e.target.value)}
        margin="normal"
        error={!!errors.albumArtist}
        helperText={errors.albumArtist}
      />
      <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
        <FormControl fullWidth>
          <InputLabel>Genre</InputLabel>
          <Select
            value={metadata.genre || ''}
            label="Genre"
            onChange={(e) => onChange('genre', e.target.value)}
            error={!!errors.genre}
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
          value={metadata.year || ''}
          onChange={(e) => onChange('year', e.target.value)}
          type="number"
          error={!!errors.year}
          helperText={errors.year}
        />
      </Box>
      {showTrackNumbers && (
        <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
          <TextField
            fullWidth
            label="Track Number"
            value={metadata.trackNumber || ''}
            onChange={(e) => onChange('trackNumber', e.target.value)}
            type="number"
            error={!!errors.trackNumber}
            helperText={errors.trackNumber}
          />
          <TextField
            fullWidth
            label="Total Tracks"
            value={metadata.totalTracks || ''}
            onChange={(e) => onChange('totalTracks', e.target.value)}
            type="number"
          />
        </Box>
      )}
      {totalTracksDisplay !== null && (
        <Box sx={{ mt: 2, mb: 1 }}>
          <Typography variant="body2" color="text.secondary">
            Track numbers will auto-increment. Total tracks: {totalTracksDisplay} (automatic)
          </Typography>
        </Box>
      )}
      <TextField
        fullWidth
        label="Composer"
        value={metadata.composer || ''}
        onChange={(e) => onChange('composer', e.target.value)}
        margin="normal"
        error={!!errors.composer}
        helperText={errors.composer}
      />
      <TextField
        fullWidth
        label="Publisher"
        value={metadata.publisher || ''}
        onChange={(e) => onChange('publisher', e.target.value)}
        margin="normal"
        error={!!errors.publisher}
        helperText={errors.publisher}
      />
      <TextField
        fullWidth
        label="Comment"
        value={metadata.comment || ''}
        onChange={(e) => onChange('comment', e.target.value)}
        margin="normal"
        multiline
        rows={2}
        error={!!errors.comment}
        helperText={errors.comment}
      />
      <TextField
        fullWidth
        label="Description"
        value={metadata.description || ''}
        onChange={(e) => onChange('description', e.target.value)}
        margin="normal"
        multiline
        rows={3}
        error={!!errors.description}
        helperText={errors.description}
      />
      <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
        <TextField
          fullWidth
          label="Language"
          value={metadata.language || ''}
          onChange={(e) => onChange('language', e.target.value)}
          error={!!errors.language}
          helperText={errors.language}
        />
        <TextField
          fullWidth
          label="BPM"
          value={metadata.bpm || ''}
          onChange={(e) => onChange('bpm', e.target.value)}
          type="number"
          error={!!errors.bpm}
          helperText={errors.bpm}
        />
      </Box>
      <TextField
        fullWidth
        label="Copyright"
        value={metadata.copyright || ''}
        onChange={(e) => onChange('copyright', e.target.value)}
        margin="normal"
        error={!!errors.copyright}
        helperText={errors.copyright}
      />
    </>
  );
}
