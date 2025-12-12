import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Collapse,
  IconButton,
  Paper,
  Tooltip,
  Snackbar,
  alpha,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import RefreshIcon from '@mui/icons-material/Refresh';
import CloseIcon from '@mui/icons-material/Close';
import BugReportIcon from '@mui/icons-material/BugReport';
import { colors } from '../styles/theme';

function ErrorDialog({ open, onClose, title, message }) {
  const [detailsExpanded, setDetailsExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleClose = () => {
    setDetailsExpanded(false);
    onClose();
  };

  const handleCopyError = async () => {
    try {
      await navigator.clipboard.writeText(`${title}\n\n${message}`);
      setCopied(true);
    } catch (err) {
      console.error('Failed to copy error:', err);
    }
  };

  // Parse error message to extract key info
  const isNetworkError =
    message?.toLowerCase().includes('network') ||
    message?.toLowerCase().includes('connection') ||
    message?.toLowerCase().includes('unreachable');

  const isFileError =
    message?.toLowerCase().includes('winerror') ||
    message?.toLowerCase().includes('permission') ||
    message?.toLowerCase().includes('access');

  const isUnavailableError =
    message?.toLowerCase().includes('unavailable') ||
    message?.toLowerCase().includes('private') ||
    message?.toLowerCase().includes('removed');

  const getErrorIcon = () => {
    return (
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
          animation: 'shake 0.5s ease-in-out',
          '@keyframes shake': {
            '0%, 100%': { transform: 'translateX(0)' },
            '25%': { transform: 'translateX(-5px)' },
            '75%': { transform: 'translateX(5px)' },
          },
        }}
      >
        <ErrorOutlineIcon sx={{ fontSize: 36, color: 'error.main' }} />
      </Box>
    );
  };

  const getQuickTip = () => {
    if (isNetworkError) {
      return '💡 Check your internet connection and try again.';
    }
    if (isFileError) {
      return '💡 Close any applications using the file and try again.';
    }
    if (isUnavailableError) {
      return '💡 The video may be private, deleted, or region-restricted.';
    }
    return null;
  };

  const quickTip = getQuickTip();

  return (
    <>
      <Dialog
        open={open}
        onClose={handleClose}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            bgcolor: colors.background.elevated,
            backgroundImage: 'none',
            border: `1px solid ${alpha(colors.error.main, 0.2)}`,
            overflow: 'hidden',
          },
        }}
      >
        {/* Header Bar */}
        <Box
          sx={{
            bgcolor: alpha(colors.error.main, 0.1),
            borderBottom: `1px solid ${alpha(colors.error.main, 0.2)}`,
            px: 2,
            py: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <BugReportIcon sx={{ fontSize: 18, color: 'error.main' }} />
            <Typography variant="caption" color="error.main" fontWeight={600}>
              ERROR
            </Typography>
          </Box>
          <IconButton size="small" onClick={handleClose} sx={{ color: 'text.secondary' }}>
            <CloseIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </Box>

        <DialogContent sx={{ pt: 3, pb: 2, textAlign: 'center' }}>
          {getErrorIcon()}

          <Typography variant="h6" fontWeight={700} gutterBottom>
            {title || 'Something went wrong'}
          </Typography>

          {/* Quick Tip */}
          {quickTip && (
            <Paper
              elevation={0}
              sx={{
                p: 1.5,
                mb: 2,
                borderRadius: 2,
                bgcolor: alpha(colors.warning.main, 0.1),
                border: `1px solid ${alpha(colors.warning.main, 0.2)}`,
              }}
            >
              <Typography variant="body2" color="text.secondary">
                {quickTip}
              </Typography>
            </Paper>
          )}

          {/* Error Message Preview */}
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{
              mb: 2,
              maxHeight: detailsExpanded ? 'none' : 80,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'pre-wrap',
              textAlign: 'left',
              bgcolor: alpha(colors.background.default, 0.5),
              p: 2,
              borderRadius: 2,
              border: `1px solid ${colors.divider}`,
            }}
          >
            {message?.length > 200 && !detailsExpanded
              ? message.substring(0, 200) + '...'
              : message}
          </Typography>

          {/* Expand/Collapse */}
          {message && message.length > 200 && (
            <Button
              size="small"
              onClick={() => setDetailsExpanded(!detailsExpanded)}
              endIcon={detailsExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
              sx={{ mb: 1, color: 'text.secondary' }}
            >
              {detailsExpanded ? 'Show Less' : 'Show Full Details'}
            </Button>
          )}

          {/* Full Details (when expanded) */}
          <Collapse in={detailsExpanded}>
            <Paper
              variant="outlined"
              sx={{
                mt: 2,
                p: 2,
                bgcolor: alpha(colors.background.default, 0.8),
                borderRadius: 2,
                maxHeight: 200,
                overflow: 'auto',
                textAlign: 'left',
              }}
            >
              <Typography
                variant="body2"
                component="pre"
                sx={{
                  margin: 0,
                  whiteSpace: 'pre-wrap',
                  fontFamily: '"JetBrains Mono", "Fira Code", monospace',
                  fontSize: '0.75rem',
                  color: 'text.secondary',
                }}
              >
                {message}
              </Typography>
            </Paper>
          </Collapse>
        </DialogContent>

        <DialogActions
          sx={{
            px: 3,
            py: 2,
            borderTop: `1px solid ${colors.divider}`,
            gap: 1,
          }}
        >
          <Tooltip title="Copy error details" arrow>
            <IconButton onClick={handleCopyError} sx={{ color: 'text.secondary' }}>
              <ContentCopyIcon sx={{ fontSize: 20 }} />
            </IconButton>
          </Tooltip>
          <Box sx={{ flexGrow: 1 }} />
          <Button onClick={handleClose} sx={{ color: 'text.secondary' }}>
            Close
          </Button>
          <Button
            onClick={handleClose}
            variant="contained"
            color="primary"
            startIcon={<RefreshIcon />}
          >
            Try Again
          </Button>
        </DialogActions>
      </Dialog>

      {/* Copy Success Snackbar */}
      <Snackbar
        open={copied}
        autoHideDuration={2000}
        onClose={() => setCopied(false)}
        message="Error details copied to clipboard"
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </>
  );
}

export default ErrorDialog;
