const STORAGE_KEY = 'media-converter-queue';

export function loadQueueFromStorage() {
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item, i) => ({
        id: `restored-${Date.now()}-${i}`,
        url: item.url || '',
        status: 'pending',
        error: null,
        isPlaylist: item.isPlaylist || false,
        playlistInfo: null,
        playlistMode: item.playlistMode || 'full',
        title: item.title || null,
        thumbnail: null,
      }))
      .filter((item) => item.url);
  } catch {
    return [];
  }
}

export function saveQueueToStorage(queue) {
  try {
    const toSave = queue.map((item) => ({
      url: item.url,
      isPlaylist: item.isPlaylist,
      playlistMode: item.playlistMode || 'full',
      title: item.title,
    }));
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
    }
  } catch {
    // ignore
  }
}
