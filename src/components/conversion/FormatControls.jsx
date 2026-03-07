import {
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material';
import { AUDIO_FORMATS, VIDEO_FORMATS, QUALITY_OPTIONS } from '../../constants';

/**
 * FormatControls - Mode, Format, and Quality selection controls
 */
function FormatControls({
  mode,
  format,
  quality,
  onModeChange,
  onFormatChange,
  onQualityChange,
  disabled,
  isConverting,
  videoModeDisabled = false,
}) {
  return (
    <Box
      sx={{
        mb: 2,
        display: 'flex',
        gap: 2,
        flexDirection: { xs: 'column', sm: 'row' },
        alignItems: { xs: 'stretch', sm: 'flex-end' },
      }}
    >
      <Box sx={{ flex: 1 }}>
        <Box sx={{ mb: 1 }}>
          <Box
            component="label"
            sx={{ fontSize: '0.875rem', color: 'text.secondary', display: 'block' }}
          >
            Mode
          </Box>
        </Box>
        <ToggleButtonGroup
          value={mode}
          exclusive
          onChange={(e, newMode) => {
            if (newMode !== null && !(newMode === 'video' && videoModeDisabled)) {
              onModeChange(newMode);
            }
          }}
          aria-label="Conversion mode selection"
          disabled={isConverting || disabled}
          fullWidth
          sx={{ height: '56px' }}
        >
          <ToggleButton value="audio" aria-label="Audio mode">
            Audio
          </ToggleButton>
          <ToggleButton
            value="video"
            aria-label="Video mode"
            disabled={videoModeDisabled}
          >
            Video
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>

      <Box sx={{ flex: 1 }}>
        <FormControl fullWidth>
          <InputLabel id="format-select-label">Format</InputLabel>
          <Select
            value={format}
            label="Format"
            labelId="format-select-label"
            onChange={(e) => onFormatChange(e.target.value)}
            disabled={isConverting || disabled}
            aria-label="Output format selection"
          >
            {(mode === 'audio' ? AUDIO_FORMATS : VIDEO_FORMATS).map((fmt) => (
              <MenuItem key={fmt.value} value={fmt.value}>
                {fmt.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      <Box sx={{ flex: 1 }}>
        <FormControl fullWidth>
          <InputLabel id="quality-select-label">Quality</InputLabel>
          <Select
            value={quality}
            label="Quality"
            labelId="quality-select-label"
            onChange={(e) => onQualityChange(e.target.value)}
            disabled={isConverting || disabled}
            aria-label="Quality selection"
          >
            {QUALITY_OPTIONS.map((opt) => (
              <MenuItem key={opt.value} value={opt.value}>
                {opt.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>
    </Box>
  );
}

export default FormatControls;
