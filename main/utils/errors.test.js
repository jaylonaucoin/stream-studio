import { createRequire } from 'node:module';
import { describe, it, expect, vi } from 'vitest';

const require = createRequire(import.meta.url);
const {
  AppError,
  ErrorCodes,
  withErrorHandling,
  successResponse,
  errorResponse,
  validateRequired,
  validateUrl,
} = require('./errors.js');

describe('AppError', () => {
  it('serializes to JSON', () => {
    const e = new AppError('msg', 'CODE', { x: 1 });
    expect(e.toJSON()).toMatchObject({ message: 'msg', code: 'CODE', details: { x: 1 } });
  });
});

describe('withErrorHandling', () => {
  it('returns result on success', async () => {
    const wrapped = withErrorHandling(async () => ({ ok: 1 }), 'ctx');
    await expect(wrapped()).resolves.toEqual({ ok: 1 });
  });

  it('maps AppError', async () => {
    const wrapped = withErrorHandling(async () => {
      throw new AppError('bad', ErrorCodes.NOT_FOUND);
    }, 'ctx');
    await expect(wrapped()).resolves.toMatchObject({
      success: false,
      error: 'bad',
      code: ErrorCodes.NOT_FOUND,
    });
  });

  it('maps generic errors', async () => {
    const wrapped = withErrorHandling(async () => {
      throw new Error('oops');
    }, 'ctx');
    vi.spyOn(console, 'error').mockImplementation(() => {});
    await expect(wrapped()).resolves.toMatchObject({
      success: false,
      error: 'oops',
      code: ErrorCodes.UNKNOWN_ERROR,
    });
  });
});

describe('responses', () => {
  it('successResponse merges data', () => {
    expect(successResponse({ a: 1 })).toEqual({ success: true, a: 1 });
  });

  it('errorResponse shapes failure', () => {
    expect(errorResponse('e', 'C')).toMatchObject({
      success: false,
      error: 'e',
      code: 'C',
    });
  });
});

describe('validateRequired', () => {
  it('throws when missing', () => {
    expect(() => validateRequired({ a: 1 }, ['a', 'b'])).toThrow(AppError);
  });
});

describe('validateUrl', () => {
  it('throws on empty or invalid', () => {
    expect(() => validateUrl('')).toThrow(AppError);
    expect(() => validateUrl('not a url!!!')).toThrow(AppError);
  });

  it('accepts http url', () => {
    expect(() => validateUrl('https://example.com/x')).not.toThrow();
  });
});
