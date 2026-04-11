import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import {
  Box,
  Typography,
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
  TextField,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Snackbar,
  Stack,
} from '@mui/material';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import RefreshIcon from '@mui/icons-material/Refresh';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import StopIcon from '@mui/icons-material/Stop';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import SortIcon from '@mui/icons-material/Sort';
import { MetadataFormFields } from './MetadataFormFields';
import ThumbnailSection from './metadata/ThumbnailSection';
import { validateMetadata, fileStemFromPath } from '../utils';

export const emptySharedMetadata = () => ({
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

function patchSharedOnly(metadata, strategy) {
  const rest = { ...metadata };
  delete rest.title;
  delete rest.artist;
  delete rest.trackNumber;
  return patchForStrategy(rest, strategy);
}

function mergeBatchJobIntoRows(prev, targetPathSet, results, cancelled, ipcError, phase) {
  const map = new Map((results || []).map((r) => [r.path, r]));
  const workingStatus = phase === 'convert' ? 'converting' : 'working';
  const successStatus = phase === 'convert' ? 'converted' : 'done';
  return prev.map((row) => {
    if (!targetPathSet.has(row.path) || row.status !== workingStatus) return row;
    const r = map.get(row.path);
    if (r) {
      return {
        ...row,
        status: r.success ? successStatus : 'error',
        error: r.success ? null : r.error || null,
      };
    }
    if (ipcError) {
      return { ...row, status: 'error', error: ipcError };
    }
    if (cancelled) {
      return { ...row, status: 'cancelled', error: 'Stopped before this file was processed' };
    }
    return { ...row, status: 'error', error: 'No result returned' };
  });
}

function buildPerFilePatchesMap(rows, targetPathSet, strategy) {
  const map = {};
  for (const row of rows) {
    if (!targetPathSet.has(row.path)) continue;
    const t = row.title != null ? String(row.title) : '';
    const a = row.artist != null ? String(row.artist) : '';
    const tr = row.trackNumber != null ? String(row.trackNumber) : '';
    const partial = {};
    if (strategy === 'merge') {
      if (t.trim()) partial.title = t;
      if (a.trim()) partial.artist = a;
      if (tr.trim()) partial.trackNumber = tr;
    } else {
      partial.title = t;
      partial.artist = a;
      partial.trackNumber = tr;
    }
    if (Object.keys(partial).length > 0) {
      map[row.path] = partial;
    }
  }
  return map;
}

function LocalLibraryBatchView({
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
  const [metadata, setMetadata] = useState(emptySharedMetadata);
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [coverTouched, setCoverTouched] = useState(false);
  const [strategy, setStrategy] = useState('merge');
  const [applyScope, setApplyScope] = useState('selected');
  const [busy, setBusy] = useState(false);
  const [batchPhase, setBatchPhase] = useState(null);
  const [progress, setProgress] = useState({ done: 0, total: 0, currentPath: null });
  const [thumbError, setThumbError] = useState(null);
  const [batchReadError, setBatchReadError] = useState(null);
  const [coverTooLargeHint, setCoverTooLargeHint] = useState(false);
  const [replaceConfirmOpen, setReplaceConfirmOpen] = useState(false);
  const [batchSnackbar, setBatchSnackbar] = useState({
    open: false,
    message: '',
    severity: 'info',
  });
  const pendingReplaceActionRef = useRef(null);
  const [convertMode, setConvertMode] = useState(defaultMode);
  const [convertFormat, setConvertFormat] = useState(
    defaultMode === 'audio' ? defaultAudioFormat : defaultVideoFormat
  );
  const [convertQuality, setConvertQuality] = useState(defaultQuality);

  useEffect(() => {
    setConvertMode(defaultMode);
    setConvertFormat(defaultMode === 'audio' ? defaultAudioFormat : defaultVideoFormat);
    setConvertQuality(defaultQuality);
  }, [defaultMode, defaultAudioFormat, defaultVideoFormat, defaultQuality]);

  useEffect(() => {
    if (!window.api?.onBatchJobProgress) return;
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
  }, []);

  const selectedPaths = useMemo(
    () => rows.filter((r) => r.selected).map((r) => r.path),
    [rows]
  );

  const targetPaths = useMemo(() => {
    if (applyScope === 'all') return rows.map((r) => r.path);
    return selectedPaths;
  }, [applyScope, rows, selectedPaths]);

  const targetPathSet = useMemo(() => new Set(targetPaths), [targetPaths]);

  const metadataValidationErrors = useMemo(() => {
    const err = { ...validateMetadata(metadata) };
    const totalNum = parseInt(String(metadata.totalTracks || '').trim(), 10);
    if (!Number.isNaN(totalNum) && totalNum > 0) {
      const over = rows.some((row) => {
        const t = parseInt(String(row.trackNumber || '').trim(), 10);
        return !Number.isNaN(t) && t > totalNum;
      });
      if (over) {
        err.totalTracks =
          err.totalTracks || `A file track number exceeds album total (${totalNum})`;
      }
    }
    return err;
  }, [metadata, rows]);

  const allSelected = rows.length > 0 && rows.every((r) => r.selected);
  const someSelected = rows.some((r) => r.selected);

  const handleMetadataChange = useCallback((field, value) => {
    setMetadata((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleClearSharedForm = useCallback(() => {
    setMetadata(emptySharedMetadata());
    setThumbnailUrl('');
    setCoverTouched(false);
    setThumbError(null);
  }, []);

  const enrichRowsWithMetadata = useCallback(async (paths) => {
    if (!paths.length || !window.api?.readMetadataBatch) return { ok: true };
    try {
      const res = await window.api.readMetadataBatch(paths);
      if (res?.error) {
        setBatchReadError(res.error);
        return { ok: false, error: res.error };
      }
      const results = res.results || [];
      setBatchReadError(null);
      const byPath = new Map(results.map((r) => [r.path, r]));
      setRows((prev) =>
        prev.map((row) => {
          const r = byPath.get(row.path);
          if (!r) return row;
          if (!r.success) {
            return { ...row, status: 'read error', error: r.error || 'read failed' };
          }
          const m = r.metadata || {};
          const tagTitle = m.title != null ? String(m.title).trim() : '';
          return {
            ...row,
            title: tagTitle !== '' ? tagTitle : fileStemFromPath(row.path),
            artist: m.artist || '',
            album: m.album || '',
            trackNumber: m.trackNumber || '',
            status: '',
            error: null,
          };
        })
      );
      return { ok: true };
    } catch (e) {
      const msg = e?.message || 'Failed to read metadata';
      setBatchReadError(msg);
      return { ok: false, error: msg };
    }
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
            title: fileStemFromPath(p),
            artist: '',
            album: '',
            trackNumber: '',
            status: '',
            error: null,
          });
        }
        return [...prev, ...added];
      });
      if (expanded.length) {
        await enrichRowsWithMetadata(expanded);
      }
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

  const handleLoadFromSelection = useCallback(async () => {
    const sel = rows.filter((r) => r.selected);
    if (sel.length !== 1 || !window.api?.readMetadataBatch) return;
    const p = sel[0].path;
    setBusy(true);
    setCoverTooLargeHint(false);
    try {
      const res = await window.api.readMetadataBatch([p]);
      if (res?.error) {
        setBatchSnackbar({ open: true, message: res.error, severity: 'error' });
        return;
      }
      const r = (res.results || [])[0];
      if (!r?.success || !r.metadata) {
        setBatchSnackbar({
          open: true,
          message: r?.error || 'Could not read metadata for selection',
          severity: 'error',
        });
        return;
      }
      const m = r.metadata;
      const tagTitle = m.title != null ? String(m.title).trim() : '';
      setRows((prev) =>
        prev.map((row) =>
          row.path === p
            ? {
                ...row,
                title: tagTitle !== '' ? tagTitle : fileStemFromPath(p),
                artist: m.artist || '',
                album: m.album || '',
                trackNumber: m.trackNumber || '',
              }
            : row
        )
      );
      setMetadata((prev) => ({
        ...prev,
        album: m.album || '',
        albumArtist: m.albumArtist || '',
        genre: m.genre || '',
        year: m.year || '',
        totalTracks: m.totalTracks || '',
        composer: m.composer || '',
        publisher: m.publisher || '',
        comment: m.comment || '',
        description: m.description || '',
        language: m.language || prev.language || 'eng',
        bpm: m.bpm || '',
        copyright: m.copyright || '',
      }));
      if (r.pictureDataUrl) {
        setThumbnailUrl(r.pictureDataUrl);
        setCoverTouched(false);
        setCoverTooLargeHint(false);
      } else if (r.hasPicture) {
        setCoverTooLargeHint(true);
      }
    } catch (e) {
      setBatchSnackbar({
        open: true,
        message: e?.message || 'Failed to read selection',
        severity: 'error',
      });
    } finally {
      setBusy(false);
    }
  }, [rows]);

  const handleRemoveSelected = useCallback(() => {
    setRows((prev) => prev.filter((r) => !r.selected));
  }, []);

  const handleClearAll = useCallback(() => {
    if (busy) return;
    setRows([]);
    setTruncatedHint(false);
  }, [busy]);

  const handleSortByPath = useCallback(() => {
    setRows((prev) => [...prev].sort((a, b) => a.path.localeCompare(b.path)));
  }, []);

  const handleToggleAll = useCallback((checked) => {
    setRows((prev) => prev.map((r) => ({ ...r, selected: checked })));
  }, []);

  const handleToggleRow = useCallback((id) => {
    setRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, selected: !r.selected } : r))
    );
  }, []);

  const updateRowField = useCallback((id, field, value) => {
    setRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [field]: value } : r))
    );
  }, []);

  const handleDryRun = useCallback(async () => {
    if (!targetPaths.length || !window.api?.dryRunLocalBatch) return;
    setBusy(true);
    try {
      const res = await window.api.dryRunLocalBatch(targetPaths);
      if (res?.error) {
        setBatchSnackbar({ open: true, message: res.error, severity: 'error' });
        return;
      }
      const results = res.results || [];
      const map = new Map(results.map((r) => [r.path, r]));
      setRows((prev) =>
        prev.map((row) => {
          if (!targetPathSet.has(row.path)) return row;
          const r = map.get(row.path);
          if (!r?.ok) return { ...row, status: 'blocked', error: r?.error || 'not writable' };
          return { ...row, status: 'ok', error: null };
        })
      );
    } finally {
      setBusy(false);
    }
  }, [targetPaths, targetPathSet]);

  const perFileMapForTargets = useMemo(
    () => buildPerFilePatchesMap(rows, targetPathSet, strategy),
    [rows, targetPathSet, strategy]
  );

  const sharedPatchKeys = useMemo(
    () => patchSharedOnly(metadata, strategy),
    [metadata, strategy]
  );

  const canApplyMetadata = useMemo(() => {
    if (!targetPaths.length) return false;
    if (Object.keys(sharedPatchKeys).length > 0) return true;
    if (coverTouched && thumbnailUrl) return true;
    if (Object.keys(perFileMapForTargets).length > 0) return true;
    return false;
  }, [targetPaths.length, sharedPatchKeys, coverTouched, thumbnailUrl, perFileMapForTargets]);

  const executeApplyMetadata = useCallback(async () => {
    if (!targetPaths.length || !window.api?.applyMetadataBatch || !canApplyMetadata) return;
    setBusy(true);
    setRows((prev) =>
      prev.map((r) =>
        targetPathSet.has(r.path) ? { ...r, status: 'working', error: null } : r
      )
    );
    try {
      const sharedPatch = patchSharedOnly(metadata, strategy);
      const perFilePatches = buildPerFilePatchesMap(rows, targetPathSet, strategy);
      const res = await window.api.applyMetadataBatch({
        paths: targetPaths,
        patch: sharedPatch,
        perFilePatches,
        thumbnailDataUrl: coverTouched && thumbnailUrl ? thumbnailUrl : undefined,
        strategy,
      });
      const ipcError = res?.error || null;
      const list = res?.results || [];
      const cancelled = !!res?.cancelled;
      setRows((prev) =>
        mergeBatchJobIntoRows(prev, targetPathSet, list, cancelled, ipcError, 'metadata')
      );
      if (ipcError) {
        setBatchSnackbar({ open: true, message: ipcError, severity: 'error' });
      } else {
        const ok = list.filter((x) => x.success).length;
        const bad = list.filter((x) => !x.success).length;
        if (cancelled) {
          setBatchSnackbar({
            open: true,
            message: 'Tag write stopped; some files may be unchanged.',
            severity: 'warning',
          });
        } else {
          setBatchSnackbar({
            open: true,
            message: `Tags written: ${ok} succeeded${bad ? `, ${bad} failed` : ''}.`,
            severity: bad ? 'warning' : 'success',
          });
        }
      }
      if (!cancelled && !ipcError) await enrichRowsWithMetadata(targetPaths);
    } finally {
      setBusy(false);
      setProgress({ done: 0, total: 0, currentPath: null });
      setBatchPhase(null);
    }
  }, [
    targetPaths,
    targetPathSet,
    rows,
    metadata,
    strategy,
    coverTouched,
    thumbnailUrl,
    enrichRowsWithMetadata,
    canApplyMetadata,
  ]);

  const handleApplyMetadataClick = useCallback(() => {
    if (!targetPaths.length || !canApplyMetadata) return;
    if (Object.keys(metadataValidationErrors).length > 0) {
      setBatchSnackbar({
        open: true,
        message: 'Fix validation errors in shared fields before writing tags.',
        severity: 'error',
      });
      return;
    }
    if (strategy === 'replace') {
      pendingReplaceActionRef.current = 'apply';
      setReplaceConfirmOpen(true);
      return;
    }
    executeApplyMetadata();
  }, [
    targetPaths.length,
    canApplyMetadata,
    metadataValidationErrors,
    strategy,
    executeApplyMetadata,
  ]);

  const executeConvert = useCallback(async () => {
    if (!targetPaths.length || !window.api?.convertLocalBatch) return;
    setBusy(true);
    setRows((prev) =>
      prev.map((r) =>
        targetPathSet.has(r.path) ? { ...r, status: 'converting', error: null } : r
      )
    );
    try {
      const sharedPatch = patchSharedOnly(metadata, strategy);
      const perFilePatches = buildPerFilePatchesMap(rows, targetPathSet, strategy);
      const res = await window.api.convertLocalBatch({
        paths: targetPaths,
        outputFolder,
        mode: convertMode,
        format: convertFormat,
        quality: convertQuality,
        metadataPatch: Object.keys(sharedPatch).length > 0 ? sharedPatch : null,
        perFilePatches: Object.keys(perFilePatches).length > 0 ? perFilePatches : undefined,
        thumbnailDataUrl:
          coverTouched && thumbnailUrl ? thumbnailUrl : undefined,
        metadataStrategy: strategy,
      });
      const ipcError = res?.error || null;
      const list = res?.results || [];
      const cancelled = !!res?.cancelled;
      setRows((prev) =>
        mergeBatchJobIntoRows(prev, targetPathSet, list, cancelled, ipcError, 'convert')
      );
      if (ipcError) {
        setBatchSnackbar({ open: true, message: ipcError, severity: 'error' });
      } else {
        const ok = list.filter((x) => x.success).length;
        const bad = list.filter((x) => !x.success).length;
        if (cancelled) {
          setBatchSnackbar({
            open: true,
            message: 'Conversion stopped; some files may be unfinished.',
            severity: 'warning',
          });
        } else {
          setBatchSnackbar({
            open: true,
            message: `Converted: ${ok} succeeded${bad ? `, ${bad} failed` : ''}.`,
            severity: bad ? 'warning' : 'success',
          });
        }
      }
      if (!cancelled && !ipcError) onBatchComplete?.();
    } finally {
      setBusy(false);
      setProgress({ done: 0, total: 0, currentPath: null });
      setBatchPhase(null);
    }
  }, [
    targetPaths,
    targetPathSet,
    rows,
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

  const handleConvertClick = useCallback(() => {
    if (!targetPaths.length || disabled) return;
    if (Object.keys(metadataValidationErrors).length > 0) {
      setBatchSnackbar({
        open: true,
        message: 'Fix validation errors in shared fields before converting.',
        severity: 'error',
      });
      return;
    }
    if (strategy === 'replace') {
      pendingReplaceActionRef.current = 'convert';
      setReplaceConfirmOpen(true);
      return;
    }
    executeConvert();
  }, [
    targetPaths.length,
    disabled,
    metadataValidationErrors,
    strategy,
    executeConvert,
  ]);

  const handleReplaceConfirm = useCallback(() => {
    const action = pendingReplaceActionRef.current;
    setReplaceConfirmOpen(false);
    pendingReplaceActionRef.current = null;
    if (action === 'apply') executeApplyMetadata();
    else if (action === 'convert') executeConvert();
  }, [executeApplyMetadata, executeConvert]);

  const handleReplaceConfirmCancel = useCallback(() => {
    setReplaceConfirmOpen(false);
    pendingReplaceActionRef.current = null;
  }, []);

  const handleStop = useCallback(async () => {
    await window.api?.cancelBatchJob?.();
  }, []);

  const progressPct =
    progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0;

  const oneRowSelected = selectedPaths.length === 1;

  return (
    <Stack spacing={2} sx={{ mt: 2 }}>
      <Typography variant="body2" color="text.secondary">
        Add one file or many (folders expand to all supported media). Use the table for
        per-file <strong>title</strong>, <strong>artist</strong>, and <strong>track</strong>; use the
        sections below for shared album info and artwork. <strong>Write tags</strong> updates files
        in place without re-encoding. <strong>Convert</strong> writes new files to your output
        folder, then applies tags.
      </Typography>

      {disabled && (
        <Alert severity="warning">
          FFmpeg is not available. Conversion is disabled; tagging may still work for some formats
          (e.g. MP3).
        </Alert>
      )}

      {truncatedHint && (
        <Alert severity="info" onClose={() => setTruncatedHint(false)}>
          File list was truncated at the maximum allowed count. Add more files in a second batch if
          needed.
        </Alert>
      )}

      {batchReadError && (
        <Alert severity="error" onClose={() => setBatchReadError(null)}>
          {batchReadError}
        </Alert>
      )}

      <Paper
        variant="outlined"
        sx={{
          p: 2,
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
            onClick={handleLoadFromSelection}
            disabled={busy || !oneRowSelected}
          >
            Load from selection
          </Button>
          <Button
            size="small"
            startIcon={<SortIcon />}
            onClick={handleSortByPath}
            disabled={busy || rows.length < 2}
          >
            Sort by path
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
        <Box>
          <Typography variant="caption" color="text.secondary" display="block" noWrap>
            {batchPhase === 'metadata' ? 'Writing metadata' : 'Converting'} — {progress.done}/
            {progress.total}
            {progress.currentPath ? ` — ${progress.currentPath}` : ''}
          </Typography>
          <LinearProgress variant="determinate" value={progressPct} sx={{ mt: 0.5 }} />
        </Box>
      )}

      <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 320 }}>
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
              <TableCell sx={{ minWidth: 120 }}>Title</TableCell>
              <TableCell sx={{ minWidth: 100 }}>Artist</TableCell>
              <TableCell sx={{ width: 88 }}>Track</TableCell>
              <TableCell sx={{ minWidth: 100 }}>Album</TableCell>
              <TableCell>Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7}>
                  <Typography variant="body2" color="text.secondary" align="center">
                    No files yet
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow key={row.id} hover selected={row.selected}>
                  <TableCell padding="checkbox" sx={{ py: 0.5, verticalAlign: 'middle' }}>
                    <Checkbox
                      checked={row.selected}
                      onChange={() => handleToggleRow(row.id)}
                      disabled={busy}
                      inputProps={{ 'aria-label': `select ${row.path}` }}
                    />
                  </TableCell>
                  <TableCell sx={{ py: 0.5, verticalAlign: 'middle' }}>
                    <Tooltip title={row.path}>
                      <Typography variant="caption" noWrap sx={{ maxWidth: 160, display: 'block' }}>
                        {row.path}
                      </Typography>
                    </Tooltip>
                  </TableCell>
                  <TableCell sx={{ py: 0.5, verticalAlign: 'middle' }}>
                    <TextField
                      size="small"
                      fullWidth
                      value={row.title}
                      onChange={(e) => updateRowField(row.id, 'title', e.target.value)}
                      disabled={busy}
                      placeholder="Title"
                      inputProps={{ 'aria-label': `Title for ${row.path}` }}
                    />
                  </TableCell>
                  <TableCell sx={{ py: 0.5, verticalAlign: 'middle' }}>
                    <TextField
                      size="small"
                      fullWidth
                      value={row.artist}
                      onChange={(e) => updateRowField(row.id, 'artist', e.target.value)}
                      disabled={busy}
                      placeholder="Artist"
                      inputProps={{ 'aria-label': `Artist for ${row.path}` }}
                    />
                  </TableCell>
                  <TableCell sx={{ py: 0.5, verticalAlign: 'middle' }}>
                    <TextField
                      size="small"
                      fullWidth
                      value={row.trackNumber}
                      onChange={(e) => updateRowField(row.id, 'trackNumber', e.target.value)}
                      disabled={busy}
                      placeholder="#"
                      inputProps={{ 'aria-label': `Track number for ${row.path}` }}
                    />
                  </TableCell>
                  <TableCell sx={{ py: 0.5, verticalAlign: 'middle' }}>
                    <Typography variant="caption" color="text.secondary" noWrap sx={{ maxWidth: 120, display: 'block' }}>
                      {row.album}
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ py: 0.5, verticalAlign: 'middle' }}>
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

      <Divider />

      <Stack spacing={1.5}>
        <FormLabel component="legend">Apply actions to</FormLabel>
        <ToggleButtonGroup
          value={applyScope}
          exclusive
          size="small"
          onChange={(_, v) => v && setApplyScope(v)}
        >
          <ToggleButton value="selected">Selected ({selectedPaths.length})</ToggleButton>
          <ToggleButton value="all">All ({rows.length})</ToggleButton>
        </ToggleButtonGroup>
        {selectedPaths.length > 1 && (
          <Typography variant="caption" color="text.secondary" display="block">
            Bulk edit: shared fields below apply to every target; table cells set per-file title,
            artist, and track. Empty shared fields in merge mode leave existing tags unchanged.
          </Typography>
        )}

        <FormControl component="fieldset">
        <FormLabel component="legend">Tag writing mode</FormLabel>
        <RadioGroup row value={strategy} onChange={(e) => setStrategy(e.target.value)}>
          <FormControlLabel
            value="merge"
            control={<Radio size="small" />}
            label="Merge — only non-empty fields overwrite"
          />
          <FormControlLabel
            value="replace"
            control={<Radio size="small" />}
            label="Replace — missing shared fields cleared (per-file row still applied)"
          />
        </RadioGroup>
        </FormControl>

        {strategy === 'replace' && (
          <Alert severity="warning">
            Replace clears every shared tag you leave empty (album, genre, year, advanced fields) on
            all targets. Title, artist, and track in the table still apply per file. Confirm before
            write or convert.
          </Alert>
        )}

        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          <Button size="small" variant="outlined" onClick={handleClearSharedForm} disabled={busy}>
            Clear shared form
          </Button>
        </Box>
      </Stack>

      <Stack spacing={1}>
        <Accordion defaultExpanded disableGutters sx={{ border: 1, borderColor: 'divider', borderRadius: 1, '&:before': { display: 'none' } }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="subtitle2">Shared album info &amp; genre</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <MetadataFormFields
            metadata={metadata}
            onChange={handleMetadataChange}
            errors={metadataValidationErrors}
            renderSection="albumCore"
            hideTitle
            hideArtist
            showTotalTracksOnly
          />
        </AccordionDetails>
        </Accordion>

        <Accordion disableGutters sx={{ border: 1, borderColor: 'divider', borderRadius: 1, '&:before': { display: 'none' } }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="subtitle2">Advanced tags</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <MetadataFormFields
            metadata={metadata}
            onChange={handleMetadataChange}
            errors={metadataValidationErrors}
            renderSection="advanced"
            hideTitle
            hideArtist
            showTrackNumbers={false}
            showTotalTracksOnly={false}
          />
        </AccordionDetails>
        </Accordion>
      </Stack>

      <Box>
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
        {coverTooLargeHint && (
          <Alert severity="info" sx={{ mt: 1 }} onClose={() => setCoverTooLargeHint(false)}>
            This file has embedded art that is too large to preview here. You can still set a new
            cover below; it will be written on apply.
          </Alert>
        )}
      </Box>

      <Divider />

      <Stack spacing={2}>
        <Box>
          <Typography variant="subtitle2" gutterBottom>
            Convert output
          </Typography>
          <Typography variant="caption" color="text.secondary" display="block">
            New files go to your output folder (footer). Tags below are applied after conversion.
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center' }}>
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

        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
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
          onClick={handleApplyMetadataClick}
          disabled={busy || !targetPaths.length || !canApplyMetadata}
        >
          Write tags (no re-encode)
        </Button>
        <Button
          variant="contained"
          color="secondary"
          startIcon={<PlayArrowIcon />}
          onClick={handleConvertClick}
          disabled={busy || !targetPaths.length || disabled}
        >
          Convert files
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
      </Stack>

      <Dialog open={replaceConfirmOpen} onClose={handleReplaceConfirmCancel}>
        <DialogTitle>Confirm replace mode</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Replace mode clears shared tags you left empty on every target file. Per-file title,
            artist, and track from the table are still applied. Continue?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleReplaceConfirmCancel}>Cancel</Button>
          <Button onClick={handleReplaceConfirm} variant="contained" autoFocus>
            Continue
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={batchSnackbar.open}
        autoHideDuration={6000}
        onClose={() => setBatchSnackbar((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setBatchSnackbar((s) => ({ ...s, open: false }))}
          severity={batchSnackbar.severity}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {batchSnackbar.message}
        </Alert>
      </Snackbar>
    </Stack>
  );
}

export default LocalLibraryBatchView;
