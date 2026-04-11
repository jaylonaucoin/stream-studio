import { describe, it, expect } from 'vitest';
import {
  isIpcFailure,
  historyItemsFromResponse,
  historyErrorFromResponse,
} from './ipcResult.js';

describe('isIpcFailure', () => {
  it('detects failure objects', () => {
    expect(isIpcFailure({ success: false })).toBe(true);
    expect(isIpcFailure({ success: true })).toBe(false);
    expect(isIpcFailure(null)).toBeFalsy();
  });
});

describe('historyItemsFromResponse', () => {
  it('returns items on success', () => {
    const items = [{ id: '1' }];
    expect(historyItemsFromResponse({ success: true, items })).toBe(items);
  });

  it('returns empty array otherwise', () => {
    expect(historyItemsFromResponse({ success: false })).toEqual([]);
    expect(historyItemsFromResponse({ success: true, items: 'x' })).toEqual([]);
  });
});

describe('historyErrorFromResponse', () => {
  it('returns error message on failure', () => {
    expect(historyErrorFromResponse({ success: false, error: 'oops' })).toBe('oops');
    expect(historyErrorFromResponse({ success: false })).toBe('Failed to load history');
  });

  it('returns null on success', () => {
    expect(historyErrorFromResponse({ success: true, items: [] })).toBe(null);
  });
});
