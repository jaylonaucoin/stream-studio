import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { shouldLoadViteDevServer } = require('./window-load-target.js');

describe('shouldLoadViteDevServer', () => {
  it('loads dev server only when dev and not E2E', () => {
    expect(shouldLoadViteDevServer(true, undefined)).toBe(true);
    expect(shouldLoadViteDevServer(true, '1')).toBe(false);
    expect(shouldLoadViteDevServer(false, undefined)).toBe(false);
    expect(shouldLoadViteDevServer(false, '1')).toBe(false);
  });
});
