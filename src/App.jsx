import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
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
  Snackbar,
  Alert,
} from '@mui/material';
import SettingsIcon from '@mui/icons-material/Settings';
import HistoryIcon from '@mui/icons-material/History';
import QueueIcon from '@mui/icons-material/Queue';
import { getTheme } from './styles/theme';
import ConversionForm from './components/ConversionForm';
import ProgressIndicator from './components/ProgressIndicator';
import LogViewer from './components/LogViewer';
import ErrorDialog from './components/ErrorDialog';
import OutputFolderSelector from './components/OutputFolderSelector';
import SettingsDialog from './components/SettingsDialog';
import HistoryPanel from './components/HistoryPanel';
import QueuePanel from './components/QueuePanel';
import KeyboardShortcutsDialog from './components/KeyboardShortcutsDialog';
import { loadQueueFromStorage, saveQueueToStorage } from './lib/queueStorage';
import { isIpcFailure, historyItemsFromResponse } from './utils/ipcResult';
import logo from '../assets/icon.png';
function App() {
  const [conversionState, setConversionState] = useState('idle'); // idle, converting, completed, error
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');
  const [progressSpeed, setProgressSpeed] = useState(null);
  const [progressEta, setProgressEta] = useState(null);
  const [progressSize, setProgressSize] = useState(null);
  const [logs, setLogs] = useState([]);
  const [logsVisible, setLogsVisible] = useState(false);
  const [error, setError] = useState(null);
  const [outputFolder, setOutputFolder] = useState('');
  const [lastConvertedFile, setLastConvertedFile] = useState(null);
  const [playlistInfo, setPlaylistInfo] = useState(null); // For playlist progress tracking
  const [ffmpegAvailable, setFfmpegAvailable] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [queueOpen, setQueueOpen] = useState(false);
  const [conversionInputMode, setConversionInputMode] = useState('search');
  const [historyCount, setHistoryCount] = useState(0);
  const [appVersion, setAppVersion] = useState('');
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [defaultSettings, setDefaultSettings] = useState({
    defaultMode: 'audio',
    defaultAudioFormat: 'mp3',
    defaultVideoFormat: 'mp4',
    defaultQuality: 'best',
    defaultSearchSite: 'youtube',
    defaultSearchLimit: 15,
  });
  const addToQueueRef = useRef(null);
  const queueBootstrap = useMemo(() => loadQueueFromStorage(), []);
  const [queue, setQueue] = useState(queueBootstrap.items);
  const [queueStorageSnackbar, setQueueStorageSnackbar] = useState({
    open: false,
    message: '',
  });
  const [themeMode, setThemeMode] = useState('dark');
  const [systemPrefersDark, setSystemPrefersDark] = useState(
    () =>
      (typeof window !== 'undefined' &&
        window.matchMedia?.('(prefers-color-scheme: dark)')?.matches) ??
      true
  );

  // Resolve theme: 'system' -> actual 'dark' or 'light' from OS preference
  const resolvedTheme = themeMode === 'system' ? (systemPrefersDark ? 'dark' : 'light') : themeMode;

  useEffect(() => {
    if (queueBootstrap.loadError) {
      console.warn('Queue storage:', queueBootstrap.loadError);
      setQueueStorageSnackbar({ open: true, message: queueBootstrap.loadError });
    }
  }, [queueBootstrap.loadError]);

  useEffect(() => {
    const { success, error } = saveQueueToStorage(queue);
    if (!success && error) {
      console.warn('Queue storage:', error);
      setQueueStorageSnackbar({ open: true, message: error });
    }
  }, [queue]);

  // Listen for system preference changes when theme is 'system'
  useEffect(() => {
    if (themeMode !== 'system') return;
    const mq = window.matchMedia?.('(prefers-color-scheme: dark)');
    if (!mq) return;
    const handler = (e) => setSystemPrefersDark(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [themeMode]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ctrl+K or Cmd+K to open shortcuts
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setShortcutsOpen(true);
      }
      // Ctrl+H or Cmd+H to open history
      if ((e.ctrlKey || e.metaKey) && e.key === 'h') {
        e.preventDefault();
        setHistoryOpen(true);
      }
      // Ctrl+B or Cmd+B to open batch queue (Cmd+Q is reserved for quit on macOS)
      if ((e.ctrlKey || e.metaKey) && e.key === 'b' && !e.shiftKey) {
        e.preventDefault();
        setQueueOpen(true);
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'b' && e.shiftKey) {
        e.preventDefault();
        setConversionInputMode('batch-local');
      }
      // Ctrl+, or Cmd+, to open settings
      if ((e.ctrlKey || e.metaKey) && e.key === ',') {
        e.preventDefault();
        setSettingsOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

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
          setFfmpegAvailable(!!result?.available);
        } catch (err) {
          console.error('Failed to check FFmpeg:', err);
          setFfmpegAvailable(false);
        }
      }
    };

    const loadSettings = async () => {
      if (window.api && window.api.getSettings) {
        try {
          const settings = await window.api.getSettings();
          if (isIpcFailure(settings)) {
            console.error('Failed to load settings:', settings.error);
            return;
          }
          setDefaultSettings({
            defaultMode: settings.defaultMode || 'audio',
            defaultAudioFormat: settings.defaultAudioFormat || 'mp3',
            defaultVideoFormat: settings.defaultVideoFormat || 'mp4',
            defaultQuality: settings.defaultQuality || 'best',
            defaultSearchSite: settings.defaultSearchSite || 'youtube',
            defaultSearchLimit: settings.defaultSearchLimit ?? 15,
          });
          setThemeMode(settings.theme || 'dark');
        } catch (err) {
          console.error('Failed to load settings:', err);
        }
      }
    };

    const loadHistoryCount = async () => {
      if (window.api && window.api.getHistory) {
        try {
          const res = await window.api.getHistory();
          const items = historyItemsFromResponse(res);
          setHistoryCount(items.length);
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
      case 'playlist-progress':
      case 'chapter-progress':
      case 'segment-progress':
        if (data.percent !== undefined) {
          setProgress(data.percent);

          // Handle playlist progress
          if (data.type === 'playlist-progress' && data.playlistInfo) {
            setPlaylistInfo(data.playlistInfo);
            const { current, total, currentTitle } = data.playlistInfo;
            let message = `Downloading playlist: Video ${current} of ${total}`;
            if (currentTitle) {
              message += ` - ${currentTitle}`;
            }
            message += ` (${data.percent.toFixed(1)}%)`;
            if (data.speed) {
              message += ` @ ${data.speed}`;
            }
            if (data.eta) {
              message += ` (ETA: ${data.eta})`;
            }
            setStatusMessage(message);
          } else if (data.type === 'chapter-progress') {
            // Chapter download progress
            let message = `Downloading chapters... ${data.percent.toFixed(1)}%`;
            if (data.speed) {
              message += ` @ ${data.speed}`;
            }
            if (data.eta) {
              message += ` (ETA: ${data.eta})`;
            }
            setStatusMessage(message);
            setPlaylistInfo(null); // Clear playlist info for chapters
          } else if (data.type === 'segment-progress') {
            // Manual segment splitting progress
            let message = data.message || `Splitting segments... ${data.percent.toFixed(1)}%`;
            setStatusMessage(message);
            setPlaylistInfo(null); // Clear playlist info for segments
          } else {
            // Regular single video progress
            let message = `Converting... ${data.percent.toFixed(1)}%`;
            if (data.speed) {
              message += ` @ ${data.speed}`;
            }
            if (data.eta) {
              message += ` (ETA: ${data.eta})`;
            }
            setStatusMessage(message);
            setPlaylistInfo(null); // Clear playlist info for single videos
          }

          // Update progress details
          setProgressSpeed(data.speed || null);
          setProgressEta(data.eta || null);
          setProgressSize(data.size || null);
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
        setProgressSpeed(null);
        setProgressEta(null);
        setProgressSize(null);
        setPlaylistInfo(null);
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
        window.api.offProgress(handleProgress);
      }
    };
  }, [handleProgress]);

  const handleConvert = useCallback(
    async (url, options = {}) => {
      const isLocal = options.source === 'local';
      if (conversionState === 'converting') return;
      if (!isLocal && !url) return;
      if (isLocal && !options.filePath) return;

      setConversionState('converting');
      setProgress(0);
      const isPlaylist = options.playlistMode === 'full' || options.playlistMode === 'selected';
      const chapterDownloadMode = options.chapterDownloadMode || 'split';
      const isChapters =
        chapterDownloadMode === 'split' && options.chapters && options.chapters.length > 0;
      const isFullVideoWithChapters =
        chapterDownloadMode === 'full' && options.chapterDownloadMode !== undefined;
      const isManualSegments = options.manualSegments && options.manualSegments.length > 0;
      setStatusMessage(
        options.source === 'local'
          ? 'Converting local file...'
          : isPlaylist
            ? 'Starting playlist download...'
            : isManualSegments
              ? 'Starting segmented download...'
              : isChapters
                ? 'Starting chapter download...'
                : isFullVideoWithChapters
                  ? 'Downloading full video...'
                  : 'Starting conversion...'
      );
      setProgressSpeed(null);
      setProgressEta(null);
      setProgressSize(null);
      setLogs([]);
      setError(null);
      setLastConvertedFile(null);
      setPlaylistInfo(null);

      try {
        const convertOptions = {
          outputFolder,
          mode: options.mode || 'audio',
          format: options.format || 'mp3',
          quality: options.quality || 'best',
          playlistMode: options.playlistMode || 'single',
          selectedVideos: options.selectedVideos || null,
          chapters: options.chapters || null,
          chapterDownloadMode: options.chapterDownloadMode || null,
          chapterInfo: options.chapterInfo || null,
          manualSegments: options.manualSegments || null,
          useSharedArtistForSegments: options.useSharedArtistForSegments !== false,
          customMetadata: options.customMetadata || null,
          startTime: options.startTime || null,
          endTime: options.endTime || null,
        };

        const result =
          options.source === 'local'
            ? await window.api.convertLocalFile(options.filePath, convertOptions)
            : await window.api.convert(url, convertOptions);

        if (result.success) {
          setProgress(100);
          if (result.isPlaylist) {
            setStatusMessage(`Playlist download complete! ${result.fileCount} videos downloaded.`);
          } else if (result.isSegments) {
            setStatusMessage(
              `Segment download complete! ${result.fileCount} segment${result.fileCount > 1 ? 's' : ''} created.`
            );
          } else if (result.isChapters) {
            setStatusMessage(
              `Chapter download complete! ${result.fileCount} chapter${result.fileCount > 1 ? 's' : ''} downloaded.`
            );
          } else {
            setStatusMessage('Conversion complete!');
          }
          setConversionState('completed');
          setLastConvertedFile(result);
          setLogs((prev) => [
            ...prev,
            {
              type: 'success',
              message: result.isPlaylist
                ? `✓ Playlist download completed successfully (${result.fileCount} videos)`
                : result.isSegments
                  ? `✓ Segment download completed successfully (${result.fileCount} segment${result.fileCount > 1 ? 's' : ''})`
                  : result.isChapters
                    ? `✓ Chapter download completed successfully (${result.fileCount} chapter${result.fileCount > 1 ? 's' : ''})`
                    : '✓ Conversion completed successfully',
              timestamp: Date.now(),
            },
          ]);
          // Update history count
          setHistoryCount((prev) => prev + (result.fileCount || 1));
        }
      } catch (error) {
        // User-initiated cancellation - don't show error modal
        if (error?.message === 'Conversion was cancelled') {
          setConversionState('idle');
          setProgress(0);
          setStatusMessage('Cancelled');
          return;
        }
        setConversionState('error');
        const isPlaylist = options.playlistMode === 'full' || options.playlistMode === 'selected';
        const chapterDownloadMode = options.chapterDownloadMode || 'split';
        const isChapters =
          chapterDownloadMode === 'split' && options.chapters && options.chapters.length > 0;
        const isManualSegments = options.manualSegments && options.manualSegments.length > 0;
        setStatusMessage(
          isPlaylist
            ? 'Playlist download failed'
            : isManualSegments
              ? 'Segment download failed'
              : isChapters
                ? 'Chapter download failed'
                : 'Conversion failed'
        );
        setPlaylistInfo(null);
        setError({
          title: isPlaylist
            ? 'Playlist Download Failed'
            : isManualSegments
              ? 'Segment Download Failed'
              : isChapters
                ? 'Chapter Download Failed'
                : 'Conversion Failed',
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

  const registerAddToQueue = useCallback((fn) => {
    addToQueueRef.current = fn;
  }, []);

  const handleAddToQueue = useCallback((urlOrItem) => {
    addToQueueRef.current?.(urlOrItem);
  }, []);

  return (
    <ThemeProvider theme={getTheme(resolvedTheme)}>
      <CssBaseline />
      <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <AppBar position="static" elevation={1}>
          <Toolbar>
            <img src={logo} alt="Stream Studio" style={{ width: 32, height: 32, marginRight: 8 }} />
            <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
              Stream Studio
            </Typography>
            {appVersion && (
              <Chip
                label={`v${appVersion}`}
                size="small"
                variant="outlined"
                sx={{ mr: 2, opacity: 0.7, borderColor: 'rgba(255,255,255,0.3)', color: 'inherit' }}
              />
            )}
            <Tooltip title="Batch Queue (Ctrl+B)">
              <IconButton
                color="inherit"
                onClick={() => setQueueOpen(true)}
                sx={{ mr: 1 }}
                aria-label="Open batch queue"
              >
                <Badge badgeContent={queue.length || null} color="primary" max={99}>
                  <QueueIcon />
                </Badge>
              </IconButton>
            </Tooltip>
            <Tooltip title={`Conversion History (Ctrl+H) - ${historyCount} items`}>
              <IconButton
                color="inherit"
                onClick={() => setHistoryOpen(true)}
                sx={{ mr: 1 }}
                aria-label={`Open conversion history, ${historyCount} items`}
              >
                <Badge badgeContent={historyCount} color="error" max={99}>
                  <HistoryIcon />
                </Badge>
              </IconButton>
            </Tooltip>
            <Tooltip title="Settings (Ctrl+,)">
              <IconButton
                color="inherit"
                onClick={() => setSettingsOpen(true)}
                aria-label="Open settings"
              >
                <SettingsIcon />
              </IconButton>
            </Tooltip>
          </Toolbar>
        </AppBar>

        <Container
          maxWidth={conversionInputMode === 'batch-local' ? 'lg' : 'md'}
          sx={{ flexGrow: 1, py: 4 }}
        >
          <ConversionForm
            onConvert={handleConvert}
            onCancel={handleCancel}
            isConverting={conversionState === 'converting'}
            disabled={!ffmpegAvailable}
            defaultMode={defaultSettings.defaultMode}
            defaultAudioFormat={defaultSettings.defaultAudioFormat}
            defaultVideoFormat={defaultSettings.defaultVideoFormat}
            defaultQuality={defaultSettings.defaultQuality}
            defaultSearchSite={defaultSettings.defaultSearchSite}
            defaultSearchLimit={defaultSettings.defaultSearchLimit}
            onAddToQueue={handleAddToQueue}
            inputMode={conversionInputMode}
            onInputModeChange={setConversionInputMode}
            outputFolder={outputFolder}
            onLocalBatchComplete={() => {
              if (window.api && window.api.getHistory) {
                window.api.getHistory().then((res) => {
                  setHistoryCount(historyItemsFromResponse(res).length);
                });
              }
            }}
          />

          <Box sx={{ mt: 4 }}>
            <ProgressIndicator
              progress={progress}
              statusMessage={statusMessage}
              state={conversionState}
              lastConvertedFile={lastConvertedFile}
              onOpenFileLocation={handleOpenFileLocation}
              progressSpeed={progressSpeed}
              progressEta={progressEta}
              progressSize={progressSize}
              playlistInfo={playlistInfo}
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

        <SettingsDialog
          open={settingsOpen}
          onClose={() => setSettingsOpen(false)}
          onSettingsSaved={(settings) => {
            setThemeMode(settings?.theme || 'dark');
            setDefaultSettings((prev) => ({
              ...prev,
              defaultMode: settings?.defaultMode || prev.defaultMode,
              defaultAudioFormat: settings?.defaultAudioFormat || prev.defaultAudioFormat,
              defaultVideoFormat: settings?.defaultVideoFormat || prev.defaultVideoFormat,
              defaultQuality: settings?.defaultQuality || prev.defaultQuality,
              defaultSearchSite: settings?.defaultSearchSite || prev.defaultSearchSite,
              defaultSearchLimit: settings?.defaultSearchLimit ?? prev.defaultSearchLimit,
            }));
          }}
        />

        <HistoryPanel
          open={historyOpen}
          onClose={() => {
            setHistoryOpen(false);
            // Refresh history count
            if (window.api && window.api.getHistory) {
              window.api.getHistory().then((res) => {
                setHistoryCount(historyItemsFromResponse(res).length);
              });
            }
          }}
        />

        <QueuePanel
          open={queueOpen}
          onClose={() => setQueueOpen(false)}
          queue={queue}
          setQueue={setQueue}
          onRegisterAddToQueue={registerAddToQueue}
          outputFolder={outputFolder}
          defaultMode={defaultSettings.defaultMode}
          defaultFormat={
            defaultSettings.defaultMode === 'audio'
              ? defaultSettings.defaultAudioFormat
              : defaultSettings.defaultVideoFormat
          }
          defaultQuality={defaultSettings.defaultQuality}
          defaultSearchSite={defaultSettings.defaultSearchSite}
          defaultSearchLimit={defaultSettings.defaultSearchLimit}
          onQueueComplete={() => {
            if (window.api && window.api.getHistory) {
              window.api.getHistory().then((res) => {
                setHistoryCount(historyItemsFromResponse(res).length);
              });
            }
          }}
        />

        <KeyboardShortcutsDialog open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />

        <Snackbar
          open={queueStorageSnackbar.open}
          autoHideDuration={8000}
          onClose={() => setQueueStorageSnackbar((s) => ({ ...s, open: false }))}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <Alert
            severity="warning"
            variant="filled"
            onClose={() => setQueueStorageSnackbar((s) => ({ ...s, open: false }))}
            sx={{ width: '100%' }}
          >
            {queueStorageSnackbar.message}
          </Alert>
        </Snackbar>
      </Box>
    </ThemeProvider>
  );
}

export default App;
