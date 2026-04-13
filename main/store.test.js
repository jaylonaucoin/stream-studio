import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

describe('electron-store defaults', () => {
  it('exposes expected default settings shape', () => {
    const store = require('./store.js');
    const s = store.get('settings');
    expect(s.defaultMode).toBe('audio');
    expect(s.defaultAudioFormat).toBe('mp3');
    expect(s.theme).toBe('dark');
    expect(Array.isArray(store.get('conversionHistory'))).toBe(true);
  });
});
