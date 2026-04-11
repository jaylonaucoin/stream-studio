import { describe, it, expect, beforeEach } from 'vitest';
import store from '../store.js';
import { getSettings, saveSettings } from './settings.js';

describe('settings service', () => {
  beforeEach(() => {
    store.clear();
  });

  it('getSettings returns defaults merged with discogsToken string', () => {
    const s = getSettings();
    expect(s.defaultMode).toBe('audio');
    expect(s.theme).toBe('dark');
    expect(s.discogsToken).toBe('');
  });

  it('saveSettings applies allowed keys and rejects invalid theme', () => {
    saveSettings({ theme: 'dark', defaultMode: 'video' });
    let s = getSettings();
    expect(s.defaultMode).toBe('video');

    saveSettings({ theme: 'invalid-theme' });
    s = getSettings();
    expect(s.theme).toBe('dark');
  });

  it('saveSettings clamps maxHistoryItems and defaultSearchLimit', () => {
    saveSettings({ maxHistoryItems: 9999, defaultSearchLimit: 500 });
    const s = getSettings();
    expect(s.maxHistoryItems).toBe(500);
    expect(s.defaultSearchLimit).toBe(100);
  });
});
