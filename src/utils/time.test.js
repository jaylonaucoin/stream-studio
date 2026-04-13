import { describe, it, expect } from 'vitest';
import { parseTimeToSeconds, formatSecondsToTime, formatDuration } from './time.js';

describe('parseTimeToSeconds', () => {
  it('parses short numeric seconds', () => {
    expect(parseTimeToSeconds('45')).toBe(45);
    expect(parseTimeToSeconds('9')).toBe(9);
  });

  it('parses MM:SS', () => {
    expect(parseTimeToSeconds('3:30')).toBe(210);
    expect(parseTimeToSeconds('0:00')).toBe(0);
  });

  it('parses H:MM:SS', () => {
    expect(parseTimeToSeconds('1:02:03')).toBe(3723);
  });

  it('returns null for invalid', () => {
    expect(parseTimeToSeconds('')).toBeNull();
    expect(parseTimeToSeconds('1:70')).toBeNull();
    expect(parseTimeToSeconds('abc')).toBeNull();
  });
});

describe('formatSecondsToTime', () => {
  it('formats with and without hours', () => {
    expect(formatSecondsToTime(65)).toBe('1:05');
    expect(formatSecondsToTime(3665)).toBe('1:01:05');
    expect(formatSecondsToTime(NaN)).toBe('');
  });
});

describe('formatDuration', () => {
  it('aliases formatSecondsToTime', () => {
    expect(formatDuration(90)).toBe('1:30');
  });
});

describe('parseTimeToSeconds – edge cases', () => {
  it('returns null for null and undefined', () => {
    expect(parseTimeToSeconds(null)).toBeNull();
    expect(parseTimeToSeconds(undefined)).toBeNull();
  });

  it('returns null for non-string input (number)', () => {
    expect(parseTimeToSeconds(42)).toBeNull();
  });

  it('returns null for 4-part time string', () => {
    expect(parseTimeToSeconds('1:02:03:04')).toBeNull();
  });
});

describe('formatSecondsToTime – edge cases', () => {
  it('returns empty string for negative number', () => {
    const result = formatSecondsToTime(-5);
    expect(typeof result).toBe('string');
  });

  it('handles very large number', () => {
    const result = formatSecondsToTime(360000);
    expect(result).toBe('100:00:00');
  });

  it('returns empty string for null and undefined', () => {
    expect(formatSecondsToTime(null)).toBe('');
    expect(formatSecondsToTime(undefined)).toBe('');
  });
});
