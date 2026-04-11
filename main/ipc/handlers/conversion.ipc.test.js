import { createRequire } from 'node:module';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { createFakeIpcMain } from '../../../tests/setup/fake-ipc-main.js';
import { registerHandlers } from './conversion.js';

const require = createRequire(import.meta.url);
const conversionService = require('../../services/conversion.js');

describe('conversion IPC handlers', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('convert delegates to service', async () => {
    vi.spyOn(conversionService, 'convert').mockResolvedValue({ success: true });
    const ipc = createFakeIpcMain();
    registerHandlers(ipc);
    await expect(
      ipc.invoke('convert', {}, 'https://example.com/v', { format: 'mp3' })
    ).resolves.toEqual({ success: true });
    expect(conversionService.convert).toHaveBeenCalledWith('https://example.com/v', {
      format: 'mp3',
    });
  });

  it('convertLocalFile delegates to service', async () => {
    vi.spyOn(conversionService, 'convertLocalFile').mockResolvedValue({ ok: 1 });
    const ipc = createFakeIpcMain();
    registerHandlers(ipc);
    await expect(ipc.invoke('convertLocalFile', {}, '/f.mp3', {})).resolves.toEqual({ ok: 1 });
  });

  it('cancel delegates to service', async () => {
    vi.spyOn(conversionService, 'cancelConversion').mockReturnValue({ success: true, cancelled: true });
    const ipc = createFakeIpcMain();
    registerHandlers(ipc);
    await expect(ipc.invoke('cancel', {})).resolves.toEqual({
      success: true,
      cancelled: true,
    });
  });
});
