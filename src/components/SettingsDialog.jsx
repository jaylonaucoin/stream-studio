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
  Tabs,
  Tab,
  Paper,
  Chip,
  Link,
  alpha,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import SettingsIcon from '@mui/icons-material/Settings';
import NotificationsIcon from '@mui/icons-material/Notifications';
import TuneIcon from '@mui/icons-material/Tune';
import KeyboardIcon from '@mui/icons-material/Keyboard';
import InfoIcon from '@mui/icons-material/Info';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import MovieIcon from '@mui/icons-material/Movie';
import GitHubIcon from '@mui/icons-material/GitHub';
import StorageIcon from '@mui/icons-material/Storage';
import MovieFilterIcon from '@mui/icons-material/MovieFilter';
import { colors } from '../styles/theme';

const AUDIO_FORMATS = [
  { value: 'mp3', label: 'MP3' },
  { value: 'm4a', label: 'M4A' },
  { value: 'flac', label: 'FLAC' },
  { value: 'wav', label: 'WAV' },
  { value: 'aac', label: 'AAC' },
  { value: 'opus', label: 'Opus' },
  { value: 'vorbis', label: 'Vorbis' },
  { value: 'alac', label: 'ALAC' },
];

const VIDEO_FORMATS = [
  { value: 'mp4', label: 'MP4' },
  { value: 'mkv', label: 'MKV' },
  { value: 'webm', label: 'WebM' },
  { value: 'mov', label: 'MOV' },
  { value: 'avi', label: 'AVI' },
];

const QUALITY_OPTIONS = [
  { value: 'best', label: 'Best' },
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
];

function TabPanel({ children, value, index }) {
  return (
    <Box role="tabpanel" hidden={value !== index} sx={{ py: 2 }}>
      {value === index && children}
    </Box>
  );
}

function SettingSection({ icon, title, description, children }) {
  return (
    <Paper
      elevation={0}
      sx={{
        p: 2.5,
        mb: 2,
        borderRadius: 2,
        bgcolor: alpha(colors.background.card, 0.5),
        border: `1px solid ${colors.divider}`,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, mb: 2 }}>
        <Box
          sx={{
            width: 36,
            height: 36,
            borderRadius: 1.5,
            bgcolor: alpha(colors.primary.main, 0.1),
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          {icon}
        </Box>
        <Box>
          <Typography variant="subtitle1" fontWeight={600}>
            {title}
          </Typography>
          {description && (
            <Typography variant="body2" color="text.secondary">
              {description}
            </Typography>
          )}
        </Box>
      </Box>
      {children}
    </Paper>
  );
}

function KeyboardShortcut({ keys, description }) {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        py: 1,
        borderBottom: `1px solid ${alpha(colors.divider, 0.5)}`,
        '&:last-child': { borderBottom: 'none' },
      }}
    >
      <Typography variant="body2" color="text.secondary">
        {description}
      </Typography>
      <Box sx={{ display: 'flex', gap: 0.5 }}>
        {keys.map((key, i) => (
          <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Chip
              label={key}
              size="small"
              sx={{
                height: 24,
                fontSize: '0.75rem',
                fontWeight: 600,
                bgcolor: alpha(colors.background.default, 0.8),
                border: `1px solid ${colors.divider}`,
              }}
            />
            {i < keys.length - 1 && (
              <Typography variant="caption" color="text.disabled">
                +
              </Typography>
            )}
          </Box>
        ))}
      </Box>
    </Box>
  );
}

