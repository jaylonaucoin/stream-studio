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
              <LinearProgress
                variant="determinate"
                value={progress}
                sx={{
                  height: 8,
                  borderRadius: 4,
                  mb: 1,
                }}
              />
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
              <Box sx={{ mt: 2, pt: 2, borderTop: 1, borderColor: 'divider' }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  File saved:
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                  <Typography
                    variant="body2"
                    sx={{
                      flexGrow: 1,
                      fontFamily: 'monospace',
                      fontSize: '0.875rem',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
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
            Enter a YouTube URL above to start conversion
          </Typography>
        </Box>
      )}
    </Paper>
  );
}

export default ProgressIndicator;
