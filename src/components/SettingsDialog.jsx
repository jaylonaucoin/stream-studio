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
import {
  AUDIO_FORMAT_VALUES,
  VIDEO_FORMAT_VALUES,
  QUALITY_OPTIONS,
  SEARCH_SITES,
  DEFAULT_SEARCH_SITE,
  DEFAULT_SEARCH_LIMIT,
} from '../constants';

// Use format arrays from constants
const AUDIO_FORMATS = AUDIO_FORMAT_VALUES;
const VIDEO_FORMATS = VIDEO_FORMAT_VALUES;

function SettingsDialog({ open, onClose, onSettingsSaved }) {
  const [settings, setSettings] = useState({
    notificationsEnabled: true,
    maxHistoryItems: 50,
    defaultMode: 'audio',
    defaultAudioFormat: 'mp3',
    defaultVideoFormat: 'mp4',
    defaultQuality: 'best',
    theme: 'dark',
    defaultSearchSite: DEFAULT_SEARCH_SITE,
    defaultSearchLimit: DEFAULT_SEARCH_LIMIT,
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
        onSettingsSaved?.(settings);
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
          <IconButton onClick={onClose} size="small" aria-label="Close settings">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        {!loading && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {/* Theme */}
            <Box>
              <Typography
                variant="subtitle2"
                color="text.secondary"
                gutterBottom
                sx={{ fontWeight: 600 }}
              >
                Appearance
              </Typography>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.theme === 'light'}
                    onChange={(e) => handleChange('theme', e.target.checked ? 'light' : 'dark')}
                    aria-label="Light theme"
                  />
                }
                label="Light theme"
              />
            </Box>

            <Divider />

            {/* Notifications */}
            <Box>
              <Typography
                variant="subtitle2"
                color="text.secondary"
                gutterBottom
                sx={{ fontWeight: 600 }}
              >
                Notifications
              </Typography>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.notificationsEnabled}
                    onChange={(e) => handleChange('notificationsEnabled', e.target.checked)}
                    aria-label="Enable notifications"
                  />
                }
                label="Show notification when conversion completes"
              />
            </Box>

            <Divider />

            {/* Default Formats */}
            <Box>
              <Typography
                variant="subtitle2"
                color="text.secondary"
                gutterBottom
                sx={{ fontWeight: 600 }}
              >
                Default Conversion Settings
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                These settings will be used as defaults for new conversions
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

            {/* Search defaults */}
            <Box>
              <Typography
                variant="subtitle2"
                color="text.secondary"
                gutterBottom
                sx={{ fontWeight: 600 }}
              >
                Search Defaults
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Default site and result limit for the search tab
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mt: 1 }}>
                <FormControl size="small" sx={{ minWidth: 160 }}>
                  <InputLabel>Default Search Site</InputLabel>
                  <Select
                    value={settings.defaultSearchSite || DEFAULT_SEARCH_SITE}
                    label="Default Search Site"
                    onChange={(e) => handleChange('defaultSearchSite', e.target.value)}
                  >
                    {SEARCH_SITES.map((site) => (
                      <MenuItem key={site.id} value={site.id}>
                        {site.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <FormControl size="small" sx={{ minWidth: 120 }}>
                  <InputLabel>Results Limit</InputLabel>
                  <Select
                    value={settings.defaultSearchLimit ?? DEFAULT_SEARCH_LIMIT}
                    label="Results Limit"
                    onChange={(e) => handleChange('defaultSearchLimit', Number(e.target.value))}
                  >
                    <MenuItem value={10}>10</MenuItem>
                    <MenuItem value={15}>15</MenuItem>
                    <MenuItem value={20}>20</MenuItem>
                    <MenuItem value={25}>25</MenuItem>
                    <MenuItem value={50}>50</MenuItem>
                  </Select>
                </FormControl>
              </Box>
            </Box>

            <Divider />

            {/* History */}
            <Box>
              <Typography
                variant="subtitle2"
                color="text.secondary"
                gutterBottom
                sx={{ fontWeight: 600 }}
              >
                History
              </Typography>
              <Typography variant="body2" gutterBottom>
                Maximum history items: <strong>{settings.maxHistoryItems}</strong>
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
              <Typography
                variant="subtitle2"
                color="text.secondary"
                gutterBottom
                sx={{ fontWeight: 600 }}
              >
                Keyboard Shortcuts
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                Press <strong>Ctrl+K</strong> (or <strong>⌘K</strong> on Mac) to view all keyboard
                shortcuts.
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                <Typography variant="body2">
                  <strong>Enter</strong> — Start conversion
                </Typography>
                <Typography variant="body2">
                  <strong>Escape</strong> — Cancel conversion
                </Typography>
                <Typography variant="body2">
                  <strong>Ctrl+V</strong> / <strong>⌘V</strong> — Paste URL from clipboard
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