function SettingsDialog({ open, onClose, appVersion }) {
  const [settings, setSettings] = useState({
    notificationsEnabled: true,
    maxHistoryItems: 50,
    defaultMode: 'audio',
    defaultAudioFormat: 'mp3',
    defaultVideoFormat: 'mp4',
    defaultQuality: 'best',
  });
  const [loading, setLoading] = useState(true);
  const [tabValue, setTabValue] = useState(0);

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
      setTabValue(0);
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

  const handleOpenExternal = async (url) => {
    if (window.api && window.api.openExternal) {
      try {
        await window.api.openExternal(url);
      } catch (err) {
        console.error('Failed to open external link:', err);
      }
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          bgcolor: colors.background.elevated,
          backgroundImage: 'none',
          maxHeight: '85vh',
        },
      }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: 2,
                bgcolor: alpha(colors.primary.main, 0.15),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <SettingsIcon sx={{ color: 'primary.main' }} />
            </Box>
            <Typography variant="h6" fontWeight={700}>
              Settings
            </Typography>
          </Box>
          <IconButton onClick={onClose} size="small" sx={{ color: 'text.secondary' }}>
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <Box sx={{ px: 3 }}>
        <Tabs
          value={tabValue}
          onChange={(e, v) => setTabValue(v)}
          sx={{
            minHeight: 40,
            '& .MuiTab-root': {
              minHeight: 40,
              textTransform: 'none',
              fontWeight: 500,
            },
          }}
        >
          <Tab icon={<TuneIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="General" />
          <Tab
            icon={<KeyboardIcon sx={{ fontSize: 18 }} />}
            iconPosition="start"
            label="Shortcuts"
          />
          <Tab icon={<InfoIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="About" />
        </Tabs>
      </Box>

      <Divider />

      <DialogContent sx={{ pt: 0 }}>
        {!loading && (
          <>
            {/* General Tab */}
            <TabPanel value={tabValue} index={0}>
              {/* Notifications */}
              <SettingSection
                icon={<NotificationsIcon sx={{ fontSize: 20, color: 'primary.main' }} />}
                title="Notifications"
                description="Control system notifications"
              >
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.notificationsEnabled}
                      onChange={(e) => handleChange('notificationsEnabled', e.target.checked)}
                      color="primary"
                    />
                  }
                  label={
                    <Typography variant="body2">
                      Show notification when conversion completes
                    </Typography>
                  }
                />
              </SettingSection>

              {/* Default Formats */}
              <SettingSection
                icon={<TuneIcon sx={{ fontSize: 20, color: 'primary.main' }} />}
                title="Default Settings"
                description="Set your preferred conversion defaults"
              >
                <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: '1fr 1fr' }}>
                  <FormControl fullWidth size="small">
                    <InputLabel>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        Default Mode
                      </Box>
                    </InputLabel>
                    <Select
                      value={settings.defaultMode}
                      label="Default Mode"
                      onChange={(e) => handleChange('defaultMode', e.target.value)}
                    >
                      <MenuItem value="audio">
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <MusicNoteIcon sx={{ fontSize: 18 }} />
                          Audio
                        </Box>
                      </MenuItem>
                      <MenuItem value="video">
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <MovieIcon sx={{ fontSize: 18 }} />
                          Video
                        </Box>
                      </MenuItem>
                    </Select>
                  </FormControl>

                  <FormControl fullWidth size="small">
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

                  <FormControl fullWidth size="small">
                    <InputLabel>Audio Format</InputLabel>
                    <Select
                      value={settings.defaultAudioFormat}
                      label="Audio Format"
                      onChange={(e) => handleChange('defaultAudioFormat', e.target.value)}
                    >
                      {AUDIO_FORMATS.map((fmt) => (
                        <MenuItem key={fmt.value} value={fmt.value}>
                          {fmt.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  <FormControl fullWidth size="small">
                    <InputLabel>Video Format</InputLabel>
                    <Select
                      value={settings.defaultVideoFormat}
                      label="Video Format"
                      onChange={(e) => handleChange('defaultVideoFormat', e.target.value)}
                    >
                      {VIDEO_FORMATS.map((fmt) => (
                        <MenuItem key={fmt.value} value={fmt.value}>
                          {fmt.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Box>
              </SettingSection>

              {/* History */}
              <SettingSection
                icon={<StorageIcon sx={{ fontSize: 20, color: 'primary.main' }} />}
                title="Storage"
                description="Manage conversion history"
              >
                <Typography variant="body2" color="text.secondary" gutterBottom>
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
                  sx={{ mt: 1 }}
                />
              </SettingSection>
            </TabPanel>

            {/* Shortcuts Tab */}
            <TabPanel value={tabValue} index={1}>
              <SettingSection
                icon={<KeyboardIcon sx={{ fontSize: 20, color: 'primary.main' }} />}
                title="Keyboard Shortcuts"
                description="Quick actions for faster workflow"
              >
                <KeyboardShortcut keys={['Enter']} description="Start conversion" />
                <KeyboardShortcut keys={['Escape']} description="Cancel conversion" />
                <KeyboardShortcut keys={['Ctrl', 'V']} description="Paste URL from clipboard" />
              </SettingSection>

              <Paper
                elevation={0}
                sx={{
                  p: 2,
                  borderRadius: 2,
                  bgcolor: alpha(colors.info.main, 0.08),
                  border: `1px solid ${alpha(colors.info.main, 0.2)}`,
                }}
              >
                <Typography variant="body2" color="text.secondary">
                  💡 <strong>Tip:</strong> You can also drag and drop URLs directly into the URL
                  input field for quick conversion.
                </Typography>
              </Paper>
            </TabPanel>

            {/* About Tab */}
            <TabPanel value={tabValue} index={2}>
              {/* App Info */}
              <Box sx={{ textAlign: 'center', mb: 3 }}>
                <Box
                  sx={{
                    width: 80,
                    height: 80,
                    borderRadius: 3,
                    background: colors.gradients.primary,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mx: 'auto',
                    mb: 2,
                    boxShadow: `0 8px 32px ${alpha(colors.primary.main, 0.4)}`,
                  }}
                >
                  <MovieFilterIcon sx={{ fontSize: 44, color: 'white' }} />
                </Box>
                <Typography variant="h5" fontWeight={700} gutterBottom>
                  Media Converter
                </Typography>
                <Chip
                  label={`Version ${appVersion || '1.0.0'}`}
                  size="small"
                  sx={{
                    bgcolor: alpha(colors.primary.main, 0.1),
                    color: 'primary.main',
                    fontWeight: 600,
                  }}
                />
              </Box>

              <SettingSection
                icon={<InfoIcon sx={{ fontSize: 20, color: 'primary.main' }} />}
                title="About"
                description="Application information"
              >
                <Typography variant="body2" color="text.secondary" paragraph>
                  A modern desktop application for downloading and converting online media from
                  1000+ supported websites including YouTube, Vimeo, TikTok, Twitter, Instagram,
                  SoundCloud, and many more.
                </Typography>

                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  <Chip label="yt-dlp" size="small" variant="outlined" />
                  <Chip label="FFmpeg" size="small" variant="outlined" />
                  <Chip label="Electron" size="small" variant="outlined" />
                  <Chip label="React" size="small" variant="outlined" />
                  <Chip label="Material-UI" size="small" variant="outlined" />
                </Box>
              </SettingSection>

              <SettingSection
                icon={<GitHubIcon sx={{ fontSize: 20, color: 'primary.main' }} />}
                title="Resources"
                description="Useful links and documentation"
              >
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <Link
                    component="button"
                    variant="body2"
                    onClick={() => handleOpenExternal('https://github.com/yt-dlp/yt-dlp')}
                    sx={{ textAlign: 'left', color: 'primary.main' }}
                  >
                    yt-dlp Documentation →
                  </Link>
                  <Link
                    component="button"
                    variant="body2"
                    onClick={() =>
                      handleOpenExternal(
                        'https://github.com/yt-dlp/yt-dlp/blob/master/supportedsites.md'
                      )
                    }
                    sx={{ textAlign: 'left', color: 'primary.main' }}
                  >
                    Supported Sites List →
                  </Link>
                  <Link
                    component="button"
                    variant="body2"
                    onClick={() => handleOpenExternal('https://ffmpeg.org/')}
                    sx={{ textAlign: 'left', color: 'primary.main' }}
                  >
                    FFmpeg Documentation →
                  </Link>
                </Box>
              </SettingSection>

              <Paper
                elevation={0}
                sx={{
                  p: 2,
                  borderRadius: 2,
                  bgcolor: alpha(colors.warning.main, 0.08),
                  border: `1px solid ${alpha(colors.warning.main, 0.2)}`,
                }}
              >
                <Typography variant="caption" color="text.secondary">
                  <strong>Disclaimer:</strong> This software is provided for personal use only.
                  Users are responsible for ensuring their use complies with applicable Terms of
                  Service and copyright laws.
                </Typography>
              </Paper>
            </TabPanel>
          </>
        )}
      </DialogContent>

      <Divider />

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} sx={{ color: 'text.secondary' }}>
          Cancel
        </Button>
        <Button onClick={handleSave} variant="contained">
          Save Settings
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default SettingsDialog;
