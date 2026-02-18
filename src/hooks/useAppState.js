/**
 * Custom hook for application state management
 * Handles settings, history, and app-level state
 */
import { useState, useEffect, useCallback } from 'react';

/**
 * Default settings
 */
const DEFAULT_SETTINGS = {
  defaultMode: 'audio',
  defaultAudioFormat: 'mp3',
  defaultVideoFormat: 'mp4',
  defaultQuality: 'best',
};

/**
 * Hook for managing application state (settings, history, etc.)
 * @returns {Object} App state and methods
 */
export function useAppState() {
  const [outputFolder, setOutputFolder] = useState('');
  const [ffmpegAvailable, setFfmpegAvailable] = useState(true);
  const [historyCount, setHistoryCount] = useState(0);
  const [appVersion, setAppVersion] = useState('');
  const [defaultSettings, setDefaultSettings] = useState(DEFAULT_SETTINGS);

  // Load initial state
  useEffect(() => {
    const loadInitialState = async () => {
      // Load output folder
      if (window.api?.getOutputFolder) {
        try {
          const folder = await window.api.getOutputFolder();
          setOutputFolder(folder);
        } catch (err) {
          console.error('Failed to load output folder:', err);
          setOutputFolder('Downloads');
        }
      }

      // Check FFmpeg
      if (window.api?.checkFfmpeg) {
        try {
          const result = await window.api.checkFfmpeg();
          setFfmpegAvailable(result.available);
        } catch (err) {
          console.error('Failed to check FFmpeg:', err);
        }
      }

      // Load settings
      if (window.api?.getSettings) {
        try {
          const settings = await window.api.getSettings();
          setDefaultSettings({
            defaultMode: settings.defaultMode || 'audio',
            defaultAudioFormat: settings.defaultAudioFormat || 'mp3',
            defaultVideoFormat: settings.defaultVideoFormat || 'mp4',
            defaultQuality: settings.defaultQuality || 'best',
          });
        } catch (err) {
          console.error('Failed to load settings:', err);
        }
      }

      // Load history count
      if (window.api?.getHistory) {
        try {
          const history = await window.api.getHistory();
          setHistoryCount(history?.length || 0);
        } catch (err) {
          console.error('Failed to load history:', err);
        }
      }

      // Load version
      if (window.api?.getAppVersion) {
        try {
          const version = await window.api.getAppVersion();
          setAppVersion(version);
        } catch (err) {
          console.error('Failed to load version:', err);
        }
      }
    };

    loadInitialState();
  }, []);

  // Change output folder
  const changeOutputFolder = useCallback(async () => {
    if (window.api?.chooseOutput) {
      try {
        const result = await window.api.chooseOutput();
        if (result.success && result.folder) {
          setOutputFolder(result.folder);
          return { success: true, folder: result.folder };
        }
      } catch (error) {
        return { success: false, error: error.message };
      }
    }
    return { success: false };
  }, []);

  // Refresh history count
  const refreshHistoryCount = useCallback(async () => {
    if (window.api?.getHistory) {
      try {
        const history = await window.api.getHistory();
        setHistoryCount(history?.length || 0);
      } catch (err) {
        console.error('Failed to refresh history:', err);
      }
    }
  }, []);

  // Update history count (for increment after conversion)
  const updateHistoryCount = useCallback((delta = 1) => {
    setHistoryCount((prev) => prev + delta);
  }, []);

  return {
    // State
    outputFolder,
    ffmpegAvailable,
    historyCount,
    appVersion,
    defaultSettings,
    // Methods
    changeOutputFolder,
    refreshHistoryCount,
    updateHistoryCount,
  };
}

export default useAppState;
