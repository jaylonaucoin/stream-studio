import {
  Box,
  LinearProgress,
  Typography,
  Paper,
  Button,
  Chip,
  Fade,
  Zoom,
  alpha,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import DownloadingIcon from '@mui/icons-material/Downloading';
import HourglassTopIcon from '@mui/icons-material/HourglassTop';
import { colors } from '../styles/theme';

function ProgressIndicator({
  progress,
  statusMessage,
  state,
  lastConvertedFile,
  onOpenFileLocation,
}) {
  const isConverting = state === 'converting';
  const isCompleted = state === 'completed';
  const isError = state === 'error';
  const isIdle = state === 'idle';

  return (
    <Paper
      elevation={0}
      sx={{
        p: 3,
        borderRadius: 3,
        bgcolor: alpha(colors.background.card, 0.6),
        backdropFilter: 'blur(20px)',
        border: `1px solid ${colors.divider}`,
        transition: 'all 0.3s ease',
        position: 'relative',
        overflow: 'hidden',
        minHeight: 120,
      }}
    >
      {/* Background Glow for Active States */}
      {isConverting && (
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            background: `radial-gradient(ellipse at center, ${alpha(colors.primary.main, 0.1)} 0%, transparent 70%)`,
            animation: 'pulse 2s ease-in-out infinite',
            '@keyframes pulse': {
              '0%, 100%': { opacity: 0.5 },
              '50%': { opacity: 1 },
            },
          }}
        />
      )}

      {isCompleted && (
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            background: `radial-gradient(ellipse at center, ${alpha(colors.success.main, 0.08)} 0%, transparent 70%)`,
          }}
        />
      )}

      {isError && (
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            background: `radial-gradient(ellipse at center, ${alpha(colors.error.main, 0.08)} 0%, transparent 70%)`,
          }}
        />
      )}

      {/* Converting State */}
      {isConverting && (
        <Fade in={isConverting}>
          <Box sx={{ position: 'relative', zIndex: 1 }}>
            {/* Header */}
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 3, gap: 2 }}>
              <Box
                sx={{
                  width: 48,
                  height: 48,
                  borderRadius: 2,
                  bgcolor: alpha(colors.primary.main, 0.15),
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <DownloadingIcon
                  sx={{
                    fontSize: 28,
                    color: 'primary.main',
                    animation: 'bounce 1s ease-in-out infinite',
                    '@keyframes bounce': {
                      '0%, 100%': { transform: 'translateY(0)' },
                      '50%': { transform: 'translateY(-3px)' },
                    },
                  }}
                />
              </Box>
              <Box sx={{ flexGrow: 1 }}>
                <Typography variant="h6" fontWeight={600}>
                  Converting...
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {statusMessage || 'Processing your media'}
                </Typography>
              </Box>
              <Chip
                label={`${progress.toFixed(0)}%`}
                color="primary"
                sx={{
                  fontWeight: 700,
                  fontSize: '1rem',
                  height: 36,
                  minWidth: 70,
                }}
              />
            </Box>

            {/* Progress Bar */}
            <Box sx={{ position: 'relative' }}>
              <LinearProgress
                variant="determinate"
                value={progress}
                sx={{
                  height: 12,
                  borderRadius: 2,
                  bgcolor: alpha(colors.primary.main, 0.1),
                  '& .MuiLinearProgress-bar': {
                    borderRadius: 2,
                    background: colors.gradients.primary,
                    boxShadow: `0 0 20px ${alpha(colors.primary.main, 0.5)}`,
                  },
                }}
              />
              {/* Animated Shimmer */}
              <Box
                sx={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  borderRadius: 2,
                  overflow: 'hidden',
                  pointerEvents: 'none',
                  '&::after': {
                    content: '""',
                    position: 'absolute',
                    top: 0,
                    left: '-100%',
                    width: '100%',
                    height: '100%',
                    background:
                      'linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)',
                    animation: 'shimmer 2s infinite',
                  },
                  '@keyframes shimmer': {
                    '0%': { left: '-100%' },
                    '100%': { left: '100%' },
                  },
                }}
              />
            </Box>
          </Box>
        </Fade>
      )}

      {/* Completed State */}
      {isCompleted && (
        <Fade in={isCompleted}>
          <Box sx={{ position: 'relative', zIndex: 1 }}>
            {/* Success Animation */}
            <Box sx={{ textAlign: 'center', mb: 3 }}>
              <Zoom in={isCompleted} style={{ transitionDelay: '100ms' }}>
                <Box
                  sx={{
                    width: 80,
                    height: 80,
                    borderRadius: '50%',
                    bgcolor: alpha(colors.success.main, 0.15),
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mx: 'auto',
                    mb: 2,
                    boxShadow: `0 0 30px ${alpha(colors.success.main, 0.3)}`,
                    animation: 'scaleIn 0.3s ease-out',
                    '@keyframes scaleIn': {
                      from: { transform: 'scale(0.5)', opacity: 0 },
                      to: { transform: 'scale(1)', opacity: 1 },
                    },
                  }}
                >
                  <CheckCircleIcon
                    sx={{
                      fontSize: 48,
                      color: 'success.main',
                    }}
                  />
                </Box>
              </Zoom>
              <Typography variant="h5" color="success.main" fontWeight={700} gutterBottom>
                Conversion Complete!
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Your file is ready
              </Typography>
            </Box>

            {/* File Info Card */}
            {lastConvertedFile && (
              <Fade in style={{ transitionDelay: '200ms' }}>
                <Box
                  sx={{
                    p: 2,
                    borderRadius: 2,
                    bgcolor: alpha(colors.background.default, 0.5),
                    border: `1px solid ${colors.divider}`,
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                    <Box
                      sx={{
                        width: 44,
                        height: 44,
                        borderRadius: 1.5,
                        bgcolor: alpha(colors.primary.main, 0.1),
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <InsertDriveFileIcon sx={{ color: 'primary.main' }} />
                    </Box>
                    <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                      <Typography
                        variant="body1"
                        fontWeight={600}
                        sx={{
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {lastConvertedFile.fileName}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Saved to output folder
                      </Typography>
                    </Box>
                  </Box>

                  {/* Action Buttons */}
                  <Box sx={{ display: 'flex', gap: 1.5 }}>
                    <Button
                      variant="contained"
                      color="success"
                      startIcon={<FolderOpenIcon />}
                      onClick={() => onOpenFileLocation(lastConvertedFile.filePath)}
                      sx={{ flex: 1 }}
                    >
                      Open Location
                    </Button>
                    <Button
                      variant="outlined"
                      startIcon={<PlayArrowIcon />}
                      onClick={() => {
                        // Open the file with default application
                        if (window.api && window.api.openFileLocation) {
                          // Using shell.openPath would be ideal here
                          onOpenFileLocation(lastConvertedFile.filePath);
                        }
                      }}
                      sx={{
                        flex: 1,
                        borderColor: alpha(colors.success.main, 0.5),
                        color: 'success.main',
                        '&:hover': {
                          borderColor: colors.success.main,
                          bgcolor: alpha(colors.success.main, 0.08),
                        },
                      }}
                    >
                      Show File
                    </Button>
                  </Box>
                </Box>
              </Fade>
            )}
          </Box>
        </Fade>
      )}

      {/* Error State */}
      {isError && (
        <Fade in={isError}>
          <Box sx={{ position: 'relative', zIndex: 1, textAlign: 'center', py: 2 }}>
            <Box
              sx={{
                width: 64,
                height: 64,
                borderRadius: '50%',
                bgcolor: alpha(colors.error.main, 0.15),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mx: 'auto',
                mb: 2,
              }}
            >
              <ErrorIcon sx={{ fontSize: 36, color: 'error.main' }} />
            </Box>
            <Typography variant="h6" color="error.main" fontWeight={600}>
              Conversion Failed
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {statusMessage || 'An error occurred during conversion'}
            </Typography>
          </Box>
        </Fade>
      )}

      {/* Idle State */}
      {isIdle && (
        <Box
          sx={{
            textAlign: 'center',
            py: 3,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 1,
          }}
        >
          <Box
            sx={{
              width: 56,
              height: 56,
              borderRadius: 2,
              bgcolor: alpha(colors.text.secondary, 0.08),
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mb: 1,
            }}
          >
            <HourglassTopIcon sx={{ fontSize: 28, color: 'text.secondary', opacity: 0.6 }} />
          </Box>
          <Typography variant="body1" color="text.secondary" fontWeight={500}>
            Ready to convert
          </Typography>
          <Typography variant="body2" color="text.disabled">
            Paste a URL above to get started
          </Typography>
        </Box>
      )}
    </Paper>
  );
}

export default ProgressIndicator;
