import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen } from '@testing-library/react';
import { axe } from 'jest-axe';
import { defaultA11yAxeConfig } from '../../../tests/setup/axe-config.js';
import ThumbnailSection from './ThumbnailSection';
import { renderWithMui } from '../../test-utils/render-with-mui';
import { createRendererApiMock, installWindowApi } from '../../../tests/setup/renderer-api-mock.js';

vi.mock('../ThumbnailCropper', () => ({
  default: () => <div data-testid="thumbnail-cropper" />,
}));

describe('ThumbnailSection', () => {
  let teardownApi;

  beforeEach(() => {
    const { api } = createRendererApiMock();
    teardownApi = installWindowApi(api);
  });

  afterEach(() => {
    teardownApi?.();
    vi.clearAllMocks();
  });

  const defaultProps = {
    thumbnailUrl: 'data:image/png;base64,abc123',
    onThumbnailChange: vi.fn(),
    onError: vi.fn(),
  };

  it('renders crop button', () => {
    renderWithMui(<ThumbnailSection {...defaultProps} />);

    expect(screen.getByRole('button', { name: /crop/i })).toBeInTheDocument();
  });

  it('renders replace image button when thumbnail exists', () => {
    renderWithMui(<ThumbnailSection {...defaultProps} />);

    expect(screen.getByRole('button', { name: /replace/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /replace/i })).not.toBeDisabled();
  });

  it('disables crop button when no thumbnail', () => {
    renderWithMui(
      <ThumbnailSection thumbnailUrl={null} onThumbnailChange={vi.fn()} onError={vi.fn()} />
    );

    expect(screen.getByRole('button', { name: /crop/i })).toBeDisabled();
  });

  it('has no accessibility violations', async () => {
    const { container } = renderWithMui(<ThumbnailSection {...defaultProps} />);
    expect(await axe(container, defaultA11yAxeConfig)).toHaveNoViolations();
  });
});
