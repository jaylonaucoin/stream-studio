import { useEffect, useRef, useState } from 'react';
import {
  Box,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Typography,
  IconButton,
  Paper,
  Chip,
  Tooltip,
  Snackbar,
  Fade,
  alpha,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import TerminalIcon from '@mui/icons-material/Terminal';
import ClearIcon from '@mui/icons-material/Clear';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import InfoIcon from '@mui/icons-material/Info';
import DownloadingIcon from '@mui/icons-material/Downloading';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import { colors } from '../styles/theme';

function LogViewer({ logs, onClear }) {
  const logEndRef = useRef(null);
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (expanded && logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, expanded]);

  // Auto-expand when there are new logs
  useEffect(() => {
    if (logs.length > 0 && !expanded) {
      // Only auto-expand on first log
      if (logs.length === 1) {
        setExpanded(true);
      }
    }
  }, [logs.length, expanded]);

  const getLogIcon = (type) => {
    switch (type) {
      case 'success':
        return <CheckCircleIcon sx={{ fontSize: 16, color: 'success.main' }} />;
      case 'error':
        return <ErrorIcon sx={{ fontSize: 16, color: 'error.main' }} />;
      case 'progress':
        return (
          <DownloadingIcon
            sx={{
              fontSize: 16,
              color: 'primary.main',
            }}
          />
        );
      default:
        return <InfoIcon sx={{ fontSize: 16, color: 'info.main' }} />;
    }
  };

  const getLogBorderColor = (type) => {
    switch (type) {
      case 'success':
        return colors.success.main;
      case 'error':
        return colors.error.main;
      case 'progress':
        return colors.primary.main;
      default:
        return colors.info.main;
    }
  };

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const handleCopyLogs = async () => {
    const logText = logs
      .map((log) => `[${formatTimestamp(log.timestamp)}] ${log.message}`)
      .join('\n');

    try {
      await navigator.clipboard.writeText(logText);
      setCopied(true);
    } catch (err) {
      console.error('Failed to copy logs:', err);
    }
  };

  const successCount = logs.filter((l) => l.type === 'success').length;
  const errorCount = logs.filter((l) => l.type === 'error').length;

  return (
    <>
      <Accordion
        expanded={expanded}
        onChange={(e, isExpanded) => setExpanded(isExpanded)}
        sx={{
          bgcolor: alpha(colors.background.card, 0.6),
          backdropFilter: 'blur(20px)',
          border: `1px solid ${colors.divider}`,
          borderRadius: '12px !important',
          overflow: 'hidden',
          '&:before': { display: 'none' },
          '&.Mui-expanded': {
            margin: 0,
            boxShadow: `0 8px 32px ${alpha(colors.primary.main, 0.1)}`,
          },
        }}
      >
        <AccordionSummary
          expandIcon={<ExpandMoreIcon sx={{ color: 'text.secondary' }} />}
          sx={{
            borderRadius: '12px',
            transition: 'all 0.2s ease',
            '&:hover': {
              bgcolor: alpha(colors.primary.main, 0.05),
            },
            '& .MuiAccordionSummary-content': {
              my: 1.5,
            },
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', flexGrow: 1, gap: 1.5 }}>
            {/* Icon */}
            <Box
              sx={{
                width: 32,
                height: 32,
                borderRadius: 1.5,
                bgcolor: alpha(colors.text.secondary, 0.1),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <TerminalIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
            </Box>

            {/* Title */}
            <Typography variant="subtitle2" fontWeight={600} sx={{ flexGrow: 1 }}>
              Conversion Logs
            </Typography>

            {/* Stats */}
            <Box sx={{ display: 'flex', gap: 0.75, mr: 1 }}>
              {logs.length > 0 && (
                <Chip
                  label={logs.length}
                  size="small"
                  sx={{
                    height: 22,
                    fontSize: '0.7rem',
                    fontWeight: 600,
                    bgcolor: alpha(colors.primary.main, 0.15),
                    color: 'primary.main',
                  }}
                />
              )}
              {successCount > 0 && (
                <Chip
                  icon={<CheckCircleIcon sx={{ fontSize: 12 }} />}
                  label={successCount}
                  size="small"
                  sx={{
                    height: 22,
                    fontSize: '0.7rem',
                    fontWeight: 600,
                    bgcolor: alpha(colors.success.main, 0.15),
                    color: 'success.main',
                    '& .MuiChip-icon': { color: 'success.main' },
                  }}
                />
              )}
              {errorCount > 0 && (
                <Chip
                  icon={<ErrorIcon sx={{ fontSize: 12 }} />}
                  label={errorCount}
                  size="small"
                  sx={{
                    height: 22,
                    fontSize: '0.7rem',
                    fontWeight: 600,
                    bgcolor: alpha(colors.error.main, 0.15),
                    color: 'error.main',
                    '& .MuiChip-icon': { color: 'error.main' },
                  }}
                />
              )}
            </Box>

            {/* Actions */}
            {logs.length > 0 && (
              <Box sx={{ display: 'flex', gap: 0.5 }}>
                <Tooltip title="Copy all logs" arrow>
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCopyLogs();
                    }}
                    sx={{ color: 'text.secondary' }}
                  >
                    <ContentCopyIcon sx={{ fontSize: 16 }} />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Clear logs" arrow>
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      onClear();
                    }}
                    sx={{ color: 'text.secondary' }}
                  >
                    <ClearIcon sx={{ fontSize: 16 }} />
                  </IconButton>
                </Tooltip>
              </Box>
            )}
          </Box>
        </AccordionSummary>

        <AccordionDetails sx={{ pt: 0, pb: 2, px: 2 }}>
          <Paper
            variant="outlined"
            sx={{
              maxHeight: 300,
              overflow: 'auto',
              p: 0,
              bgcolor: alpha(colors.background.default, 0.8),
              borderColor: colors.divider,
              borderRadius: 2,
            }}
          >
            {logs.length === 0 ? (
              <Box sx={{ py: 4, textAlign: 'center' }}>
                <TerminalIcon sx={{ fontSize: 32, color: 'text.disabled', mb: 1 }} />
                <Typography variant="body2" color="text.secondary">
                  No logs yet
                </Typography>
                <Typography variant="caption" color="text.disabled">
                  Conversion logs will appear here
                </Typography>
              </Box>
            ) : (
              <Box sx={{ py: 1 }}>
                {logs.map((log, index) => (
                  <Fade
                    in
                    key={index}
                    style={{ transitionDelay: `${Math.min(index * 20, 200)}ms` }}
                  >
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: 1.5,
                        py: 1,
                        px: 2,
                        borderLeft: `3px solid ${getLogBorderColor(log.type)}`,
                        bgcolor:
                          log.type === 'error'
                            ? alpha(colors.error.main, 0.05)
                            : log.type === 'success'
                              ? alpha(colors.success.main, 0.05)
                              : 'transparent',
                        transition: 'background-color 0.2s ease',
                        '&:hover': {
                          bgcolor: alpha(colors.text.primary, 0.03),
                        },
                      }}
                    >
                      {/* Icon */}
                      <Box sx={{ pt: 0.25, flexShrink: 0 }}>{getLogIcon(log.type)}</Box>

                      {/* Message */}
                      <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                        <Typography
                          variant="body2"
                          sx={{
                            fontFamily: '"JetBrains Mono", "Fira Code", "SF Mono", monospace',
                            fontSize: '0.8rem',
                            lineHeight: 1.5,
                            wordBreak: 'break-word',
                            color:
                              log.type === 'error'
                                ? 'error.main'
                                : log.type === 'success'
                                  ? 'success.main'
                                  : 'text.primary',
                          }}
                        >
                          {log.message}
                        </Typography>
                      </Box>

                      {/* Timestamp */}
                      <Typography
                        variant="caption"
                        sx={{
                          flexShrink: 0,
                          color: 'text.disabled',
                          fontFamily: 'monospace',
                          fontSize: '0.65rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 0.5,
                        }}
                      >
                        <AccessTimeIcon sx={{ fontSize: 10 }} />
                        {formatTimestamp(log.timestamp)}
                      </Typography>
                    </Box>
                  </Fade>
                ))}
                <div ref={logEndRef} />
              </Box>
            )}
          </Paper>
        </AccordionDetails>
      </Accordion>

      {/* Copy Success Snackbar */}
      <Snackbar
        open={copied}
        autoHideDuration={2000}
        onClose={() => setCopied(false)}
        message="Logs copied to clipboard"
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </>
  );
}

export default LogViewer;
