import { useState, useCallback, useEffect, useMemo } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  IconButton,
  TextField,
  Tooltip,
  Alert,
  Collapse,
  Divider,
  Switch,
  FormControlLabel,
  List,
  ListItem,
  Chip,
} from '@mui/material';
import TimeInput from './TimeInput';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ContentCutIcon from '@mui/icons-material/ContentCut';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import EditIcon from '@mui/icons-material/Edit';

// Parse timestamp string (MM:SS or H:MM:SS) to seconds
export const parseTimeToSeconds = (timeStr) => {
  if (!timeStr || typeof timeStr !== 'string') return null;
  
  const trimmed = timeStr.trim();
  if (!trimmed) return null;
  
  // Try parsing as pure seconds (1-2 digit numbers, e.g., "45" or "9")
  if (/^\d{1,2}$/.test(trimmed)) {
    return parseInt(trimmed, 10);
  }
  
  // Try parsing MM:SS or HH:MM:SS
  const parts = trimmed.split(':').map(p => parseFloat(p.trim()));
  
  if (parts.some(isNaN)) return null;
  
  if (parts.length === 2) {
    // MM:SS format
    const [minutes, seconds] = parts;
    if (minutes < 0 || seconds < 0 || seconds >= 60) return null;
    return minutes * 60 + seconds;
  } else if (parts.length === 3) {
    // H:MM:SS format
    const [hours, minutes, seconds] = parts;
    if (hours < 0 || minutes < 0 || minutes >= 60 || seconds < 0 || seconds >= 60) return null;
    return hours * 3600 + minutes * 60 + seconds;
  }
  
  return null;
};

// Format seconds to MM:SS or HH:MM:SS string
export const formatSecondsToTime = (totalSeconds) => {
  if (totalSeconds === null || totalSeconds === undefined || isNaN(totalSeconds)) return '';
  
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

// Parse timestamps from video description
export const parseTimestampsFromDescription = (description, videoDuration) => {
  if (!description) return [];
  
  const segments = [];
  const lines = description.split('\n');
  
  // Common timestamp patterns:
  // 0:00 Song Title
  // 00:00 Song Title
  // 0:00:00 Song Title
  // [0:00] Song Title
  // (0:00) Song Title
  // 0:00 - Song Title
  // Song Title 0:00
  // Song Title - 0:00
  // 1. 0:00 Song Title
  // 01. 0:00 Song Title
  
  // Regex patterns for timestamp extraction
  const patterns = [
    // Timestamp at start: "0:00 Title" or "0:00 - Title" or "[0:00] Title"
    /^[[(]?(\d{1,2}:\d{2}(?::\d{2})?)[)\]]?\s*[-–—:]?\s*(.+)$/,
    // Track number + timestamp: "1. 0:00 Title" or "01. 0:00 Title"
    /^\d{1,2}[.)]\s*[[(]?(\d{1,2}:\d{2}(?::\d{2})?)[)\]]?\s*[-–—:]?\s*(.+)$/,
    // Timestamp at end: "Title - 0:00" or "Title (0:00)"
    /^(.+?)\s*[-–—[(]\s*(\d{1,2}:\d{2}(?::\d{2})?)\s*[)\]]?$/,
    // Just timestamp and title with dash: "0:00 - Title"
    /^(\d{1,2}:\d{2}(?::\d{2})?)\s*[-–—]\s*(.+)$/,
  ];
  
  for (const line of lines) {
    const trimmedLine = line.trim();
    if (!trimmedLine) continue;
    
    for (const pattern of patterns) {
      const match = trimmedLine.match(pattern);
      if (match) {
        let timestamp, title;
        
        // Check if first group is timestamp or title
        if (/^\d{1,2}:\d{2}/.test(match[1])) {
          timestamp = match[1];
          title = match[2];
        } else {
          title = match[1];
          timestamp = match[2];
        }
        
        const startSeconds = parseTimeToSeconds(timestamp);
        if (startSeconds !== null && title && title.trim()) {
          // Clean up the title
          let cleanTitle = title.trim();
          // Remove common prefixes/suffixes
          cleanTitle = cleanTitle.replace(/^[-–—:\s]+/, '').trim();
          cleanTitle = cleanTitle.replace(/[-–—:\s]+$/, '').trim();
          
          // Skip if title is too short or looks like junk
          if (cleanTitle.length >= 2) {
            segments.push({
              startTime: startSeconds,
              startTimeFormatted: formatSecondsToTime(startSeconds),
              title: cleanTitle,
            });
          }
        }
        break; // Found a match, move to next line
      }
    }
  }
  
  // Sort by start time
  segments.sort((a, b) => a.startTime - b.startTime);
  
  // Remove duplicates (same start time)
  const uniqueSegments = [];
  let lastStartTime = -1;
  for (const segment of segments) {
    if (segment.startTime !== lastStartTime) {
      uniqueSegments.push(segment);
      lastStartTime = segment.startTime;
    }
  }
  
  // Calculate end times (next segment's start time or video duration)
  const result = uniqueSegments.map((segment, index) => {
    const nextSegment = uniqueSegments[index + 1];
    const endTime = nextSegment ? nextSegment.startTime : (videoDuration || null);
    
    return {
      id: `segment-${Date.now()}-${index}`,
      title: segment.title,
      artist: '',
      startTime: segment.startTimeFormatted,
      endTime: endTime !== null ? formatSecondsToTime(endTime) : '',
      trackNumber: index + 1,
    };
  });
  
  return result;
};

