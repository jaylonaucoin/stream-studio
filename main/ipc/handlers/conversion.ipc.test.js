import { createRequire } from 'node:module';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { createFakeIpcMain } from '../../../tests/setup/fake-ipc-main.js';
import { registerHandlers } from './conversion.js';

const require = createRequire(import.meta.url);
const conversionService = require('../../services/conversion.js');

describe('conversion IPC handlers', () => {
  const prevE2e = process.env.STREAM_STUDIO_E2E;
  const prevMock = process.env.STREAM_STUDIO_E2E_MOCK_CONVERT;

  afterEach(() => {
    vi.restoreAllMocks();
    if (prevE2e === undefined) delete process.env.STREAM_STUDIO_E2E;
    else process.env.STREAM_STUDIO_E2E = prevE2e;
    if (prevMock === undefined) delete process.env.STREAM_STUDIO_E2E_MOCK_CONVERT;
    else process.env.STREAM_STUDIO_E2E_MOCK_CONVERT = prevMock;
  });

  it('convert delegates to service', async () => {
    delete process.env.STREAM_STUDIO_E2E;
    delete process.env.STREAM_STUDIO_E2E_MOCK_CONVERT;
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

  it('convert returns mock result when E2E mock env is set', async () => {
    process.env.STREAM_STUDIO_E2E = '1';
    process.env.STREAM_STUDIO_E2E_MOCK_CONVERT = '1';
    const spy = vi.spyOn(conversionService, 'convert');
    const ipc = createFakeIpcMain();
    registerHandlers(ipc);
    await expect(ipc.invoke('convert', {}, 'https://example.com/v', {})).resolves.toMatchObject({
      success: true,
      fileName: 'e2e-mock-output.mp3',
    });
    expect(spy).not.toHaveBeenCalled();
  });

  it('convertLocalFile delegates to service', async () => {
    vi.spyOn(conversionService, 'convertLocalFile').mockResolvedValue({ ok: 1 });
    const ipc = createFakeIpcMain();
    registerHandlers(ipc);
    await expect(ipc.invoke('convertLocalFile', {}, '/f.mp3', {})).resolves.toEqual({ ok: 1 });
  });

  it('cancel delegates to service', async () => {
    vi.spyOn(conversionService, 'cancelConversion').mockReturnValue({
      success: true,
      cancelled: true,
    });
    const ipc = createFakeIpcMain();
    registerHandlers(ipc);
    await expect(ipc.invoke('cancel', {})).resolves.toEqual({
      success: true,
      cancelled: true,
    });
  });
});
