import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  validateMetadata,
  isValidHttpUrl,
  isValidPositiveInteger,
  isValidYear,
} from './validation.js';

describe('validateMetadata', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('flags invalid year', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2020-06-01'));
    expect(validateMetadata({ year: '1899' }).year).toBeDefined();
    expect(validateMetadata({ year: '2030' }).year).toBeDefined();
    expect(validateMetadata({ year: '2020' }).year).toBeUndefined();
  });

  it('flags track number above total', () => {
    expect(
      validateMetadata({ trackNumber: '5', totalTracks: '3' }).trackNumber
    ).toContain('cannot exceed');
  });

  it('flags invalid bpm', () => {
    expect(validateMetadata({ bpm: '0' }).bpm).toBeDefined();
    expect(validateMetadata({ bpm: '400' }).bpm).toBeDefined();
    expect(validateMetadata({ bpm: '120' }).bpm).toBeUndefined();
  });
});

describe('isValidHttpUrl', () => {
  it('accepts http and https only', () => {
    expect(isValidHttpUrl('https://a.com')).toBe(true);
    expect(isValidHttpUrl('http://a.com')).toBe(true);
    expect(isValidHttpUrl('ftp://a.com')).toBe(false);
    expect(isValidHttpUrl('not a url')).toBe(false);
  });
});

describe('isValidPositiveInteger', () => {
  it('requires positive integer string form', () => {
    expect(isValidPositiveInteger('1')).toBe(true);
    expect(isValidPositiveInteger('01')).toBe(false);
    expect(isValidPositiveInteger('0')).toBe(false);
    expect(isValidPositiveInteger('x')).toBe(false);
  });
});

describe('isValidYear', () => {
  it('respects min and max', () => {
    expect(isValidYear('2000', 1990, 2010)).toBe(true);
    expect(isValidYear('1980', 1990, 2010)).toBe(false);
    expect(isValidYear('2020', 1990, 2010)).toBe(false);
  });
});
