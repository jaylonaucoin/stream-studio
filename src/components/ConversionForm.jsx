import React, { useState, useCallback, useRef } from 'react';
import {
  Box,
  TextField,
  Button,
  IconButton,
  InputAdornment,
  Tooltip,
  Alert,
} from '@mui/material';
import ContentPasteIcon from '@mui/icons-material/ContentPaste';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import CancelIcon from '@mui/icons-material/Cancel';

function ConversionForm({ onConvert, onCancel, isConverting, disabled }) {
  const [url, setUrl] = useState('');
  const [isValid, setIsValid] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const containerRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);

  const validateUrl = useCallback((urlToValidate) => {
    const trimmed = urlToValidate.trim();
    
    if (trimmed.length === 0) {
      setIsValid(true);
      setErrorMessage('');
      return false;
    }

    const youtubePatterns = [
      /^https?:\/\/(www\.)?youtube\.com\/watch\?v=[\w-]+/,
      /^https?:\/\/(www\.)?youtube\.com\/embed\/[\w-]+/,
      /^https?:\/\/youtu\.be\/[\w-]+/,
      /^https?:\/\/(www\.)?youtube\.com\/v\/[\w-]+/,
    ];

    const valid = youtubePatterns.some(pattern => pattern.test(trimmed));
    setIsValid(valid);
    
    if (!valid && trimmed.length > 0) {
      setErrorMessage('Please enter a valid YouTube URL');
    } else {
      setErrorMessage('');
    }

    return valid;
  }, []);

  const handleUrlChange = useCallback((e) => {
    const newUrl = e.target.value;
    setUrl(newUrl);
    validateUrl(newUrl);
  }, [validateUrl]);

  const handlePaste = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      setUrl(text);
      validateUrl(text);
    } catch (err) {
      console.error('Failed to read clipboard:', err);
    }
  }, [validateUrl]);

  const handleSubmit = useCallback((e) => {
    e.preventDefault();
    if (isValid && url.trim() && !isConverting) {
      onConvert(url.trim());
    }
  }, [url, isValid, isConverting, onConvert]);

  const handleKeyPress = useCallback((e) => {
    if (e.key === 'Enter' && isValid && url.trim() && !isConverting) {
      handleSubmit(e);
    } else if (e.key === 'Escape' && isConverting) {
      onCancel();
    }
  }, [url, isValid, isConverting, handleSubmit, onCancel]);

  // Drag and drop handlers
  const handleDragEnter = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const dt = e.dataTransfer;
    const text = dt.getData('text/plain');

    if (text) {
      setUrl(text.trim());
      validateUrl(text.trim());
    }
  }, [validateUrl]);

  return (
    <Box
      ref={containerRef}
      component="form"
      onSubmit={handleSubmit}
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      sx={{
        p: 3,
        borderRadius: 2,
        bgcolor: 'background.paper',
        border: isDragging ? 2 : 1,
        borderColor: isDragging ? 'primary.main' : 'divider',
        borderStyle: 'dashed',
        transition: 'all 0.2s',
      }}
    >
      {disabled && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          FFmpeg is not available. Please ensure FFmpeg is installed before converting.
        </Alert>
      )}

      <TextField
        fullWidth
        label="YouTube URL"
        placeholder="Paste YouTube URL here or drag & drop..."
        value={url}
        onChange={handleUrlChange}
        onKeyDown={handleKeyPress}
        disabled={isConverting || disabled}
        error={!isValid && url.length > 0}
        helperText={errorMessage}
        InputProps={{
          endAdornment: (
            <InputAdornment position="end">
              <Tooltip title="Paste from clipboard">
                <IconButton
                  onClick={handlePaste}
                  edge="end"
                  disabled={isConverting || disabled}
                  aria-label="paste"
                >
                  <ContentPasteIcon />
                </IconButton>
              </Tooltip>
            </InputAdornment>
          ),
        }}
        sx={{ mb: 2 }}
      />

      <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
        {isConverting ? (
          <Button
            variant="outlined"
            color="error"
            startIcon={<CancelIcon />}
            onClick={onCancel}
          >
            Cancel
          </Button>
        ) : (
          <Button
            type="submit"
            variant="contained"
            startIcon={<PlayArrowIcon />}
            disabled={!isValid || !url.trim() || disabled}
          >
            Convert
          </Button>
        )}
      </Box>
    </Box>
  );
}

export default ConversionForm;

