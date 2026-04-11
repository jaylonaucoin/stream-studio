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

  it('saveSettings sanitizes patch fields', () => {
    saveSettings({
      notificationsEnabled: 0,
      defaultAudioFormat: 'x'.repeat(100),
      defaultMode: 'invalid',
      theme: 'neon',
    });
    const s = getSettings();
    expect(s.notificationsEnabled).toBe(false);
    expect(s.defaultAudioFormat.length).toBeLessThanOrEqual(32);
    expect(['audio', 'video']).toContain(s.defaultMode);
    expect(['light', 'dark', 'system']).toContain(s.theme);
  });

  it('saveSettings clamps maxHistoryItems and defaultSearchLimit', () => {
    saveSettings({ maxHistoryItems: 9999, defaultSearchLimit: 500 });
    const s = getSettings();
    expect(s.maxHistoryItems).toBe(500);
    expect(s.defaultSearchLimit).toBe(100);
  });
});
