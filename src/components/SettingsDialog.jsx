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
  TextField,
  IconButton,
  CircularProgress,
  Alert,
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
import { isIpcFailure } from '../utils/ipcResult';

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
    discogsToken: '',
  });
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [saveError, setSaveError] = useState(null);

  const loadSettings = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    if (window.api && window.api.getSettings) {
      try {
        const savedSettings = await window.api.getSettings();
        if (isIpcFailure(savedSettings)) {
          setLoadError(savedSettings.error || 'Failed to load settings');
        } else {
          setSettings((prev) => ({ ...prev, ...savedSettings }));
        }
      } catch (err) {
        console.error('Failed to load settings:', err);
        setLoadError(err.message || 'Failed to load settings');
      }
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (open) {
      setSaveError(null);
      loadSettings();
    }
  }, [open, loadSettings]);

  const handleChange = (key, value) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setSaveError(null);
    if (window.api && window.api.saveSettings) {
      try {
        const res = await window.api.saveSettings(settings);
        if (isIpcFailure(res)) {
          setSaveError(res.error || 'Failed to save settings');
          return;
        }
        onSettingsSaved?.(settings);
        onClose();
      } catch (err) {
        console.error('Failed to save settings:', err);
        setSaveError(err.message || 'Failed to save settings');
      }
    } else {
      onClose();
    }
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
        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress aria-label="Loading settings" />
          </Box>
        )}
        {!loading && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {loadError && (
              <Alert severity="error" onClose={() => setLoadError(null)}>
                {loadError}
              </Alert>
            )}
            {saveError && (
              <Alert severity="error" onClose={() => setSaveError(null)}>
                {saveError}
              </Alert>
            )}
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
              <FormControl size="small" sx={{ minWidth: 160, mt: 1 }}>
                <InputLabel>Theme</InputLabel>
                <Select
                  value={settings.theme || 'dark'}
                  label="Theme"
                  onChange={async (e) => {
                    const newTheme = e.target.value;
                    const prevTheme = settings.theme;
                    setSaveError(null);
                    handleChange('theme', newTheme);
                    if (!window.api?.saveSettings) return;
                    try {
                      const res = await window.api.saveSettings({ ...settings, theme: newTheme });
                      if (isIpcFailure(res)) {
                        setSaveError(res.error || 'Failed to save theme');
                        handleChange('theme', prevTheme);
                        return;
                      }
                      onSettingsSaved?.({ ...settings, theme: newTheme });
                    } catch (err) {
                      setSaveError(err.message || 'Failed to save theme');
                      handleChange('theme', prevTheme);
                    }
                  }}
                  aria-label="Theme selection"
                >
                  <MenuItem value="light">Light</MenuItem>
                  <MenuItem value="dark">Dark</MenuItem>
                  <MenuItem value="system">System</MenuItem>
                </Select>
              </FormControl>
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

            {/* Catalog metadata (Discogs) */}
            <Box>
              <Typography
                variant="subtitle2"
                color="text.secondary"
                gutterBottom
                sx={{ fontWeight: 600 }}
              >
                Catalog metadata
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                Optional personal access token for Discogs API when loading metadata from a Discogs
                release URL in the metadata editor. MusicBrainz does not require a token.
              </Typography>
              <TextField
                fullWidth
                size="small"
                type="password"
                label="Discogs personal token"
                value={settings.discogsToken ?? ''}
                onChange={(e) => handleChange('discogsToken', e.target.value)}
                autoComplete="off"
                placeholder="Paste token from Discogs developer settings"
                helperText="Create one at discogs.com → Settings → Developers"
                aria-label="Discogs personal access token"
              />
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
