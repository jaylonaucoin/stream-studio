import { useState, useEffect, useCallback } from 'react';
import { ThemeProvider, CssBaseline } from '@mui/material';
import {
  Box,
  Container,
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Tooltip,
  Badge,
  Chip,
} from '@mui/material';
import SettingsIcon from '@mui/icons-material/Settings';
import HistoryIcon from '@mui/icons-material/History';
import QueueIcon from '@mui/icons-material/Queue';
import theme from './styles/theme';
import ConversionForm from './components/ConversionForm';
import ProgressIndicator from './components/ProgressIndicator';
import LogViewer from './components/LogViewer';
import ErrorDialog from './components/ErrorDialog';
import OutputFolderSelector from './components/OutputFolderSelector';
import SettingsDialog from './components/SettingsDialog';
import HistoryPanel from './components/HistoryPanel';
import QueuePanel from './components/QueuePanel';

function App() {
  const [conversionState, setConversionState] = useState('idle'); // idle, converting, completed, error
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');
  const [logs, setLogs] = useState([]);
  const [logsVisible, setLogsVisible] = useState(false);
  const [error, setError] = useState(null);
  const [outputFolder, setOutputFolder] = useState('');
  const [lastConvertedFile, setLastConvertedFile] = useState(null);
  const [ffmpegAvailable, setFfmpegAvailable] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [queueOpen, setQueueOpen] = useState(false);
  const [historyCount, setHistoryCount] = useState(0);
  const [appVersion, setAppVersion] = useState('');
  const [defaultSettings, setDefaultSettings] = useState({
    defaultMode: 'audio',
    defaultAudioFormat: 'mp3',
    defaultVideoFormat: 'mp4',
  });

  // Load output folder, settings, and history on mount
  useEffect(() => {
    const loadOutputFolder = async () => {
      if (window.api && window.api.getOutputFolder) {
        try {
          const folder = await window.api.getOutputFolder();
          setOutputFolder(folder);
        } catch (err) {
          console.error('Failed to load output folder:', err);
          setOutputFolder('Downloads');
        }
      }
    };

    const checkFfmpeg = async () => {
      if (window.api && window.api.checkFfmpeg) {
        try {
          const result = await window.api.checkFfmpeg();
          setFfmpegAvailable(result.available);
        } catch (err) {
          console.error('Failed to check FFmpeg:', err);
        }
      }
    };

    const loadSettings = async () => {
      if (window.api && window.api.getSettings) {
        try {
          const settings = await window.api.getSettings();
          setDefaultSettings({
            defaultMode: settings.defaultMode || 'audio',
            defaultAudioFormat: settings.defaultAudioFormat || 'mp3',
            defaultVideoFormat: settings.defaultVideoFormat || 'mp4',
          });
        } catch (err) {
          console.error('Failed to load settings:', err);
        }
      }
    };

    const loadHistoryCount = async () => {
      if (window.api && window.api.getHistory) {
        try {
          const history = await window.api.getHistory();
          setHistoryCount(history?.length || 0);
        } catch (err) {
          console.error('Failed to load history:', err);
        }
      }
    };

    const loadVersion = async () => {
      if (window.api && window.api.getAppVersion) {
        try {
          const version = await window.api.getAppVersion();
          setAppVersion(version);
        } catch (err) {
          console.error('Failed to load version:', err);
        }
      }
    };

    loadOutputFolder();
    checkFfmpeg();
    loadSettings();
    loadHistoryCount();
    loadVersion();
  }, []);

  const handleProgress = useCallback((data) => {
    if (!data) return;

    switch (data.type) {
      case 'progress':
        if (data.percent !== undefined) {
          setProgress(data.percent);
          setStatusMessage(`Converting... ${data.percent.toFixed(1)}%`);
        }
        if (data.message) {
          setLogs((prev) => [
            ...prev,
            { type: 'progress', message: data.message, timestamp: Date.now() },
          ]);
        }
        break;

      case 'status':
      case 'info':
        if (data.message) {
          setLogs((prev) => [
            ...prev,
            { type: 'info', message: data.message, timestamp: Date.now() },
          ]);
        }
        break;

      case 'cancelled':
        setStatusMessage('Cancelled');
        setConversionState('idle');
        setProgress(0);
        if (data.message) {
          setLogs((prev) => [
            ...prev,
            { type: 'error', message: data.message, timestamp: Date.now() },
          ]);
        }
        break;
    }
  }, []);

  // Setup progress listener
  useEffect(() => {
    if (window.api && window.api.onProgress) {
      window.api.onProgress(handleProgress);
    }

    return () => {
      if (window.api && window.api.offProgress) {
        window.api.offProgress();
      }
    };
  }, [handleProgress]);

  const handleConvert = useCallback(
    async (url, options = {}) => {
      if (!url || conversionState === 'converting') return;

      setConversionState('converting');
      setProgress(0);
      setStatusMessage('Starting conversion...');
      setLogs([]);
      setError(null);
      setLastConvertedFile(null);

      try {
        const result = await window.api.convert(url, {
          outputFolder,
          mode: options.mode || 'audio',
          format: options.format || 'mp3',
        });

        if (result.success) {
          setProgress(100);
          setStatusMessage('Conversion complete!');
          setConversionState('completed');
          setLastConvertedFile(result);
          setLogs((prev) => [
            ...prev,
            {
              type: 'success',
              message: '✓ Conversion completed successfully',
              timestamp: Date.now(),
            },
          ]);
          // Update history count
          setHistoryCount((prev) => prev + 1);
        }
      } catch (error) {
        setConversionState('error');
        setStatusMessage('Conversion failed');
        setError({
          title: 'Conversion Failed',
          message: error.message || 'An error occurred during conversion',
        });
        setLogs((prev) => [
          ...prev,
          { type: 'error', message: `✗ Error: ${error.message}`, timestamp: Date.now() },
        ]);
      }
    },
    [outputFolder, conversionState]
  );

  const handleCancel = useCallback(async () => {
    if (conversionState !== 'converting') return;

    try {
      await window.api.cancel();
      setConversionState('idle');
      setProgress(0);
      setStatusMessage('Cancelled');
    } catch (error) {
      console.error('Failed to cancel:', error);
    }
  }, [conversionState]);

  const handleOutputFolderChange = useCallback(async () => {
    if (window.api && window.api.chooseOutput) {
      try {
        const result = await window.api.chooseOutput();
        if (result.success && result.folder) {
          setOutputFolder(result.folder);
        }
      } catch (error) {
        setError({
          title: 'Folder Selection Error',
          message: error.message || 'Failed to select output folder',
        });
      }
    }
  }, []);

  const handleOpenFileLocation = useCallback(async (filePath) => {
    if (window.api && window.api.openFileLocation) {
      try {
        await window.api.openFileLocation(filePath);
      } catch (error) {
        setError({
          title: 'File Location Error',
          message: error.message || 'Failed to open file location',
        });
      }
    }
  }, []);

  const handleCloseError = useCallback(() => {
    setError(null);
  }, []);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <AppBar position="static" elevation={1}>
          <Toolbar>
            <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
              Media Converter
            </Typography>
            {appVersion && (
              <Chip
                label={`v${appVersion}`}
                size="small"
                variant="outlined"
                sx={{ mr: 2, opacity: 0.7, borderColor: 'rgba(255,255,255,0.3)', color: 'inherit' }}
              />
            )}
            <Tooltip title="Batch Queue">
              <IconButton color="inherit" onClick={() => setQueueOpen(true)} sx={{ mr: 1 }}>
                <QueueIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Conversion History">
              <IconButton color="inherit" onClick={() => setHistoryOpen(true)} sx={{ mr: 1 }}>
                <Badge badgeContent={historyCount} color="error" max={99}>
                  <HistoryIcon />
                </Badge>
              </IconButton>
            </Tooltip>
            <Tooltip title="Settings">
              <IconButton color="inherit" onClick={() => setSettingsOpen(true)}>
                <SettingsIcon />
              </IconButton>
            </Tooltip>
          </Toolbar>
        </AppBar>

        <Container maxWidth="md" sx={{ flexGrow: 1, py: 4 }}>
          <ConversionForm
            onConvert={handleConvert}
            onCancel={handleCancel}
            isConverting={conversionState === 'converting'}
            disabled={!ffmpegAvailable}
            defaultMode={defaultSettings.defaultMode}
            defaultAudioFormat={defaultSettings.defaultAudioFormat}
            defaultVideoFormat={defaultSettings.defaultVideoFormat}
          />

          <Box sx={{ mt: 4 }}>
            <ProgressIndicator
              progress={progress}
              statusMessage={statusMessage}
              state={conversionState}
              lastConvertedFile={lastConvertedFile}
              onOpenFileLocation={handleOpenFileLocation}
            />
          </Box>

          <Box sx={{ mt: 3 }}>
            <LogViewer
              logs={logs}
              visible={logsVisible}
              onToggleVisibility={() => setLogsVisible(!logsVisible)}
              onClear={() => setLogs([])}
            />
          </Box>
        </Container>

        <Box
          component="footer"
          sx={{
            mt: 'auto',
            py: 2,
            px: 3,
            bgcolor: 'background.paper',
            borderTop: 1,
            borderColor: 'divider',
          }}
        >
          <OutputFolderSelector folder={outputFolder} onChange={handleOutputFolderChange} />
        </Box>

        <ErrorDialog
          open={!!error}
          onClose={handleCloseError}
          title={error?.title || 'Error'}
          message={error?.message || ''}
        />

        <SettingsDialog open={settingsOpen} onClose={() => setSettingsOpen(false)} />

        <HistoryPanel
          open={historyOpen}
          onClose={() => {
            setHistoryOpen(false);
            // Refresh history count
            if (window.api && window.api.getHistory) {
              window.api.getHistory().then((history) => {
                setHistoryCount(history?.length || 0);
              });
            }
          }}
        />

        <QueuePanel
          open={queueOpen}
          onClose={() => setQueueOpen(false)}
          outputFolder={outputFolder}
          defaultMode={defaultSettings.defaultMode}
          defaultFormat={
            defaultSettings.defaultMode === 'audio'
              ? defaultSettings.defaultAudioFormat
              : defaultSettings.defaultVideoFormat
          }
          onQueueComplete={() => {
            // Refresh history count after batch processing
            if (window.api && window.api.getHistory) {
              window.api.getHistory().then((history) => {
                setHistoryCount(history?.length || 0);
              });
            }
          }}
        />
      </Box>
    </ThemeProvider>
  );
}

export default App;
