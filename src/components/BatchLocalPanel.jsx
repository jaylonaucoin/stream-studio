import { useState, useCallback, useEffect, useMemo } from 'react';
import {
  Box,
  Drawer,
  Typography,
  IconButton,
  Toolbar,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Checkbox,
  LinearProgress,
  Alert,
  Tooltip,
  Divider,
  ToggleButton,
  ToggleButtonGroup,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  RadioGroup,
  FormControlLabel,
  Radio,
  FormLabel,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import RefreshIcon from '@mui/icons-material/Refresh';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import StopIcon from '@mui/icons-material/Stop';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import { MetadataFormFields } from './MetadataFormFields';
import ThumbnailSection from './metadata/ThumbnailSection';

const emptyMetadata = () => ({
  title: '',
  artist: '',
  album: '',
  albumArtist: '',
  genre: '',
  year: '',
  trackNumber: '',
  totalTracks: '',
  composer: '',
  publisher: '',
  comment: '',
  description: '',
  language: 'eng',
  bpm: '',
  copyright: '',
});

function patchForStrategy(metadata, strategy) {
  if (strategy === 'replace') {
    const out = {};
    for (const [k, v] of Object.entries(metadata)) {
      out[k] = v ?? '';
    }
    return out;
  }
  const patch = {};
  for (const [k, v] of Object.entries(metadata)) {
    if (v !== undefined && v !== null && String(v).trim() !== '') {
      patch[k] = v;
    }
  }
  return patch;
}

function BatchLocalPanel({
  open,
  onClose,
  outputFolder,
  defaultMode = 'audio',
  defaultAudioFormat = 'mp3',
  defaultVideoFormat = 'mp4',
  defaultQuality = 'best',
  disabled = false,
  onBatchComplete,
}) {
  const [rows, setRows] = useState([]);
  const [truncatedHint, setTruncatedHint] = useState(false);
  const [metadata, setMetadata] = useState(emptyMetadata);
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [coverTouched, setCoverTouched] = useState(false);
  const [strategy, setStrategy] = useState('merge');
  const [applyScope, setApplyScope] = useState('selected');
  const [busy, setBusy] = useState(false);
  const [batchPhase, setBatchPhase] = useState(null);
  const [progress, setProgress] = useState({ done: 0, total: 0, currentPath: null });
  const [thumbError, setThumbError] = useState(null);
  const [convertMode, setConvertMode] = useState(defaultMode);
  const [convertFormat, setConvertFormat] = useState(
    defaultMode === 'audio' ? defaultAudioFormat : defaultVideoFormat
  );
  const [convertQuality, setConvertQuality] = useState(defaultQuality);

  useEffect(() => {
    if (!open) return;
    setConvertMode(defaultMode);
    setConvertFormat(defaultMode === 'audio' ? defaultAudioFormat : defaultVideoFormat);
    setConvertQuality(defaultQuality);
  }, [open, defaultMode, defaultAudioFormat, defaultVideoFormat, defaultQuality]);

  useEffect(() => {
    if (!open || !window.api?.onBatchJobProgress) return;
    const handler = (data) => {
      if (!data) return;
      setProgress({
        done: data.done ?? 0,
        total: data.total ?? 0,
        currentPath: data.currentPath ?? null,
      });
      setBatchPhase(data.phase || null);
    };
    window.api.onBatchJobProgress(handler);
    return () => {
      window.api.offBatchJobProgress?.();
    };
  }, [open]);

  const selectedPaths = useMemo(
    () => rows.filter((r) => r.selected).map((r) => r.path),
    [rows]
  );

  const targetPaths = useMemo(() => {
    if (applyScope === 'all') return rows.map((r) => r.path);
    return selectedPaths;
  }, [applyScope, rows, selectedPaths]);

  const allSelected = rows.length > 0 && rows.every((r) => r.selected);
  const someSelected = rows.some((r) => r.selected);

  const handleMetadataChange = useCallback((field, value) => {
    setMetadata((prev) => ({ ...prev, [field]: value }));
  }, []);

  const enrichRowsWithMetadata = useCallback(async (paths) => {
    if (!paths.length || !window.api?.readMetadataBatch) return;
    const { results } = await window.api.readMetadataBatch(paths);
    const byPath = new Map(results.map((r) => [r.path, r]));
    setRows((prev) =>
      prev.map((row) => {
        const r = byPath.get(row.path);
        if (!r) return row;
        if (!r.success) {
          return { ...row, status: 'read error', error: r.error || 'read failed' };
        }
        return {
          ...row,
          title: r.metadata?.title || '',
          artist: r.metadata?.artist || '',
          album: r.metadata?.album || '',
          status: '',
          error: null,
        };
      })
    );
  }, []);

  const ingestPaths = useCallback(
    async (rawPaths) => {
      if (!rawPaths.length || !window.api?.enumerateLocalMedia) return;
      const { paths: expanded, truncated, error } = await window.api.enumerateLocalMedia(rawPaths, {});
      if (error) {
        console.error(error);
        return;
      }
      if (truncated) setTruncatedHint(true);
      setRows((prev) => {
        const seen = new Set(prev.map((r) => r.path));
        const added = [];
        for (const p of expanded) {
          if (seen.has(p)) continue;
          seen.add(p);
          added.push({
            id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
            path: p,
            selected: true,
            title: '',
            artist: '',
            album: '',
            status: '',
            error: null,
          });
        }
        return [...prev, ...added];
      });
      if (expanded.length) await enrichRowsWithMetadata(expanded);
    },
    [enrichRowsWithMetadata]
  );

  const handleDrop = useCallback(
    async (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (disabled || busy) return;
      const raw = [];
      const files = e.dataTransfer?.files;
      if (files?.length) {
        for (let i = 0; i < files.length; i++) {
          const f = files[i];
          const p = window.api?.getPathForFile?.(f) || f.path || '';
          if (p) raw.push(p);
        }
      }
      if (raw.length) await ingestPaths(raw);
    },
    [disabled, busy, ingestPaths]
  );

  const handleAddFiles = useCallback(async () => {
    if (!window.api?.selectLocalFiles) return;
    const res = await window.api.selectLocalFiles();
    if (res?.success && res.filePaths?.length) await ingestPaths(res.filePaths);
  }, [ingestPaths]);

  const handleAddFolder = useCallback(async () => {
    if (!window.api?.selectLocalFolder) return;
    const res = await window.api.selectLocalFolder();
    if (res?.success && res.folderPath) await ingestPaths([res.folderPath]);
  }, [ingestPaths]);

  const handleRefreshMetadata = useCallback(async () => {
    if (!rows.length || busy) return;
    const paths = rows.map((r) => r.path);
    setBusy(true);
    try {
      await enrichRowsWithMetadata(paths);
    } finally {
      setBusy(false);
    }
  }, [rows, busy, enrichRowsWithMetadata]);

  const handleRemoveSelected = useCallback(() => {
    setRows((prev) => prev.filter((r) => !r.selected));
  }, []);

  const handleClearAll = useCallback(() => {
    if (busy) return;
    setRows([]);
    setTruncatedHint(false);
  }, [busy]);

  const handleToggleAll = useCallback(
    (checked) => {
      setRows((prev) => prev.map((r) => ({ ...r, selected: checked })));
    },
    []
  );

  const handleToggleRow = useCallback((id) => {
    setRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, selected: !r.selected } : r))
    );
  }, []);

  const handleDryRun = useCallback(async () => {
    if (!targetPaths.length || !window.api?.dryRunLocalBatch) return;
    setBusy(true);
    try {
      const { results } = await window.api.dryRunLocalBatch(targetPaths);
      const map = new Map(results.map((r) => [r.path, r]));
      setRows((prev) =>
        prev.map((row) => {
          if (!targetPaths.includes(row.path)) return row;
          const r = map.get(row.path);
          if (!r?.ok) return { ...row, status: 'blocked', error: r?.error || 'not writable' };
          return { ...row, status: 'ok', error: null };
        })
      );
    } finally {
      setBusy(false);
    }
  }, [targetPaths]);

  const canApplyMetadata = useMemo(() => {
    if (!targetPaths.length) return false;
    const patch = patchForStrategy(metadata, strategy);
    if (Object.keys(patch).length > 0) return true;
    return !!(coverTouched && thumbnailUrl);
  }, [targetPaths, metadata, strategy, coverTouched, thumbnailUrl]);

  const handleApplyMetadata = useCallback(async () => {
    if (!targetPaths.length || !window.api?.applyMetadataBatch || !canApplyMetadata) return;
    setBusy(true);
    setRows((prev) =>
      prev.map((r) =>
        targetPaths.includes(r.path) ? { ...r, status: 'working', error: null } : r
      )
    );
    try {
      const patch = patchForStrategy(metadata, strategy);
      const { results, cancelled } = await window.api.applyMetadataBatch({
        paths: targetPaths,
        patch,
        thumbnailDataUrl: coverTouched && thumbnailUrl ? thumbnailUrl : undefined,
        strategy,
      });
      const map = new Map(results.map((r) => [r.path, r]));
      setRows((prev) =>
        prev.map((row) => {
          const r = map.get(row.path);
          if (!r) return row;
          return {
            ...row,
            status: r.success ? 'done' : 'error',
            error: r.error || null,
          };
        })
      );
      if (!cancelled) await enrichRowsWithMetadata(targetPaths);
    } finally {
      setBusy(false);
      setProgress({ done: 0, total: 0, currentPath: null });
      setBatchPhase(null);
    }
  }, [
    targetPaths,
    metadata,
    strategy,
    coverTouched,
    thumbnailUrl,
    enrichRowsWithMetadata,
    canApplyMetadata,
  ]);

  const handleConvert = useCallback(async () => {
    if (!targetPaths.length || !window.api?.convertLocalBatch) return;
    setBusy(true);
    setRows((prev) =>
      prev.map((r) =>
        targetPaths.includes(r.path) ? { ...r, status: 'converting', error: null } : r
      )
    );
    try {
      const patch = patchForStrategy(metadata, strategy);
      const hasMeta =
        Object.keys(patch).length > 0 || (coverTouched && !!thumbnailUrl);
      const { results, cancelled } = await window.api.convertLocalBatch({
        paths: targetPaths,
        outputFolder,
        mode: convertMode,
        format: convertFormat,
        quality: convertQuality,
        metadataPatch: hasMeta ? patch : null,
        thumbnailDataUrl:
          coverTouched && thumbnailUrl ? thumbnailUrl : undefined,
        metadataStrategy: strategy,
      });
      const map = new Map(results.map((r) => [r.path, r]));
      setRows((prev) =>
        prev.map((row) => {
          const r = map.get(row.path);
          if (!r) return row;
          return {
            ...row,
            status: r.success ? 'converted' : 'error',
            error: r.error || null,
          };
        })
      );
      if (!cancelled) onBatchComplete?.();
    } finally {
      setBusy(false);
      setProgress({ done: 0, total: 0, currentPath: null });
      setBatchPhase(null);
    }
  }, [
    targetPaths,
    outputFolder,
    convertMode,
    convertFormat,
    convertQuality,
    metadata,
    strategy,
    coverTouched,
    thumbnailUrl,
    onBatchComplete,
  ]);

  const handleStop = useCallback(async () => {
    await window.api?.cancelBatchJob?.();
  }, []);

  const progressPct =
    progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0;

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={busy ? undefined : onClose}
      PaperProps={{
        sx: {
          width: { xs: '100%', sm: 560, md: 720 },
          maxWidth: '100vw',
        },
      }}
    >
      <Toolbar
        sx={{
          borderBottom: 1,
          borderColor: 'divider',
          justifyContent: 'space-between',
          gap: 1,
          minHeight: { xs: 56, sm: 64 },
        }}
      >
        <Typography variant="h6" component="div">
          Local batch
        </Typography>
        <IconButton
          edge="end"
          onClick={onClose}
          disabled={busy}
          aria-label="Close batch panel"
        >
          <CloseIcon />
        </IconButton>
      </Toolbar>

      <Box sx={{ p: 2, overflow: 'auto', flex: 1 }}>
        {disabled && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            FFmpeg is not available. Conversion is disabled; metadata may still work for MP3.
          </Alert>
        )}

        {truncatedHint && (
          <Alert severity="info" sx={{ mb: 2 }} onClose={() => setTruncatedHint(false)}>
            File list was truncated at the maximum allowed count. Add more files in a second
            batch if needed.
          </Alert>
        )}

        <Paper
          variant="outlined"
          sx={{
            p: 2,
            mb: 2,
            borderStyle: 'dashed',
            bgcolor: 'action.hover',
          }}
          onDragOver={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          onDrop={handleDrop}
        >
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Drop files or folders here, or use the buttons below.
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
            <Button
              size="small"
              variant="contained"
              startIcon={<InsertDriveFileIcon />}
              onClick={handleAddFiles}
              disabled={busy}
            >
              Add files
            </Button>
            <Button
              size="small"
              variant="outlined"
              startIcon={<FolderOpenIcon />}
              onClick={handleAddFolder}
              disabled={busy}
            >
              Add folder
            </Button>
            <Button
              size="small"
              startIcon={<RefreshIcon />}
              onClick={handleRefreshMetadata}
              disabled={busy || !rows.length}
            >
              Refresh tags
            </Button>
            <Button
              size="small"
              color="error"
              startIcon={<DeleteOutlineIcon />}
              onClick={handleRemoveSelected}
              disabled={busy || !someSelected}
            >
              Remove selected
            </Button>
            <Button size="small" onClick={handleClearAll} disabled={busy || !rows.length}>
              Clear all
            </Button>
          </Box>
        </Paper>

        {(busy || batchPhase) && progress.total > 0 && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="caption" color="text.secondary" display="block" noWrap>
              {batchPhase === 'metadata' ? 'Writing metadata' : 'Converting'} —{' '}
              {progress.done}/{progress.total}
              {progress.currentPath ? ` — ${progress.currentPath}` : ''}
            </Typography>
            <LinearProgress variant="determinate" value={progressPct} sx={{ mt: 0.5 }} />
          </Box>
        )}

        <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 280, mb: 2 }}>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox">
                  <Checkbox
                    checked={allSelected}
                    indeterminate={someSelected && !allSelected}
                    onChange={(e) => handleToggleAll(e.target.checked)}
                    disabled={!rows.length || busy}
                    inputProps={{ 'aria-label': 'select all files' }}
                  />
                </TableCell>
                <TableCell>Path</TableCell>
                <TableCell>Title</TableCell>
                <TableCell>Artist</TableCell>
                <TableCell>Album</TableCell>
                <TableCell>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6}>
                    <Typography variant="body2" color="text.secondary" align="center">
                      No files yet
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row) => (
                  <TableRow key={row.id} hover selected={row.selected}>
                    <TableCell padding="checkbox">
                      <Checkbox
                        checked={row.selected}
                        onChange={() => handleToggleRow(row.id)}
                        disabled={busy}
                        inputProps={{ 'aria-label': `select ${row.path}` }}
                      />
                    </TableCell>
                    <TableCell>
                      <Tooltip title={row.path}>
                        <Typography variant="body2" noWrap sx={{ maxWidth: 200 }}>
                          {row.path}
                        </Typography>
                      </Tooltip>
                    </TableCell>
                    <TableCell>{row.title}</TableCell>
                    <TableCell>{row.artist}</TableCell>
                    <TableCell>{row.album}</TableCell>
                    <TableCell>
                      <Typography variant="caption" color={row.error ? 'error' : 'text.secondary'}>
                        {row.status}
                        {row.error ? ` — ${row.error}` : ''}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>

        <Divider sx={{ my: 2 }} />

        <FormLabel component="legend" sx={{ mb: 1 }}>
          Apply to
        </FormLabel>
        <ToggleButtonGroup
          value={applyScope}
          exclusive
          size="small"
          onChange={(_, v) => v && setApplyScope(v)}
          sx={{ mb: 2 }}
        >
          <ToggleButton value="selected">Selected ({selectedPaths.length})</ToggleButton>
          <ToggleButton value="all">All ({rows.length})</ToggleButton>
        </ToggleButtonGroup>

        <FormControl component="fieldset" sx={{ mb: 2 }}>
          <FormLabel component="legend">Metadata mode</FormLabel>
          <RadioGroup
            row
            value={strategy}
            onChange={(e) => setStrategy(e.target.value)}
          >
            <FormControlLabel
              value="merge"
              control={<Radio size="small" />}
              label="Merge (empty fields keep existing tags)"
            />
            <FormControlLabel
              value="replace"
              control={<Radio size="small" />}
              label="Replace (empty fields clear tags)"
            />
          </RadioGroup>
        </FormControl>

        <Typography variant="subtitle2" gutterBottom>
          Shared metadata
        </Typography>
        <MetadataFormFields
          metadata={metadata}
          onChange={handleMetadataChange}
          showTrackNumbers
        />
        <ThumbnailSection
          thumbnailUrl={thumbnailUrl}
          onThumbnailChange={(url) => {
            setThumbnailUrl(url || '');
            setCoverTouched(true);
            setThumbError(null);
          }}
          onError={(msg) => setThumbError(msg)}
        />
        {thumbError && (
          <Alert severity="error" sx={{ mt: 1 }}>
            {thumbError}
          </Alert>
        )}

        <Divider sx={{ my: 2 }} />

        <Typography variant="subtitle2" gutterBottom>
          Convert to format
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 2, alignItems: 'center' }}>
          <ToggleButtonGroup
            value={convertMode}
            exclusive
            size="small"
            onChange={(_, v) => {
              if (!v) return;
              setConvertMode(v);
              setConvertFormat(v === 'audio' ? defaultAudioFormat : defaultVideoFormat);
            }}
          >
            <ToggleButton value="audio">Audio</ToggleButton>
            <ToggleButton value="video">Video</ToggleButton>
          </ToggleButtonGroup>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Format</InputLabel>
            <Select
              label="Format"
              value={convertFormat}
              onChange={(e) => setConvertFormat(e.target.value)}
            >
              {convertMode === 'audio' ? (
                <>
                  <MenuItem value="mp3">MP3</MenuItem>
                  <MenuItem value="m4a">M4A</MenuItem>
                  <MenuItem value="flac">FLAC</MenuItem>
                  <MenuItem value="wav">WAV</MenuItem>
                  <MenuItem value="opus">Opus</MenuItem>
                  <MenuItem value="vorbis">Vorbis</MenuItem>
                  <MenuItem value="aac">AAC</MenuItem>
                </>
              ) : (
                <>
                  <MenuItem value="mp4">MP4</MenuItem>
                  <MenuItem value="mkv">MKV</MenuItem>
                  <MenuItem value="webm">WebM</MenuItem>
                </>
              )}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Quality</InputLabel>
            <Select
              label="Quality"
              value={convertQuality}
              onChange={(e) => setConvertQuality(e.target.value)}
            >
              <MenuItem value="best">Best</MenuItem>
              <MenuItem value="high">High</MenuItem>
              <MenuItem value="medium">Medium</MenuItem>
              <MenuItem value="low">Low</MenuItem>
            </Select>
          </FormControl>
        </Box>

        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
          <Button
            variant="outlined"
            onClick={handleDryRun}
            disabled={busy || !targetPaths.length}
          >
            Dry run (writable check)
          </Button>
          <Button
            variant="contained"
            color="primary"
            onClick={handleApplyMetadata}
            disabled={busy || !targetPaths.length || !canApplyMetadata}
          >
            Apply metadata
          </Button>
          <Button
            variant="contained"
            color="secondary"
            startIcon={<PlayArrowIcon />}
            onClick={handleConvert}
            disabled={busy || !targetPaths.length || disabled}
          >
            Convert
          </Button>
          <Button
            variant="outlined"
            color="warning"
            startIcon={<StopIcon />}
            onClick={handleStop}
            disabled={!busy}
          >
            Stop
          </Button>
        </Box>
      </Box>
    </Drawer>
  );
}

export default BatchLocalPanel;
