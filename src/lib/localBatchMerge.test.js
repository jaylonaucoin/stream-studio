import { describe, it, expect } from 'vitest';
import {
  patchForStrategy,
  patchSharedOnly,
  mergeBatchJobIntoRows,
  buildPerFilePatchesMap,
} from './localBatchMerge.js';

describe('patchForStrategy', () => {
  it('replace fills all keys', () => {
    expect(patchForStrategy({ a: null, b: 'x' }, 'replace')).toEqual({ a: '', b: 'x' });
  });

  it('merge skips empty strings', () => {
    expect(patchForStrategy({ a: '', b: 'ok' }, 'merge')).toEqual({ b: 'ok' });
  });
});

describe('patchSharedOnly', () => {
  it('strips title, artist, trackNumber before patching', () => {
    const out = patchSharedOnly(
      { title: 'T', artist: 'A', album: 'Al', trackNumber: '1' },
      'merge'
    );
    expect(out).not.toHaveProperty('title');
    expect(out.album).toBe('Al');
  });
});

describe('mergeBatchJobIntoRows', () => {
  const paths = new Set(['/a.mp3']);
  const prev = [{ path: '/a.mp3', status: 'converting', title: 'x' }];

  it('marks success with new path', () => {
    const next = mergeBatchJobIntoRows(
      prev,
      paths,
      [{ path: '/a.mp3', success: true, newPath: '/b.mp3' }],
      false,
      null,
      'convert'
    );
    expect(next[0].path).toBe('/b.mp3');
    expect(next[0].status).toBe('converted');
  });

  it('keeps path when success without newPath', () => {
    const next = mergeBatchJobIntoRows(
      prev,
      paths,
      [{ path: '/a.mp3', success: true }],
      false,
      null,
      'convert'
    );
    expect(next[0].path).toBe('/a.mp3');
    expect(next[0].status).toBe('converted');
  });

  it('records error from failed result', () => {
    const next = mergeBatchJobIntoRows(
      prev,
      paths,
      [{ path: '/a.mp3', success: false, error: 'bad' }],
      false,
      null,
      'convert'
    );
    expect(next[0].status).toBe('error');
    expect(next[0].error).toBe('bad');
  });

  it('leaves rows not in target set unchanged', () => {
    const mixed = [
      { path: '/a.mp3', status: 'converting' },
      { path: '/b.mp3', status: 'converting' },
    ];
    const set = new Set(['/a.mp3']);
    const next = mergeBatchJobIntoRows(mixed, set, [], false, 'ipc', 'convert');
    expect(next[1]).toEqual(mixed[1]);
    expect(next[0].status).toBe('error');
  });

  it('leaves non-working rows in target set unchanged', () => {
    const mixed = [{ path: '/a.mp3', status: 'pending' }];
    const set = new Set(['/a.mp3']);
    const next = mergeBatchJobIntoRows(mixed, set, [], false, 'ipc', 'convert');
    expect(next[0].status).toBe('pending');
  });

  it('marks ipc error', () => {
    const next = mergeBatchJobIntoRows(prev, paths, [], false, 'ipc failed', 'convert');
    expect(next[0].status).toBe('error');
    expect(next[0].error).toBe('ipc failed');
  });

  it('marks cancelled', () => {
    const next = mergeBatchJobIntoRows(prev, paths, [], true, null, 'convert');
    expect(next[0].status).toBe('cancelled');
  });

  it('uses working/done status for metadata phase', () => {
    const p = [{ path: '/a.mp3', status: 'working' }];
    const next = mergeBatchJobIntoRows(
      p,
      paths,
      [{ path: '/a.mp3', success: true }],
      false,
      null,
      'metadata'
    );
    expect(next[0].status).toBe('done');
  });
});

describe('buildPerFilePatchesMap', () => {
  const rows = [
    { path: '/x.flac', title: '  ', artist: 'A', trackNumber: '2' },
    { path: '/y.flac', title: 'T', artist: '', trackNumber: '' },
  ];
  const set = new Set(['/x.flac', '/y.flac']);

  it('merge only non-empty trimmed fields', () => {
    const m = buildPerFilePatchesMap(rows, set, 'merge');
    expect(m['/x.flac']).toEqual({ artist: 'A', trackNumber: '2' });
    expect(m['/y.flac']).toEqual({ title: 'T' });
  });

  it('replace passes through title/artist/track as strings', () => {
    const m = buildPerFilePatchesMap(rows, set, 'replace');
    expect(m['/x.flac']).toEqual({ title: '  ', artist: 'A', trackNumber: '2' });
  });
});
