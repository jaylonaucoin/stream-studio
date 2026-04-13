import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { defaultA11yAxeConfig } from '../../../tests/setup/axe-config.js';
import CatalogLinkSection from './CatalogLinkSection';
import { renderWithMui } from '../../test-utils/render-with-mui';
import { createRendererApiMock, installWindowApi } from '../../../tests/setup/renderer-api-mock';

describe('CatalogLinkSection', () => {
  let mock;
  let teardown;

  beforeEach(() => {
    mock = createRendererApiMock();
    teardown = installWindowApi(mock.api);
  });

  afterEach(() => {
    teardown();
  });

  it('renders URL input and load button', () => {
    renderWithMui(<CatalogLinkSection onMetadataLoaded={() => {}} />);
    expect(screen.getByLabelText(/catalog url/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /load from link/i })).toBeInTheDocument();
  });

  it('load button disabled when URL is empty', () => {
    renderWithMui(<CatalogLinkSection onMetadataLoaded={() => {}} />);
    expect(screen.getByRole('button', { name: /load from link/i })).toBeDisabled();
  });

  it('calls API and onMetadataLoaded on success', async () => {
    const onMetadataLoaded = vi.fn();
    const user = userEvent.setup();
    mock.api.fetchCatalogMetadataFromUrl.mockResolvedValue({
      success: true,
      metadata: { artist: 'Test Artist', album: 'Test Album' },
    });

    renderWithMui(<CatalogLinkSection onMetadataLoaded={onMetadataLoaded} />);
    await user.type(screen.getByLabelText(/catalog url/i), 'https://musicbrainz.org/release/123');
    await user.click(screen.getByRole('button', { name: /load from link/i }));

    await waitFor(() => {
      expect(onMetadataLoaded).toHaveBeenCalledWith(
        expect.objectContaining({ artist: 'Test Artist', album: 'Test Album' })
      );
    });
  });

  it('calls onError on API failure', async () => {
    const onError = vi.fn();
    const user = userEvent.setup();
    mock.api.fetchCatalogMetadataFromUrl.mockResolvedValue({
      success: false,
      error: 'Not found',
    });

    renderWithMui(<CatalogLinkSection onMetadataLoaded={() => {}} onError={onError} />);
    await user.type(screen.getByLabelText(/catalog url/i), 'https://example.com/bad');
    await user.click(screen.getByRole('button', { name: /load from link/i }));

    await waitFor(() => {
      expect(onError).toHaveBeenCalledWith('Not found');
    });
  });

  it('calls onCoverLoaded when cover URL present', async () => {
    const onCoverLoaded = vi.fn();
    const user = userEvent.setup();
    mock.api.fetchCatalogMetadataFromUrl.mockResolvedValue({
      success: true,
      metadata: { artist: 'A' },
      coverUrl: 'https://example.com/cover.jpg',
    });
    mock.api.fetchImageAsDataUrl.mockResolvedValue({
      success: true,
      dataUrl: 'data:image/jpeg;base64,abc',
    });

    renderWithMui(<CatalogLinkSection onMetadataLoaded={() => {}} onCoverLoaded={onCoverLoaded} />);
    await user.type(screen.getByLabelText(/catalog url/i), 'https://musicbrainz.org/release/456');
    await user.click(screen.getByRole('button', { name: /load from link/i }));

    await waitFor(() => {
      expect(onCoverLoaded).toHaveBeenCalledWith('data:image/jpeg;base64,abc');
    });
  });

  it('has no accessibility violations', async () => {
    const { container } = renderWithMui(<CatalogLinkSection onMetadataLoaded={() => {}} />);
    expect(await axe(container, defaultA11yAxeConfig)).toHaveNoViolations();
  });
});
