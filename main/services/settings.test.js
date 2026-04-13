import { describe, it, expect, beforeEach } from 'vitest';
import store from '../store.js';
import {
  getSettings,
  saveSettings,
  getOutputFolder,
  setOutputFolder,
  getWindowBounds,
  saveWindowBounds,
} from './settings.js';

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

  it('saveSettings ignores keys not in allowed list', () => {
    saveSettings({ theme: 'light' });
    saveSettings({ extraKey: 'nope', rogue: 123 });
    const s = getSettings();
    expect('extraKey' in s).toBe(false);
    expect('rogue' in s).toBe(false);
    expect(s.theme).toBe('light');
  });

  it('saveSettings uses default maxHistoryItems when value is non-finite', () => {
    saveSettings({ maxHistoryItems: Number.NaN });
    const s = getSettings();
    expect(s.maxHistoryItems).toBe(50);
  });

  it('getOutputFolder and setOutputFolder round-trip', () => {
    expect(getOutputFolder() == null).toBe(true);
    setOutputFolder('/tmp/out');
    expect(getOutputFolder()).toBe('/tmp/out');
  });

  it('getWindowBounds and saveWindowBounds round-trip', () => {
    const b = { width: 400, height: 300, x: 10, y: 20 };
    saveWindowBounds(b);
    expect(getWindowBounds()).toEqual(b);
  });

  it('saveSettings stores plain discogsToken when encryption unavailable', () => {
    saveSettings({ discogsToken: 'plain-token' });
    const s = getSettings();
    expect(s.discogsToken).toBe('plain-token');
  });

  it('saveSettings clears discogsToken when empty string with encryption off', () => {
    saveSettings({ discogsToken: 'x' });
    saveSettings({ discogsToken: '' });
    const s = getSettings();
    expect(s.discogsToken).toBe('');
  });
});
