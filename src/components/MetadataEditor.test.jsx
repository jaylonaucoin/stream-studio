import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { screen, waitFor, within } from '@testing-library/react';
import MetadataEditor from './MetadataEditor';
import { renderWithMui } from '../test-utils/render-with-mui';

describe('MetadataEditor', () => {
  const videoInfo = {
    title: 'Test Video',
    artist: 'Artist',
    uploader: 'Uploader',
    thumbnail: null,
    description: 'Desc',
    uploadDate: '20240101',
    extractor: 'youtube',
  };

  beforeEach(() => {
    vi.spyOn(window, 'matchMedia').mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('calls onSave and onClose when Apply succeeds in single mode', async () => {
    const onSave = vi.fn();
    const onClose = vi.fn();
    const user = userEvent.setup();

    renderWithMui(
      <MetadataEditor
        open
        onClose={onClose}
        onSave={onSave}
        videoInfo={videoInfo}
        playlistInfo={null}
        chapterInfo={null}
        selectedVideos={null}
        segments={null}
        useSharedArtistForSegments
        customMetadata={null}
        mode="single"
      />
    );

    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('Edit Metadata')).toBeInTheDocument();

    await user.click(within(dialog).getByRole('button', { name: /^apply$/i }));

    await waitFor(() => {
      expect(onSave).toHaveBeenCalled();
    });
    expect(onSave.mock.calls[0][0].type).toBe('single');
    expect(onSave.mock.calls[0][0].metadata.title).toBe('Test Video');
    expect(onClose).toHaveBeenCalled();
  });
});
