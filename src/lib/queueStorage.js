const STORAGE_KEY = 'stream-studio-queue';
const OLD_STORAGE_KEY = 'media-converter-queue';

/**
 * @returns {{ items: Array<unknown>, loadError: string | null }}
 */
export function loadQueueFromStorage() {
  try {
    let raw = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
    if (!raw && typeof window !== 'undefined') {
      const oldRaw = localStorage.getItem(OLD_STORAGE_KEY);
      if (oldRaw) {
        localStorage.setItem(STORAGE_KEY, oldRaw);
        localStorage.removeItem(OLD_STORAGE_KEY);
        raw = oldRaw;
      }
    }
    if (!raw) {
      return { items: [], loadError: null };
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      console.warn('Queue storage: saved data was not an array, starting empty');
      return {
        items: [],
        loadError: 'Saved queue data was invalid and was not restored.',
      };
    }
    const items = parsed
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
    return { items, loadError: null };
  } catch (err) {
    console.warn('Queue storage: failed to load queue from localStorage', err);
    return {
      items: [],
      loadError: 'Could not read saved queue (storage may be full or unavailable).',
    };
  }
}

/**
 * @param {unknown[]} queue
 * @returns {{ success: boolean, error?: string }}
 */
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
    return { success: true };
  } catch (err) {
    console.warn('Queue storage: failed to save queue to localStorage', err);
    return {
      success: false,
      error:
        err?.name === 'QuotaExceededError'
          ? 'Browser storage is full; the queue could not be saved.'
          : 'The queue could not be saved to browser storage.',
    };
  }
}
