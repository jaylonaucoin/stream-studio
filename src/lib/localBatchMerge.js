/**
 * Pure helpers for LocalLibraryBatchView batch row merging and patch building.
 */

export function patchForStrategy(metadata, strategy) {
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

export function patchSharedOnly(metadata, strategy) {
  const rest = { ...metadata };
  delete rest.title;
  delete rest.artist;
  delete rest.trackNumber;
  return patchForStrategy(rest, strategy);
}

export function mergeBatchJobIntoRows(prev, targetPathSet, results, cancelled, ipcError, phase) {
  const map = new Map((results || []).map((r) => [r.path, r]));
  const workingStatus = phase === 'convert' ? 'converting' : 'working';
  const successStatus = phase === 'convert' ? 'converted' : 'done';
  return prev.map((row) => {
    if (!targetPathSet.has(row.path) || row.status !== workingStatus) return row;
    const r = map.get(row.path);
    if (r) {
      return {
        ...row,
        ...(r.success && r.newPath ? { path: r.newPath } : {}),
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

export function buildPerFilePatchesMap(rows, targetPathSet, strategy) {
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
