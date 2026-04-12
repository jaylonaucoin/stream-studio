import { describe, it, expect, beforeEach, vi } from 'vitest';
import store from '../store.js';
import { buildHistoryItem } from '../../tests/factories.js';
import { addToHistory, getHistory, clearHistory, removeHistoryItem } from './history.js';

function historyPayload(overrides = {}) {
  const { id: _id, ...rest } = buildHistoryItem(overrides);
  return rest;
}

describe('history service', () => {
  beforeEach(() => {
    store.clear();
  });

  it('addToHistory prepends and respects maxHistoryItems', () => {
    store.set('settings', { ...store.get('settings'), maxHistoryItems: 2 });
    addToHistory(historyPayload({ fileName: 'a.mp3', url: 'https://a' }));
    addToHistory(historyPayload({ fileName: 'b.mp3', url: 'https://b' }));
    addToHistory(historyPayload({ fileName: 'c.mp3', url: 'https://c' }));
    const items = getHistory();
    expect(items).toHaveLength(2);
    expect(items[0].fileName).toBe('c.mp3');
    expect(items[1].fileName).toBe('b.mp3');
  });

  it('clearHistory empties list', () => {
    addToHistory(historyPayload({ fileName: 'x.mp3', url: 'https://x' }));
    expect(getHistory()).toHaveLength(1);
    expect(clearHistory()).toEqual([]);
    expect(getHistory()).toHaveLength(0);
  });

  it('removeHistoryItem filters by id', () => {
    let tick = 1000;
    vi.spyOn(Date, 'now').mockImplementation(() => tick++);
    addToHistory(historyPayload({ fileName: 'one.mp3', url: 'https://1' }));
    addToHistory(historyPayload({ fileName: 'two.mp3', url: 'https://2' }));
    vi.restoreAllMocks();
    const [first, second] = getHistory();
    const updated = removeHistoryItem(second.id);
    expect(updated).toHaveLength(1);
    expect(updated[0].id).toBe(first.id);
  });

  it('removeHistoryItem with unknown id leaves list unchanged', () => {
    addToHistory(historyPayload({ fileName: 'a.mp3', url: 'https://a' }));
    const before = getHistory();
    const after = removeHistoryItem('missing-id');
    expect(after).toHaveLength(before.length);
  });

  it('uses default maxHistoryItems of 50 when settings omit the key', () => {
    const s = { ...store.get('settings') };
    delete s.maxHistoryItems;
    store.set('settings', s);
    for (let i = 0; i < 52; i++) {
      addToHistory(historyPayload({ fileName: `f${i}.mp3`, url: `https://u${i}` }));
    }
    expect(getHistory()).toHaveLength(50);
  });

  it('addToHistory assigns string id and ISO timestamp', () => {
    vi.spyOn(Date, 'now').mockReturnValue(1234567890);
    addToHistory(historyPayload({ fileName: 't.mp3', url: 'https://t' }));
    const [first] = getHistory();
    expect(first.id).toBe('1234567890');
    expect(first.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    vi.restoreAllMocks();
  });

  it('getHistory returns empty array when conversionHistory is missing', () => {
    store.delete('conversionHistory');
    expect(getHistory()).toEqual([]);
  });
});
