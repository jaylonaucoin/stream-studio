import React, { useEffect, useRef } from 'react';
import {
  Box,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Typography,
  IconButton,
  Paper,
  Chip,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import ClearIcon from '@mui/icons-material/Clear';
import InfoIcon from '@mui/icons-material/Info';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';

function LogViewer({ logs, visible, onToggleVisibility, onClear }) {
  const logEndRef = useRef(null);
  const [expanded, setExpanded] = React.useState(false);

  useEffect(() => {
    if (expanded && logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, expanded]);

  const getLogIcon = (type) => {
    switch (type) {
      case 'success':
        return <CheckCircleIcon sx={{ fontSize: 16, color: 'success.main' }} />;
      case 'error':
        return <ErrorIcon sx={{ fontSize: 16, color: 'error.main' }} />;
      default:
        return <InfoIcon sx={{ fontSize: 16, color: 'info.main' }} />;
    }
  };

  const getLogColor = (type) => {
    switch (type) {
      case 'success':
        return 'success';
      case 'error':
        return 'error';
      case 'progress':
        return 'primary';
      default:
        return 'default';
    }
  };

  return (
    <Accordion
      expanded={expanded}
      onChange={(e, isExpanded) => setExpanded(isExpanded)}
      sx={{ boxShadow: 2 }}
    >
      <AccordionSummary
        expandIcon={<ExpandMoreIcon />}
        sx={{
          bgcolor: expanded ? 'action.selected' : 'background.paper',
          '&:hover': {
            bgcolor: 'action.hover',
          },
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', flexGrow: 1, gap: 1 }}>
          <Typography variant="subtitle2" sx={{ flexGrow: 1 }}>
            Conversion Logs
          </Typography>
          {logs.length > 0 && (
            <Chip label={logs.length} size="small" color="primary" sx={{ mr: 1 }} />
          )}
          <IconButton
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              onToggleVisibility();
            }}
            aria-label={visible ? 'hide logs' : 'show logs'}
          >
            {visible ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
          </IconButton>
          {logs.length > 0 && (
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                onClear();
              }}
              aria-label="clear logs"
            >
              <ClearIcon fontSize="small" />
            </IconButton>
          )}
        </Box>
      </AccordionSummary>
      <AccordionDetails>
        <Paper
          variant="outlined"
          sx={{
            maxHeight: 300,
            overflow: 'auto',
            p: 2,
            bgcolor: 'background.default',
            fontFamily: 'monospace',
            fontSize: '0.75rem',
          }}
        >
          {logs.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
              No logs yet. Start a conversion to see progress logs.
            </Typography>
          ) : (
            logs.map((log, index) => (
              <Box
                key={index}
                sx={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 1,
                  mb: 1,
                  py: 0.5,
                  borderLeft: 2,
                  borderColor: getLogColor(log.type) + '.main',
                  pl: 1,
                }}
              >
                <Box sx={{ mt: 0.25 }}>{getLogIcon(log.type)}</Box>
                <Typography
                  variant="body2"
                  sx={{
                    flexGrow: 1,
                    wordBreak: 'break-word',
                    color: log.type === 'error' ? 'error.main' : 'text.primary',
                  }}
                >
                  {log.message}
                </Typography>
              </Box>
            ))
          )}
          <div ref={logEndRef} />
        </Paper>
      </AccordionDetails>
    </Accordion>
  );
}

export default LogViewer;
