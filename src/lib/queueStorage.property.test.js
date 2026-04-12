import { describe, it, expect, beforeEach, vi } from 'vitest';
import fc from 'fast-check';
import { buildQueueItem } from '../../tests/factories.js';
import { loadQueueFromStorage, saveQueueToStorage } from './queueStorage.js';

const STORAGE_KEY = 'stream-studio-queue';

describe('queueStorage properties', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  it('round-trip preserves urls', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            url: fc.webUrl({ withFragments: false }),
            title: fc.string(),
          }),
          { maxCount: 8 }
        ),
        (rows) => {
          const items = rows.map((r) =>
            buildQueueItem({ url: r.url, title: r.title, isPlaylist: false })
          );
          saveQueueToStorage(items);
          const { items: loaded } = loadQueueFromStorage();
          expect(loaded.map((i) => i.url)).toEqual(items.map((i) => i.url));
        }
      ),
      { numRuns: 500 }
    );
  });

  it('load never throws for arbitrary stored strings', () => {
    fc.assert(
      fc.property(fc.string(), (raw) => {
        try {
          localStorage.setItem(STORAGE_KEY, raw);
        } catch {
          return;
        }
        expect(() => loadQueueFromStorage()).not.toThrow();
      }),
      { numRuns: 500 }
    );
  });
});
