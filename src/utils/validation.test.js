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
    expect(validateMetadata({ trackNumber: '5', totalTracks: '3' }).trackNumber).toContain(
      'cannot exceed'
    );
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

  it('rejects non-numeric string', () => {
    expect(isValidYear('abc')).toBe(false);
    expect(isValidYear('twenty')).toBe(false);
  });
});

describe('validateMetadata – edge cases', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns empty errors for undefined/null/empty object', () => {
    expect(validateMetadata(undefined ?? {})).toEqual({});
    expect(validateMetadata(null ?? {})).toEqual({});
    expect(validateMetadata({})).toEqual({});
  });

  it('returns no errors when fields are empty strings', () => {
    const result = validateMetadata({ year: '', bpm: '', trackNumber: '', totalTracks: '' });
    expect(result).toEqual({});
  });

  it('accepts current year and current year + 1 as boundary', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-01-15'));
    expect(validateMetadata({ year: '2025' }).year).toBeUndefined();
    expect(validateMetadata({ year: '2026' }).year).toBeUndefined();
    expect(validateMetadata({ year: '2027' }).year).toBeDefined();
  });

  it('accepts BPM at lower boundary (1) and upper boundary (300)', () => {
    expect(validateMetadata({ bpm: '1' }).bpm).toBeUndefined();
    expect(validateMetadata({ bpm: '300' }).bpm).toBeUndefined();
  });

  it('rejects BPM just outside boundaries', () => {
    expect(validateMetadata({ bpm: '0' }).bpm).toBeDefined();
    expect(validateMetadata({ bpm: '301' }).bpm).toBeDefined();
  });
});

describe('isValidHttpUrl – edge cases', () => {
  it('returns false for empty string', () => {
    expect(isValidHttpUrl('')).toBe(false);
  });

  it('returns false for null', () => {
    expect(isValidHttpUrl(null)).toBe(false);
  });

  it('rejects javascript: protocol', () => {
    expect(isValidHttpUrl('javascript:alert(1)')).toBe(false);
  });
});

describe('isValidPositiveInteger – edge cases', () => {
  it('rejects negative string', () => {
    expect(isValidPositiveInteger('-1')).toBe(false);
  });

  it('rejects decimal string', () => {
    expect(isValidPositiveInteger('1.5')).toBe(false);
  });

  it('handles very large number string', () => {
    expect(isValidPositiveInteger('999999999')).toBe(true);
  });
});
