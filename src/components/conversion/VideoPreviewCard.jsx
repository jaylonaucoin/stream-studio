import { useState, useCallback, useRef, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  IconButton,
  Tooltip,
  Chip,
  LinearProgress,
  Alert,
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import PersonIcon from '@mui/icons-material/Person';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import EditIcon from '@mui/icons-material/Edit';
import ThumbnailWithFallback from '../ThumbnailWithFallback';

/**
 * VideoPreviewCard - Displays single video preview information with audio preview
 */
function VideoPreviewCard({
  videoInfo,
  chapterInfo,
  customMetadata,
  onEditMetadata,
  disabled,
  isConverting,
}) {
  const [playing, setPlaying] = useState(false);
  const [loadingAudio, setLoadingAudio] = useState(false);
  const [audioProgress, setAudioProgress] = useState(0);
  const [audioError, setAudioError] = useState(null);
  const audioRef = useRef(null);

  const stopAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.removeAttribute('src');
      audioRef.current.load();
      audioRef.current = null;
    }
    setPlaying(false);
    setAudioProgress(0);
  }, []);

  useEffect(() => {
    return () => stopAudio();
  }, [stopAudio]);

  const handlePlayPause = useCallback(async () => {
    if (disabled || isConverting || !videoInfo?.webpageUrl) return;

    setAudioError(null);

    if (playing && audioRef.current) {
      audioRef.current.pause();
      setPlaying(false);
      return;
    }

    if (audioRef.current) {
      try {
        await audioRef.current.play();
        setPlaying(true);
      } catch {
        setAudioError('Could not resume preview. Please try again.');
        stopAudio();
      }
      return;
    }

    setLoadingAudio(true);
    try {
      const response = await window.api?.getAudioStreamUrl?.(videoInfo.webpageUrl);

      if (!response?.success || !response.url) {
        throw new Error(response?.error || 'Could not get audio stream.');
      }

      const newAudio = new Audio(response.url);
      audioRef.current = newAudio;

      newAudio.addEventListener('timeupdate', () => {
        if (newAudio.duration > 0) {
          setAudioProgress((newAudio.currentTime / newAudio.duration) * 100);
        }
      });

      newAudio.addEventListener('ended', () => {
        setPlaying(false);
        setAudioProgress(0);
        audioRef.current = null;
      });

      newAudio.addEventListener('error', () => {
        setAudioError('Preview not available for this site.');
        setPlaying(false);
        setAudioProgress(0);
        audioRef.current = null;
      });

      await newAudio.play();
      setPlaying(true);
    } catch {
      setAudioError('Preview not available for this site.');
      stopAudio();
    } finally {
      setLoadingAudio(false);
    }
  }, [playing, disabled, isConverting, videoInfo?.webpageUrl, stopAudio]);

  const canPreview = !!videoInfo?.webpageUrl && !disabled && !isConverting;

  return (
    <Paper
      elevation={1}
      sx={{
        p: 2,
        mb: 2,
        borderRadius: 2,
        bgcolor: 'background.paper',
        border: 1,
        borderColor: 'divider',
      }}
    >
      <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', sm: 'row' } }}>
        <Box sx={{ position: 'relative', flexShrink: 0 }}>
          <ThumbnailWithFallback
            thumbnail={videoInfo.thumbnail}
            alt={videoInfo.title}
            isPlaylist={false}
          />
          {canPreview && (
            <Tooltip title={playing ? 'Pause preview' : 'Play preview'}>
              <IconButton
                onClick={handlePlayPause}
                disabled={loadingAudio}
                sx={{
                  position: 'absolute',
                  bottom: 8,
                  left: 8,
                  bgcolor: 'rgba(0,0,0,0.6)',
                  color: 'white',
                  '&:hover': { bgcolor: 'rgba(0,0,0,0.8)' },
                }}
                aria-label={playing ? 'Pause preview' : 'Play preview'}
              >
                {loadingAudio ? (
                  <Box component="span" sx={{ width: 24, height: 24, display: 'block' }} />
                ) : playing ? (
                  <PauseIcon fontSize="small" />
                ) : (
                  <PlayArrowIcon fontSize="small" />
                )}
              </IconButton>
            </Tooltip>
          )}
        </Box>
        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, mb: 1 }}>
            <PlayArrowIcon sx={{ color: 'primary.main', mt: 0.5, flexShrink: 0 }} />
            <Typography
              variant="subtitle1"
              sx={{
                fontWeight: 600,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                flexGrow: 1,
              }}
            >
              {videoInfo.title}
            </Typography>
            {!chapterInfo?.hasChapters && (
              <Tooltip title="Edit Metadata">
                <IconButton
                  size="small"
                  onClick={onEditMetadata}
                  disabled={isConverting || disabled}
                  sx={{ flexShrink: 0 }}
                >
                  <EditIcon />
                </IconButton>
              </Tooltip>
            )}
          </Box>

          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, mt: 1 }}>
            {videoInfo.durationFormatted && (
              <Chip
                icon={<AccessTimeIcon />}
                label={videoInfo.durationFormatted}
                size="small"
                variant="outlined"
              />
            )}
            {videoInfo.uploader && (
              <Chip
                icon={<PersonIcon />}
                label={videoInfo.uploader}
                size="small"
                variant="outlined"
              />
            )}
            {chapterInfo?.hasChapters && (
              <Chip
                icon={<PlayArrowIcon />}
                label={`${chapterInfo.totalChapters} chapters`}
                size="small"
                variant="outlined"
                color="primary"
              />
            )}
            {customMetadata && (
              <Chip
                icon={<EditIcon />}
                label="Custom Metadata"
                size="small"
                color="primary"
                variant="outlined"
              />
            )}
          </Box>

          {audioError && (
            <Alert severity="info" sx={{ mt: 1.5, py: 0.5 }} onClose={() => setAudioError(null)}>
              {audioError}
            </Alert>
          )}
          {playing && (
            <LinearProgress
              variant="determinate"
              value={audioProgress}
              sx={{ mt: 1.5, height: 4, borderRadius: 2 }}
            />
          )}
        </Box>
      </Box>
    </Paper>
  );
}

export default VideoPreviewCard;