// Single segment row component
const SegmentRow = ({
  segment,
  index,
  onUpdate,
  onRemove,
  useSharedArtist,
  disabled,
  videoDuration,
  isLast,
}) => {
  const [startError, setStartError] = useState('');
  const [endError, setEndError] = useState('');
  
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ 
    id: segment.id,
    disabled: disabled,
  });
  
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };
  
  const validateTime = useCallback((timeStr, fieldName) => {
    if (!timeStr) {
      return fieldName === 'start' ? 'Required' : '';
    }
    
    const seconds = parseTimeToSeconds(timeStr);
    if (seconds === null) {
      return 'Invalid time format';
    }
    
    if (videoDuration && seconds > videoDuration) {
      return `Exceeds duration (${formatSecondsToTime(videoDuration)})`;
    }
    
    return '';
  }, [videoDuration]);
  
  const handleStartTimeChange = useCallback((value) => {
    const error = validateTime(value, 'start');
    setStartError(error);
    onUpdate(index, 'startTime', value);
  }, [index, onUpdate, validateTime]);
  
  const handleEndTimeChange = useCallback((value) => {
    const error = validateTime(value, 'end');
    setEndError(error);
    onUpdate(index, 'endTime', value);
  }, [index, onUpdate, validateTime]);
  
  // Calculate duration
  const duration = useMemo(() => {
    const start = parseTimeToSeconds(segment.startTime);
    const end = parseTimeToSeconds(segment.endTime);
    if (start !== null && end !== null && end > start) {
      return formatSecondsToTime(end - start);
    }
    return null;
  }, [segment.startTime, segment.endTime]);
  
  return (
    <ListItem
      ref={setNodeRef}
      style={style}
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'stretch',
        gap: 1,
        py: 1.5,
        px: 2,
        bgcolor: 'background.default',
        borderRadius: 1,
        mb: 1,
        border: 1,
        borderColor: 'divider',
      }}
    >
      {/* Header row with track number and delete */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box
            {...(disabled ? {} : { ...attributes, ...listeners })}
            sx={{
              display: 'flex',
              alignItems: 'center',
              cursor: disabled ? 'default' : 'grab',
              '&:active': {
                cursor: disabled ? 'default' : 'grabbing',
              },
            }}
          >
            <DragIndicatorIcon sx={{ color: disabled ? 'text.disabled' : 'text.secondary' }} />
          </Box>
          <Chip
            label={`Track ${segment.trackNumber || index + 1}`}
            size="small"
            color="primary"
            variant="outlined"
          />
          {duration && (
            <Chip
              icon={<AccessTimeIcon />}
              label={duration}
              size="small"
              variant="outlined"
            />
          )}
        </Box>
        <Tooltip title="Remove segment">
          <IconButton
            size="small"
            onClick={() => onRemove(index)}
            disabled={disabled}
            color="error"
          >
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>
      
      {/* Time inputs row */}
      <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
        <TimeInput
          label="Start Time"
          value={segment.startTime}
          onChange={handleStartTimeChange}
          placeholder="0:00"
          disabled={disabled}
          error={!!startError}
          helperText={startError || 'Type 348 for 3:48'}
        />
        <TimeInput
          label="End Time"
          value={segment.endTime}
          onChange={handleEndTimeChange}
          placeholder={isLast && videoDuration ? formatSecondsToTime(videoDuration) : '0:00'}
          disabled={disabled}
          error={!!endError}
          helperText={endError || (isLast ? 'Leave empty for end' : '')}
        />
      </Box>
      
      {/* Title and artist row */}
      <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
        <TextField
          label="Song Title"
          value={segment.title}
          onChange={(e) => onUpdate(index, 'title', e.target.value)}
          placeholder="Enter song title"
          size="small"
          disabled={disabled}
          fullWidth
          required
        />
        {!useSharedArtist && (
          <TextField
            label="Artist"
            value={segment.artist}
            onChange={(e) => onUpdate(index, 'artist', e.target.value)}
            placeholder="Artist for this track"
            size="small"
            disabled={disabled}
            sx={{ minWidth: 200 }}
          />
        )}
      </Box>
    </ListItem>
  );
};

