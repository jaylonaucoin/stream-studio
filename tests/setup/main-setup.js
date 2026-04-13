import path from 'path';
import { fileURLToPath } from 'url';
import Module from 'node:module';
import { vi } from 'vitest';

const setupDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(setupDir, '../..');
const electronMockPath = path.join(repoRoot, 'tests/mocks/electron-main.cjs');

const originalResolveFilename = Module._resolveFilename;
Module._resolveFilename = function resolveFilenamePatched(request, parent, isMain, options) {
  if (request === 'electron') {
    return electronMockPath;
  }
  return originalResolveFilename.call(this, request, parent, isMain, options);
};

vi.mock('electron-store', () => {
  class MockElectronStore {
    constructor(opts = {}) {
      const defaults = opts.defaults || {};
      this._defaults = JSON.parse(JSON.stringify(defaults));
      this._data = JSON.parse(JSON.stringify(defaults));
    }

    get(key) {
      if (Object.prototype.hasOwnProperty.call(this._data, key)) {
        const value = this._data[key];
        return value !== null && typeof value === 'object'
          ? JSON.parse(JSON.stringify(value))
          : value;
      }
      if (Object.prototype.hasOwnProperty.call(this._defaults, key)) {
        const value = this._defaults[key];
        return value !== null && typeof value === 'object'
          ? JSON.parse(JSON.stringify(value))
          : value;
      }
      return undefined;
    }

    set(key, value) {
      this._data[key] =
        value !== null && typeof value === 'object'
          ? JSON.parse(JSON.stringify(value))
          : value;
    }

    delete(key) {
      delete this._data[key];
    }

    clear() {
      this._data = JSON.parse(JSON.stringify(this._defaults));
    }
  }

  return { default: MockElectronStore };
});
