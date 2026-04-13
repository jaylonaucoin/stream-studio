/**
 * Validate and normalize queue data imported from JSON files.
 */

const PLAYLIST_MODES = new Set(['full', 'single', 'selected']);

/**
 * @param {unknown} data - Parsed JSON root value
 * @returns {{ ok: true, items: Array<{ url: string, isPlaylist: boolean, playlistMode: string, title: string | null }> } | { ok: false, error: string }}
 */
function normalizeQueueImportData(data) {
  if (!Array.isArray(data)) {
    return {
      ok: false,
      error: 'Queue file must contain a JSON array of items.',
    };
  }

  const items = [];
  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    if (!row || typeof row !== 'object' || Array.isArray(row)) {
      continue;
    }
    const url = typeof row.url === 'string' ? row.url.trim() : '';
    if (!url) {
      continue;
    }
    const pm =
      typeof row.playlistMode === 'string' && PLAYLIST_MODES.has(row.playlistMode)
        ? row.playlistMode
        : 'full';
    let title = null;
    if (row.title != null) {
      title = typeof row.title === 'string' ? row.title : String(row.title);
    }
    items.push({
      url,
      isPlaylist: Boolean(row.isPlaylist),
      playlistMode: pm,
      title,
    });
  }

  if (items.length === 0) {
    return {
      ok: false,
      error: 'No valid queue entries found. Each item needs a non-empty "url" string.',
    };
  }

  return { ok: true, items };
}

module.exports = { normalizeQueueImportData, PLAYLIST_MODES };