function SegmentEditor({
  videoInfo,
  chapterInfo,
  segments,
  setSegments,
  useSharedArtist,
  setUseSharedArtist,
  disabled,
  onOpenMetadataEditor,
}) {
  const [expanded, setExpanded] = useState(false);
  const [useManualSegments, setUseManualSegments] = useState(false);
  const [parseError, setParseError] = useState(null);
  
  // Determine if we should show the segment editor
  const hasChapters = chapterInfo?.hasChapters && chapterInfo?.chapters?.length > 0;
  const videoDuration = videoInfo?.duration || null;
  const videoDescription = videoInfo?.description || '';
  
  // Auto-expand if no chapters
  useEffect(() => {
    if (!hasChapters && videoInfo) {
      setExpanded(true);
    }
  }, [hasChapters, videoInfo]);
  
  // Generate unique ID for new segments
  const generateSegmentId = useCallback(() => {
    return `segment-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }, []);
  
  // Add a new empty segment
  const handleAddSegment = useCallback(() => {
    const lastSegment = segments[segments.length - 1];
    const newStartTime = lastSegment?.endTime || (segments.length === 0 ? '0:00' : '');
    
    const newSegment = {
      id: generateSegmentId(),
      title: '',
      artist: '',
      startTime: newStartTime,
      endTime: '',
      trackNumber: segments.length + 1,
    };
    
    setSegments([...segments, newSegment]);
  }, [segments, setSegments, generateSegmentId]);
  
  // Remove a segment
  const handleRemoveSegment = useCallback((index) => {
    const newSegments = segments.filter((_, i) => i !== index);
    // Update track numbers
    const renumbered = newSegments.map((seg, i) => ({
      ...seg,
      trackNumber: i + 1,
    }));
    setSegments(renumbered);
  }, [segments, setSegments]);
  
  // Update a segment field
  const handleUpdateSegment = useCallback((index, field, value) => {
    const newSegments = [...segments];
    newSegments[index] = {
      ...newSegments[index],
      [field]: value,
    };
    setSegments(newSegments);
  }, [segments, setSegments]);

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Handle drag end - reorder segments
  const handleDragEnd = useCallback((event) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setSegments((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);

        const reordered = arrayMove(items, oldIndex, newIndex);
        
        // Update track numbers after reordering
        return reordered.map((seg, index) => ({
          ...seg,
          trackNumber: index + 1,
        }));
      });
    }
  }, [setSegments]);
  
  // Parse timestamps from description
  const handleParseFromDescription = useCallback(() => {
    setParseError(null);
    
    if (!videoDescription) {
      setParseError('No video description available to parse.');
      return;
    }
    
    const parsed = parseTimestampsFromDescription(videoDescription, videoDuration);
    
    if (parsed.length === 0) {
      setParseError('No timestamps found in the video description. Try adding segments manually.');
      return;
    }
    
    // Assign unique IDs
    const withIds = parsed.map((seg, idx) => ({
      ...seg,
      id: generateSegmentId(),
      trackNumber: idx + 1,
    }));
    
    setSegments(withIds);
  }, [videoDescription, videoDuration, setSegments, generateSegmentId]);
  
  // Fill last segment's end time to video duration
  const handleFillToEnd = useCallback(() => {
    if (segments.length === 0 || !videoDuration) return;
    
    const newSegments = [...segments];
    const lastIndex = newSegments.length - 1;
    newSegments[lastIndex] = {
      ...newSegments[lastIndex],
      endTime: formatSecondsToTime(videoDuration),
    };
    setSegments(newSegments);
  }, [segments, setSegments, videoDuration]);
  
  // Clear all segments
  const handleClearSegments = useCallback(() => {
    setSegments([]);
    setParseError(null);
  }, [setSegments]);
  
  // Validation summary
  const validationSummary = useMemo(() => {
    const issues = [];
    
    segments.forEach((segment, index) => {
      if (!segment.title?.trim()) {
        issues.push(`Segment ${index + 1}: Missing title`);
      }
      if (!segment.startTime) {
        issues.push(`Segment ${index + 1}: Missing start time`);
      }
      
      const start = parseTimeToSeconds(segment.startTime);
      const end = parseTimeToSeconds(segment.endTime);
      
      if (start !== null && end !== null && end <= start) {
        issues.push(`Segment ${index + 1}: End time must be after start time`);
      }
      
      // Check for overlaps with previous segment
      if (index > 0) {
        const prevEnd = parseTimeToSeconds(segments[index - 1].endTime);
        if (prevEnd !== null && start !== null && start < prevEnd) {
          issues.push(`Segment ${index + 1}: Overlaps with previous segment`);
        }
      }
    });
    
    return issues;
  }, [segments]);
  
  // Don't show if video info not loaded
  if (!videoInfo) return null;
  
  // Show override toggle if chapters exist
  const showOverrideToggle = hasChapters;
  
  // Determine if segment editor should be active
  const isActive = !hasChapters || useManualSegments;
  
  return (
    <Paper
      elevation={1}
      sx={{
        mb: 2,
        borderRadius: 2,
        bgcolor: 'background.paper',
        border: segments.length > 0 ? 2 : 1,
        borderColor: segments.length > 0 ? 'primary.main' : 'divider',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          p: 2,
          cursor: 'pointer',
          '&:hover': { bgcolor: 'action.hover' },
        }}
        onClick={() => setExpanded(!expanded)}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <ContentCutIcon sx={{ color: 'primary.main' }} />
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
            Manual Segmentation
          </Typography>
          {segments.length > 0 && (
            <Chip
              label={`${segments.length} segment${segments.length > 1 ? 's' : ''}`}
              size="small"
              color="primary"
            />
          )}
          {!hasChapters && (
            <Chip
              label="No chapters detected"
              size="small"
              variant="outlined"
              color="warning"
            />
          )}
        </Box>
        <IconButton size="small">
          {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
        </IconButton>
      </Box>
      
      <Collapse in={expanded}>
        <Divider />
        <Box sx={{ p: 2 }}>
          {/* Override toggle for videos with chapters */}
          {showOverrideToggle && (
            <Box sx={{ mb: 2, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={useManualSegments}
                    onChange={(e) => setUseManualSegments(e.target.checked)}
                    disabled={disabled}
                  />
                }
                label={
                  <Box>
                    <Typography variant="body2" fontWeight="medium">
                      Override chapter markers with custom segments
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      This video has {chapterInfo.chapters.length} chapters. Enable to define your own segments instead.
                    </Typography>
                  </Box>
                }
              />
            </Box>
          )}
          
          {/* Only show segment editor if active */}
          {isActive && (
            <>
              {/* Info alert */}
              <Alert severity="info" sx={{ mb: 2 }}>
                Define time segments to split this video into separate audio files. Each segment will be downloaded as a separate track with its own metadata.
              </Alert>
              
              {/* Artist mode toggle */}
              <Box sx={{ mb: 2, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={useSharedArtist}
                      onChange={(e) => setUseSharedArtist(e.target.checked)}
                      disabled={disabled}
                    />
                  }
                  label={
                    <Box>
                      <Typography variant="body2" fontWeight="medium">
                        Use same artist for all segments
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {useSharedArtist
                          ? 'All segments will use the shared artist from metadata editor'
                          : 'Each segment can have its own artist (for compilations/various artists)'}
                      </Typography>
                    </Box>
                  }
                />
              </Box>
              
              {/* Action buttons */}
              <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
                <Button
                  variant="outlined"
                  startIcon={<AutoFixHighIcon />}
                  onClick={handleParseFromDescription}
                  disabled={disabled || !videoDescription}
                  size="small"
                >
                  Parse from Description
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<AddIcon />}
                  onClick={handleAddSegment}
                  disabled={disabled}
                  size="small"
                >
                  Add Segment
                </Button>
                {segments.length > 0 && videoDuration && (
                  <Button
                    variant="outlined"
                    startIcon={<AccessTimeIcon />}
                    onClick={handleFillToEnd}
                    disabled={disabled}
                    size="small"
                  >
                    Fill to End
                  </Button>
                )}
                {segments.length > 0 && (
                  <Button
                    variant="outlined"
                    startIcon={<EditIcon />}
                    onClick={onOpenMetadataEditor}
                    disabled={disabled}
                    size="small"
                  >
                    Edit Album Metadata
                  </Button>
                )}
                {segments.length > 0 && (
                  <Button
                    variant="outlined"
                    color="error"
                    startIcon={<DeleteIcon />}
                    onClick={handleClearSegments}
                    disabled={disabled}
                    size="small"
                  >
                    Clear All
                  </Button>
                )}
              </Box>
              
              {/* Parse error */}
              {parseError && (
                <Alert severity="warning" sx={{ mb: 2 }} onClose={() => setParseError(null)}>
                  {parseError}
                </Alert>
              )}
              
              {/* Validation errors */}
              {validationSummary.length > 0 && segments.length > 0 && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  <Typography variant="body2" fontWeight="medium" gutterBottom>
                    Please fix the following issues:
                  </Typography>
                  <ul style={{ margin: 0, paddingLeft: 20 }}>
                    {validationSummary.map((issue, idx) => (
                      <li key={idx}>
                        <Typography variant="body2">{issue}</Typography>
                      </li>
                    ))}
                  </ul>
                </Alert>
              )}
              
              {/* Segment list */}
              {segments.length > 0 ? (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={segments.map((seg) => seg.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <List sx={{ p: 0 }}>
                      {segments.map((segment, index) => (
                        <SegmentRow
                          key={segment.id}
                          segment={segment}
                          index={index}
                          onUpdate={handleUpdateSegment}
                          onRemove={handleRemoveSegment}
                          useSharedArtist={useSharedArtist}
                          disabled={disabled}
                          videoDuration={videoDuration}
                          isLast={index === segments.length - 1}
                        />
                      ))}
                    </List>
                  </SortableContext>
                </DndContext>
              ) : (
                <Box
                  sx={{
                    p: 4,
                    textAlign: 'center',
                    bgcolor: 'background.default',
                    borderRadius: 1,
                    border: 1,
                    borderColor: 'divider',
                    borderStyle: 'dashed',
                  }}
                >
                  <MusicNoteIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
                  <Typography variant="body1" color="text.secondary" gutterBottom>
                    No segments defined yet
                  </Typography>
                  <Typography variant="body2" color="text.disabled">
                    Click &quot;Parse from Description&quot; to auto-detect timestamps, or &quot;Add Segment&quot; to create manually.
                  </Typography>
                </Box>
              )}
              
              {/* Summary */}
              {segments.length > 0 && (
                <Box sx={{ mt: 2, display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
                  <Chip
                    icon={<MusicNoteIcon />}
                    label={`${segments.length} track${segments.length > 1 ? 's' : ''}`}
                    variant="outlined"
                  />
                  {videoDuration && (
                    <Chip
                      icon={<AccessTimeIcon />}
                      label={`Video duration: ${formatSecondsToTime(videoDuration)}`}
                      variant="outlined"
                    />
                  )}
                </Box>
              )}
            </>
          )}
          
          {/* Message when chapters exist and override is off */}
          {hasChapters && !useManualSegments && (
            <Alert severity="info">
              This video has chapter markers that will be used for splitting. Enable the toggle above if you want to define custom segments instead.
            </Alert>
          )}
        </Box>
      </Collapse>
    </Paper>
  );
}

export default SegmentEditor;
