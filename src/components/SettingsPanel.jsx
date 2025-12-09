import React from 'react';
import {
  Drawer,
  Box,
  Typography,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  IconButton,
  Chip,
  Alert,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import FolderIcon from '@mui/icons-material/Folder';
import InfoIcon from '@mui/icons-material/Info';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';

function SettingsPanel({
  open,
  onClose,
  outputFolder,
  onOutputFolderChange,
  ffmpegAvailable,
}) {
  const [appVersion, setAppVersion] = React.useState('');

  React.useEffect(() => {
    const loadVersion = async () => {
      if (window.api && window.api.getAppVersion) {
        try {
          const version = await window.api.getAppVersion();
          setAppVersion(version);
        } catch (err) {
          console.error('Failed to get app version:', err);
        }
      }
    };
    loadVersion();
  }, []);

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: { width: 400 },
      }}
    >
      <Box sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="h6">Settings</Typography>
          <IconButton onClick={onClose} aria-label="close settings">
            <CloseIcon />
          </IconButton>
        </Box>

        <Divider sx={{ mb: 2 }} />

        <List>
          <ListItem>
            <ListItemIcon>
              <FolderIcon />
            </ListItemIcon>
            <ListItemText
              primary="Output Folder"
              secondary={
                <Box sx={{ mt: 1 }}>
                  <Typography
                    variant="body2"
                    sx={{
                      fontFamily: 'monospace',
                      fontSize: '0.75rem',
                      wordBreak: 'break-all',
                      mb: 1,
                    }}
                  >
                    {outputFolder}
                  </Typography>
                  <Chip
                    label="Change Folder"
                    size="small"
                    onClick={onOutputFolderChange}
                    clickable
                    color="primary"
                    variant="outlined"
                  />
                </Box>
              }
            />
          </ListItem>

          <Divider sx={{ my: 1 }} />

          <ListItem>
            <ListItemIcon>
              {ffmpegAvailable ? (
                <CheckCircleIcon color="success" />
              ) : (
                <ErrorIcon color="error" />
              )}
            </ListItemIcon>
            <ListItemText
              primary="FFmpeg Status"
              secondary={
                <Chip
                  label={ffmpegAvailable ? 'Available' : 'Not Available'}
                  size="small"
                  color={ffmpegAvailable ? 'success' : 'error'}
                  sx={{ mt: 1 }}
                />
              }
            />
          </ListItem>

          {!ffmpegAvailable && (
            <ListItem>
              <Alert severity="warning" sx={{ width: '100%' }}>
                FFmpeg is required for conversion. Please ensure it is installed or bundled with the app.
              </Alert>
            </ListItem>
          )}

          <Divider sx={{ my: 1 }} />

          <ListItem>
            <ListItemIcon>
              <InfoIcon />
            </ListItemIcon>
            <ListItemText
              primary="App Version"
              secondary={appVersion || 'Loading...'}
            />
          </ListItem>
        </List>
      </Box>
    </Drawer>
  );
}

export default SettingsPanel;

