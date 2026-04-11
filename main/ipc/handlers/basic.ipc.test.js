import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createFakeIpcMain } from '../../../tests/setup/fake-ipc-main.js';
import { registerHandlers } from './basic.js';
import store from '../../store.js';

vi.mock('../../window.js', () => ({
  getMainWindow: () => null,
}));

describe('basic IPC handlers', () => {
  beforeEach(() => {
    if (typeof store.clear === 'function') {
      store.clear();
    }
  });

  it('ping returns pong', async () => {
    const ipc = createFakeIpcMain();
    registerHandlers(ipc);
    await expect(ipc.invoke('ping', {})).resolves.toBe('pong');
  });

  it('getAppVersion returns app version', async () => {
    const ipc = createFakeIpcMain();
    registerHandlers(ipc);
    await expect(ipc.invoke('getAppVersion', {})).resolves.toBe('1.0.0');
  });

  it('getSettings returns persisted shape', async () => {
    const ipc = createFakeIpcMain();
    registerHandlers(ipc);
    const settings = await ipc.invoke('getSettings', {});
    expect(settings).toMatchObject({
      defaultMode: 'audio',
      theme: 'dark',
    });
    expect(settings.discogsToken).toBeDefined();
  });

  it('saveSettings merges allowed keys', async () => {
    const ipc = createFakeIpcMain();
    registerHandlers(ipc);
    const updated = await ipc.invoke('saveSettings', {}, { theme: 'light' });
    expect(updated.theme).toBe('light');
    const again = await ipc.invoke('getSettings', {});
    expect(again.theme).toBe('light');
  });

  it('getHistory returns success wrapper', async () => {
    const ipc = createFakeIpcMain();
    registerHandlers(ipc);
    const res = await ipc.invoke('getHistory', {});
    expect(res).toEqual({ success: true, items: [] });
  });
});
