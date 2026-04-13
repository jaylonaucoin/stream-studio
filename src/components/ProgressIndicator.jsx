import { Box, LinearProgress, Typography, Paper, Button, Chip, Fade, Zoom } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';

function ProgressIndicator({
  progress,
  statusMessage,
  state,
  lastConvertedFile,
  onOpenFileLocation,
  progressSpeed,
  progressEta,
  progressSize,
  playlistInfo,
}) {
  const isActive = state === 'converting' || state === 'completed';
  const isCompleted = state === 'completed';
  const isError = state === 'error';

  return (
    <Paper
      elevation={2}
      sx={{
        p: 3,
        borderRadius: 2,
        bgcolor: 'background.paper',
        transition: 'all 0.2s ease-in-out',
      }}
    >
      {isActive && (
        <Fade in={isActive}>
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, gap: 2 }}>
              <Typography variant="body1" sx={{ flexGrow: 1 }}>
                {statusMessage}
              </Typography>
              {isCompleted && (
                <Chip icon={<CheckCircleIcon />} label="Success" color="success" size="small" />
              )}
            </Box>

            {state === 'converting' && (
              <Box>
                {/* Playlist Info Display */}
                {playlistInfo && (
                  <Box
                    sx={{
                      mb: 2,
                      p: 1.5,
                      borderRadius: 1,
                      bgcolor: 'background.paper',
                      border: 2,
                      borderColor: 'primary.main',
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <Chip
                        label={`Video ${playlistInfo.current} of ${playlistInfo.total}`}
                        size="small"
                        sx={{ bgcolor: 'primary.main', color: 'background.paper' }}
                      />
                      {playlistInfo.currentTitle && (
                        <Typography
                          variant="caption"
                          sx={{
                            color: 'text.primary',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            flexGrow: 1,
                            fontWeight: 500,
                          }}
                          title={playlistInfo.currentTitle}
                        >
                          {playlistInfo.currentTitle}
                        </Typography>
                      )}
                    </Box>
                  </Box>
                )}

                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    mb: 1,
                  }}
                >
                  <LinearProgress
                    variant="determinate"
                    value={progress}
                    sx={{
                      flexGrow: 1,
                      height: 8,
                      borderRadius: 4,
                      mr: 2,
                    }}
                  />
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ minWidth: 50, textAlign: 'right' }}
                  >
                    {progress.toFixed(0)}%
                  </Typography>
                </Box>
                {(progressSpeed || progressEta || progressSize) && (
                  <Box
                    sx={{
                      display: 'flex',
                      gap: 2,
                      flexWrap: 'wrap',
                      mt: 1,
                      pt: 1,
                      borderTop: 1,
                      borderColor: 'divider',
                    }}
                  >
                    {progressSpeed && (
                      <Typography variant="caption" color="text.secondary">
                        Speed: {progressSpeed}
                      </Typography>
                    )}
                    {progressEta && (
                      <Typography variant="caption" color="text.secondary">
                        ETA: {progressEta}
                      </Typography>
                    )}
                    {progressSize && (
                      <Typography variant="caption" color="text.secondary">
                        Size: {progressSize}
                      </Typography>
                    )}
                  </Box>
                )}
              </Box>
            )}

            {isCompleted && (
              <Zoom in={isCompleted}>
                <Box sx={{ textAlign: 'center', py: 2 }}>
                  <CheckCircleIcon
                    sx={{
                      fontSize: 64,
                      color: 'success.main',
                      mb: 1,
                    }}
                  />
                  <Typography variant="h6" color="success.main" gutterBottom>
                    {lastConvertedFile?.isPlaylist
                      ? `Playlist Complete! (${lastConvertedFile.fileCount} videos)`
                      : 'Conversion Complete!'}
                  </Typography>
                </Box>
              </Zoom>
            )}

            {lastConvertedFile && (
              <Box sx={{ mt: 3, pt: 2, borderTop: 1, borderColor: 'divider' }}>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  gutterBottom
                  sx={{ fontWeight: 500 }}
                >
                  {lastConvertedFile.isPlaylist ? 'Playlist saved:' : 'File saved:'}
                </Typography>
                <Box
                  sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1, flexWrap: 'wrap' }}
                >
                  <Typography
                    variant="body2"
                    sx={{
                      flexGrow: 1,
                      fontFamily: 'monospace',
                      fontSize: '0.875rem',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      minWidth: 0,
                    }}
                    title={
                      lastConvertedFile.isPlaylist
                        ? lastConvertedFile.playlistFolderName
                        : lastConvertedFile.fileName
                    }
                  >
                    {lastConvertedFile.isPlaylist
                      ? lastConvertedFile.playlistFolderName
                      : lastConvertedFile.fileName}
                  </Typography>
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<FolderOpenIcon />}
                    onClick={() =>
                      onOpenFileLocation(
                        lastConvertedFile.isPlaylist
                          ? lastConvertedFile.playlistFolder
                          : lastConvertedFile.filePath
                      )
                    }
                  >
                    Open Location
                  </Button>
                </Box>
              </Box>
            )}
          </Box>
        </Fade>
      )}

      {isError && (
        <Fade in={isError}>
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1, gap: 2 }}>
              <Typography variant="body1" sx={{ flexGrow: 1 }}>
                {statusMessage || 'Conversion failed'}
              </Typography>
              <Chip icon={<ErrorIcon />} label="Error" color="error" size="small" />
            </Box>
          </Box>
        </Fade>
      )}

      {!isActive && !isError && state === 'idle' && (
        <Box sx={{ textAlign: 'center', py: 2 }}>
          <Typography variant="body2" color="text.secondary">
            Paste a URL, pick a result in Search, or use the Library tab for local files
          </Typography>
        </Box>
      )}
    </Paper>
  );
}

export default ProgressIndicator;
