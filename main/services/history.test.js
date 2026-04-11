import { describe, it, expect, beforeEach } from 'vitest';
import store from '../store.js';
import { addToHistory, getHistory, clearHistory, removeHistoryItem } from './history.js';

describe('history service', () => {
  beforeEach(() => {
    store.clear();
  });

  it('addToHistory prepends and respects maxHistoryItems', () => {
    store.set('settings', { ...store.get('settings'), maxHistoryItems: 2 });
    addToHistory({ fileName: 'a.mp3', url: 'https://a', format: 'mp3', mode: 'audio' });
    addToHistory({ fileName: 'b.mp3', url: 'https://b', format: 'mp3', mode: 'audio' });
    addToHistory({ fileName: 'c.mp3', url: 'https://c', format: 'mp3', mode: 'audio' });
    const items = getHistory();
    expect(items).toHaveLength(2);
    expect(items[0].fileName).toBe('c.mp3');
    expect(items[1].fileName).toBe('b.mp3');
  });

  it('clearHistory empties list', () => {
    addToHistory({ fileName: 'x.mp3', url: 'https://x', format: 'mp3', mode: 'audio' });
    expect(getHistory()).toHaveLength(1);
    clearHistory();
    expect(getHistory()).toHaveLength(0);
  });

  it('removeHistoryItem filters by id', () => {
    addToHistory({ fileName: 'one.mp3', url: 'https://1', format: 'mp3', mode: 'audio' });
    addToHistory({ fileName: 'two.mp3', url: 'https://2', format: 'mp3', mode: 'audio' });
    const [first, second] = getHistory();
    const updated = removeHistoryItem(second.id);
    expect(updated).toHaveLength(1);
    expect(updated[0].id).toBe(first.id);
  });
});
