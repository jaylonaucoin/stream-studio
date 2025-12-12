import { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Switch,
  FormControlLabel,
  Slider,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import SettingsIcon from '@mui/icons-material/Settings';

const AUDIO_FORMATS = ['mp3', 'm4a', 'flac', 'wav', 'aac', 'opus', 'vorbis', 'alac'];
const VIDEO_FORMATS = ['mp4', 'mkv', 'webm', 'mov', 'avi'];
const QUALITY_OPTIONS = [
  { value: 'best', label: 'Best' },
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
];

function SettingsDialog({ open, onClose }) {
  const [settings, setSettings] = useState({
    notificationsEnabled: true,
    maxHistoryItems: 50,
    defaultMode: 'audio',
    defaultAudioFormat: 'mp3',
    defaultVideoFormat: 'mp4',
    defaultQuality: 'best',
  });
  const [loading, setLoading] = useState(true);

  const loadSettings = useCallback(async () => {
    if (window.api && window.api.getSettings) {
      try {
        const savedSettings = await window.api.getSettings();
        setSettings((prev) => ({ ...prev, ...savedSettings }));
      } catch (err) {
        console.error('Failed to load settings:', err);
      }
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (open) {
      loadSettings();
    }
  }, [open, loadSettings]);

  const handleChange = (key, value) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    if (window.api && window.api.saveSettings) {
      try {
        await window.api.saveSettings(settings);
      } catch (err) {
        console.error('Failed to save settings:', err);
      }
    }
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{ sx: { borderRadius: 2 } }}
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <SettingsIcon />
            <Typography variant="h6">Settings</Typography>
          </Box>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        {!loading && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {/* Notifications */}
            <Box>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Notifications
              </Typography>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.notificationsEnabled}
                    onChange={(e) => handleChange('notificationsEnabled', e.target.checked)}
                  />
                }
                label="Show notification when conversion completes"
              />
            </Box>

            <Divider />

            {/* Default Formats */}
            <Box>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Default Formats
              </Typography>

              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mt: 1 }}>
                <FormControl size="small" sx={{ minWidth: 120 }}>
                  <InputLabel>Default Mode</InputLabel>
                  <Select
                    value={settings.defaultMode}
                    label="Default Mode"
                    onChange={(e) => handleChange('defaultMode', e.target.value)}
                  >
                    <MenuItem value="audio">Audio</MenuItem>
                    <MenuItem value="video">Video</MenuItem>
                  </Select>
                </FormControl>

                <FormControl size="small" sx={{ minWidth: 120 }}>
                  <InputLabel>Audio Format</InputLabel>
                  <Select
                    value={settings.defaultAudioFormat}
                    label="Audio Format"
                    onChange={(e) => handleChange('defaultAudioFormat', e.target.value)}
                  >
                    {AUDIO_FORMATS.map((fmt) => (
                      <MenuItem key={fmt} value={fmt}>
                        {fmt.toUpperCase()}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <FormControl size="small" sx={{ minWidth: 120 }}>
                  <InputLabel>Video Format</InputLabel>
                  <Select
                    value={settings.defaultVideoFormat}
                    label="Video Format"
                    onChange={(e) => handleChange('defaultVideoFormat', e.target.value)}
                  >
                    {VIDEO_FORMATS.map((fmt) => (
                      <MenuItem key={fmt} value={fmt}>
                        {fmt.toUpperCase()}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <FormControl size="small" sx={{ minWidth: 120 }}>
                  <InputLabel>Quality</InputLabel>
                  <Select
                    value={settings.defaultQuality}
                    label="Quality"
                    onChange={(e) => handleChange('defaultQuality', e.target.value)}
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

            <Divider />

            {/* History */}
            <Box>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                History
              </Typography>
              <Typography variant="body2" gutterBottom>
                Maximum history items: {settings.maxHistoryItems}
              </Typography>
              <Slider
                value={settings.maxHistoryItems}
                onChange={(e, value) => handleChange('maxHistoryItems', value)}
                min={10}
                max={200}
                step={10}
                marks={[
                  { value: 10, label: '10' },
                  { value: 100, label: '100' },
                  { value: 200, label: '200' },
                ]}
                sx={{ maxWidth: 300 }}
              />
            </Box>

            {/* Keyboard Shortcuts Info */}
            <Divider />
            <Box>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Keyboard Shortcuts
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                <Typography variant="body2">
                  <strong>Enter</strong> — Start conversion
                </Typography>
                <Typography variant="body2">
                  <strong>Escape</strong> — Cancel conversion
                </Typography>
                <Typography variant="body2">
                  <strong>Ctrl+V</strong> — Paste URL from clipboard
                </Typography>
              </Box>
            </Box>
          </Box>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSave} variant="contained">
          Save Settings
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default SettingsDialog;
