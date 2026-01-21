/**
 * Custom hook for conversion state and progress
 */
import { useState, useEffect, useCallback } from 'react';

/**
 * Conversion states
 */
export const CONVERSION_STATES = {
  IDLE: 'idle',
  CONVERTING: 'converting',
  COMPLETED: 'completed',
  ERROR: 'error',
};

/**
 * Hook for managing conversion state and progress
 * @returns {Object} Conversion state and methods
 */
export function useConversion() {
  const [state, setState] = useState(CONVERSION_STATES.IDLE);
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');
  const [progressSpeed, setProgressSpeed] = useState(null);
  const [progressEta, setProgressEta] = useState(null);
  const [progressSize, setProgressSize] = useState(null);
  const [playlistInfo, setPlaylistInfo] = useState(null);
  const [logs, setLogs] = useState([]);
  const [error, setError] = useState(null);
  const [lastConvertedFile, setLastConvertedFile] = useState(null);

  // Handle progress events
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
            if (data.speed) message += ` @ ${data.speed}`;
            if (data.eta) message += ` (ETA: ${data.eta})`;
            setStatusMessage(message);
          } else if (data.type === 'chapter-progress') {
            let message = `Downloading chapters... ${data.percent.toFixed(1)}%`;
            if (data.speed) message += ` @ ${data.speed}`;
            if (data.eta) message += ` (ETA: ${data.eta})`;
            setStatusMessage(message);
            setPlaylistInfo(null);
          } else if (data.type === 'segment-progress') {
            let message = data.message || `Splitting segments... ${data.percent.toFixed(1)}%`;
            setStatusMessage(message);
            setPlaylistInfo(null);
          } else {
            let message = `Converting... ${data.percent.toFixed(1)}%`;
            if (data.speed) message += ` @ ${data.speed}`;
            if (data.eta) message += ` (ETA: ${data.eta})`;
            setStatusMessage(message);
            setPlaylistInfo(null);
          }

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
        setState(CONVERSION_STATES.IDLE);
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
    if (window.api?.onProgress) {
      window.api.onProgress(handleProgress);
    }

    return () => {
      if (window.api?.offProgress) {
        window.api.offProgress();
      }
    };
  }, [handleProgress]);

  // Start conversion
  const startConversion = useCallback((options = {}) => {
    setState(CONVERSION_STATES.CONVERTING);
    setProgress(0);
    setStatusMessage(options.initialMessage || 'Starting conversion...');
    setProgressSpeed(null);
    setProgressEta(null);
    setProgressSize(null);
    setLogs([]);
    setError(null);
    setLastConvertedFile(null);
    setPlaylistInfo(null);
  }, []);

  // Complete conversion
  const completeConversion = useCallback((result) => {
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
    setState(CONVERSION_STATES.COMPLETED);
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
  }, []);

  // Fail conversion
  const failConversion = useCallback((errorMessage, title = 'Conversion Failed') => {
    setState(CONVERSION_STATES.ERROR);
    setStatusMessage(title);
    setPlaylistInfo(null);
    setError({ title, message: errorMessage });
    setLogs((prev) => [
      ...prev,
      { type: 'error', message: `✗ Error: ${errorMessage}`, timestamp: Date.now() },
    ]);
  }, []);

  // Reset conversion state
  const resetConversion = useCallback(() => {
    setState(CONVERSION_STATES.IDLE);
    setProgress(0);
    setStatusMessage('');
    setProgressSpeed(null);
    setProgressEta(null);
    setProgressSize(null);
    setPlaylistInfo(null);
  }, []);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Clear logs
  const clearLogs = useCallback(() => {
    setLogs([]);
  }, []);

  return {
    // State
    state,
    isConverting: state === CONVERSION_STATES.CONVERTING,
    isCompleted: state === CONVERSION_STATES.COMPLETED,
    isError: state === CONVERSION_STATES.ERROR,
    isIdle: state === CONVERSION_STATES.IDLE,
    progress,
    statusMessage,
    progressSpeed,
    progressEta,
    progressSize,
    playlistInfo,
    logs,
    error,
    lastConvertedFile,
    // Methods
    startConversion,
    completeConversion,
    failConversion,
    resetConversion,
    clearError,
    clearLogs,
  };
}

export default useConversion;
