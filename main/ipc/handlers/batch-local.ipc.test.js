import { createRequire } from 'node:module';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { createFakeIpcMain } from '../../../tests/setup/fake-ipc-main.js';
import { registerHandlers } from './batch-local.js';

const require = createRequire(import.meta.url);
const batchLocal = require('../../services/batch-local.js');
const conversionService = require('../../services/conversion.js');

describe('batch-local IPC handlers', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('enumerateLocalMedia normalizes input and catches errors', async () => {
    vi.spyOn(batchLocal, 'enumeratePaths').mockReturnValue({ paths: [1], truncated: false });
    const ipc = createFakeIpcMain();
    registerHandlers(ipc);
    await expect(ipc.invoke('enumerateLocalMedia', {}, ['/a'], { x: 1 })).resolves.toEqual({
      paths: [1],
      truncated: false,
    });
    expect(batchLocal.enumeratePaths).toHaveBeenCalledWith(['/a'], { x: 1 });

    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(batchLocal, 'enumeratePaths').mockImplementation(() => {
      throw new Error('boom');
    });
    const ipc2 = createFakeIpcMain();
    registerHandlers(ipc2);
    await expect(ipc2.invoke('enumerateLocalMedia', {}, 'nope', {})).resolves.toMatchObject({
      paths: [],
      error: 'boom',
    });
  });

  it('readMetadataBatch catches errors', async () => {
    vi.spyOn(batchLocal, 'readMetadataBatch').mockResolvedValue({ results: [] });
    const ipc = createFakeIpcMain();
    registerHandlers(ipc);
    await expect(ipc.invoke('readMetadataBatch', {}, ['/p'])).resolves.toEqual({ results: [] });

    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(batchLocal, 'readMetadataBatch').mockRejectedValue(new Error('read fail'));
    const ipc2 = createFakeIpcMain();
    registerHandlers(ipc2);
    await expect(ipc2.invoke('readMetadataBatch', {}, ['/p'])).resolves.toMatchObject({
      results: [],
      error: 'read fail',
    });
  });

  it('cancelBatchJob calls services', async () => {
    vi.spyOn(batchLocal, 'cancelBatchJob').mockImplementation(() => {});
    vi.spyOn(conversionService, 'cancelConversion').mockImplementation(() => {});
    const ipc = createFakeIpcMain();
    registerHandlers(ipc);
    await expect(ipc.invoke('cancelBatchJob', {})).resolves.toEqual({ success: true });
    expect(batchLocal.cancelBatchJob).toHaveBeenCalled();
    expect(conversionService.cancelConversion).toHaveBeenCalled();
  });

  it('convertLocalBatch passes payload fields', async () => {
    vi.spyOn(batchLocal, 'convertLocalBatch').mockResolvedValue({ done: true });
    const ipc = createFakeIpcMain();
    registerHandlers(ipc);
    const payload = {
      paths: ['/a'],
      outputFolder: '/out',
      mode: 'audio',
      format: 'mp3',
      quality: 'best',
    };
    await expect(ipc.invoke('convertLocalBatch', {}, payload)).resolves.toEqual({ done: true });
    expect(batchLocal.convertLocalBatch).toHaveBeenCalledWith(
      ['/a'],
      expect.objectContaining({
        outputFolder: '/out',
        mode: 'audio',
        format: 'mp3',
        quality: 'best',
      })
    );
  });
});
