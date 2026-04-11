import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LocalLibraryBatchView, { emptySharedMetadata } from './LocalLibraryBatchView';
import { renderWithMui } from '../test-utils/render-with-mui';
import { createRendererApiMock, installWindowApi } from '../../tests/setup/renderer-api-mock.js';

describe('LocalLibraryBatchView', () => {
  let teardownApi;

  beforeEach(() => {
    const { api } = createRendererApiMock();
    api.selectLocalFiles.mockResolvedValue({
      success: true,
      filePaths: ['/music/track1.flac'],
    });
    api.enumerateLocalMedia.mockResolvedValue({
      paths: ['/music/track1.flac'],
      truncated: false,
    });
    api.readMetadataBatch.mockResolvedValue({
      results: [
        {
          path: '/music/track1.flac',
          success: true,
          metadata: {
            title: 'Track One',
            artist: 'Band',
            album: '',
            trackNumber: '',
          },
        },
      ],
    });
    teardownApi = installWindowApi(api);
  });

  afterEach(() => {
    teardownApi?.();
    vi.clearAllMocks();
  });

  it('loads files and shows a row', async () => {
    const user = userEvent.setup();
    renderWithMui(
      <LocalLibraryBatchView
        outputFolder="/tmp/out"
        defaultMode="audio"
        defaultAudioFormat="mp3"
        defaultVideoFormat="mp4"
        defaultQuality="best"
      />
    );

    await user.click(screen.getByRole('button', { name: /^add files$/i }));

    await waitFor(() => {
      expect(screen.getByDisplayValue('Track One')).toBeInTheDocument();
    });
    expect(emptySharedMetadata()).toMatchObject({ title: '', language: 'eng' });
  });
});
