import { createRequire } from 'node:module';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const require = createRequire(import.meta.url);

const mockShow = vi.fn();
const mockOn = vi.fn();
const MockNotification = vi.fn(() => ({ show: mockShow, on: mockOn }));
MockNotification.isSupported = vi.fn(() => true);

const mockStoreGet = vi.fn();

function patchRequireCache(modulePath, mockExports) {
  const resolved = require.resolve(modulePath);
  const mod = require.cache[resolved] || { id: resolved, filename: resolved, loaded: true };
  mod.exports = mockExports;
  require.cache[resolved] = mod;
}

patchRequireCache('electron', {
  Notification: MockNotification,
});
patchRequireCache('../store', {
  get: mockStoreGet,
});
patchRequireCache('../utils/paths', {
  getIconPath: vi.fn(() => '/mock/icon.png'),
});

const resolvedPath = require.resolve('./notifications.js');
delete require.cache[resolvedPath];
const { showNotification } = require('./notifications.js');

beforeEach(() => {
  vi.clearAllMocks();
  MockNotification.isSupported.mockReturnValue(true);
  mockStoreGet.mockReturnValue({ notificationsEnabled: true });
});

describe('showNotification', () => {
  it('does nothing when notificationsEnabled is false', () => {
    mockStoreGet.mockReturnValue({ notificationsEnabled: false });
    showNotification('Title', 'Body');
    expect(MockNotification).not.toHaveBeenCalled();
    expect(mockShow).not.toHaveBeenCalled();
  });

  it('does nothing when Notification.isSupported returns false', () => {
    MockNotification.isSupported.mockReturnValue(false);
    showNotification('Title', 'Body');
    expect(MockNotification).not.toHaveBeenCalled();
    expect(mockShow).not.toHaveBeenCalled();
  });

  it('shows notification when enabled and supported', () => {
    showNotification('Download Complete', 'File saved');
    expect(MockNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Download Complete',
        body: 'File saved',
        icon: '/mock/icon.png',
      })
    );
    expect(mockShow).toHaveBeenCalled();
  });

  it('calls onClick handler when provided', () => {
    const onClick = vi.fn();
    showNotification('Title', 'Body', onClick);
    expect(mockOn).toHaveBeenCalledWith('click', onClick);
    expect(mockShow).toHaveBeenCalled();
  });
});
