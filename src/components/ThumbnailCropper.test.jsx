import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { screen } from '@testing-library/react';
import ThumbnailCropper from './ThumbnailCropper';
import { renderWithMui } from '../test-utils/render-with-mui';
import { createRendererApiMock, installWindowApi } from '../../tests/setup/renderer-api-mock.js';

describe('ThumbnailCropper', () => {
  let teardownApi;

  beforeEach(() => {
    const { api } = createRendererApiMock();
    api.fetchImageAsDataUrl.mockResolvedValue({
      success: true,
      dataUrl: 'data:image/png;base64,iVBORw0KGgo=',
    });
    teardownApi = installWindowApi(api);
  });

  afterEach(() => {
    teardownApi?.();
    vi.clearAllMocks();
  });

  it('calls onClose when Cancel is clicked', async () => {
    const onClose = vi.fn();
    const onCropComplete = vi.fn();
    const user = userEvent.setup();

    renderWithMui(
      <ThumbnailCropper open imageUrl="https://example.com/x.png" onClose={onClose} onCropComplete={onCropComplete} />
    );

    await user.click(screen.getByRole('button', { name: /cancel/i }));
    expect(onClose).toHaveBeenCalled();
    expect(onCropComplete).not.toHaveBeenCalled();
  });
});
