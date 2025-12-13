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
              {isError && <Chip icon={<ErrorIcon />} label="Error" color="error" size="small" />}
            </Box>

            {state === 'converting' && (
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
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
                  <Typography variant="body2" color="text.secondary" sx={{ minWidth: 50, textAlign: 'right' }}>
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
                    Conversion Complete!
                  </Typography>
                </Box>
              </Zoom>
            )}

            {lastConvertedFile && (
              <Box sx={{ mt: 3, pt: 2, borderTop: 1, borderColor: 'divider' }}>
                <Typography variant="body2" color="text.secondary" gutterBottom sx={{ fontWeight: 500 }}>
                  File saved:
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1, flexWrap: 'wrap' }}>
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
                    title={lastConvertedFile.fileName}
                  >
                    {lastConvertedFile.fileName}
                  </Typography>
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<FolderOpenIcon />}
                    onClick={() => onOpenFileLocation(lastConvertedFile.filePath)}
                  >
                    Open Location
                  </Button>
                </Box>
              </Box>
            )}
          </Box>
        </Fade>
      )}

      {!isActive && state === 'idle' && (
        <Box sx={{ textAlign: 'center', py: 2 }}>
          <Typography variant="body2" color="text.secondary">
            Enter a video URL above to start conversion
          </Typography>
        </Box>
      )}
    </Paper>
  );
}

export default ProgressIndicator;
