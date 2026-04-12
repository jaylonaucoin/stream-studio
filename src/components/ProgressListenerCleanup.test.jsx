import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useEffect } from 'react';
import { render } from '@testing-library/react';
import { createRendererApiMock, installWindowApi } from '../../tests/setup/renderer-api-mock.js';

function ProgressSubscriber() {
  useEffect(() => {
    const handler = vi.fn();
    window.api.onProgress(handler);
    return () => {
      window.api.offProgress(handler);
    };
  }, []);
  return null;
}

describe('progress listener cleanup', () => {
  let teardownApi;

  beforeEach(() => {
    const { api } = createRendererApiMock();
    teardownApi = installWindowApi(api);
  });

  afterEach(() => {
    teardownApi?.();
    vi.clearAllMocks();
  });

  it('calls offProgress with the same handler on unmount', () => {
    const { unmount } = render(<ProgressSubscriber />);
    expect(window.api.onProgress).toHaveBeenCalledTimes(1);
    const handler = window.api.onProgress.mock.calls[0][0];
    unmount();
    expect(window.api.offProgress).toHaveBeenCalledWith(handler);
  });
});
