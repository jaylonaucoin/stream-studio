import { useState } from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { screen, waitFor } from '@testing-library/react';
import { axe } from 'jest-axe'
import QueuePanel from './QueuePanel';
import { renderWithMui } from '../test-utils/render-with-mui';
import { createRendererApiMock, installWindowApi } from '../../tests/setup/renderer-api-mock.js';

const sampleUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';

function QueuePanelHarness(props) {
  const [queue, setQueue] = useState([]);
  return (
    <QueuePanel
      open
      onClose={() => {}}
      queue={queue}
      setQueue={setQueue}
      outputFolder="/tmp/out"
      defaultMode="audio"
      defaultFormat="mp3"
      defaultQuality="best"
      {...props}
    />
  );
}

function getQueueUrlTextbox() {
  const boxes = screen.getAllByRole('textbox');
  const visible = boxes.filter((el) => el.getAttribute('aria-hidden') !== 'true');
  return visible[0];
}

describe('QueuePanel', () => {
  let teardownApi;

  beforeEach(() => {
    const { api } = createRendererApiMock();
    api.getVideoInfo.mockResolvedValue({
      success: true,
      title: 'Test title',
      thumbnail: null,
      extractor: 'youtube',
    });
    api.getPlaylistInfo.mockResolvedValue({ success: false, isPlaylist: false });
    teardownApi = installWindowApi(api);
  });

  afterEach(() => {
    teardownApi?.();
    vi.clearAllMocks();
  });

  it('adds a valid URL to the queue', async () => {
    const user = userEvent.setup();
    renderWithMui(<QueuePanelHarness />);

    const input = getQueueUrlTextbox();
    await user.click(input);
    await user.paste(sampleUrl);
    await user.click(screen.getByRole('button', { name: /add to queue/i }));

    await waitFor(() => {
      expect(screen.getByText('Test title')).toBeInTheDocument();
    });
    expect(window.api.getVideoInfo).toHaveBeenCalled();
  });

  it('clears the queue when Clear All is clicked', async () => {
    const user = userEvent.setup();
    renderWithMui(<QueuePanelHarness />);

    const input = getQueueUrlTextbox();
    await user.click(input);
    await user.paste(sampleUrl);
    await user.click(screen.getByRole('button', { name: /add to queue/i }));

    await waitFor(() => {
      expect(screen.getByText('Test title')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /clear all/i }));

    await waitFor(() => {
      expect(screen.getByText(/queue is empty/i)).toBeInTheDocument();
    });
  });

  it('shows empty state message when queue is empty', () => {
    renderWithMui(<QueuePanelHarness />);
    expect(screen.getByText(/queue is empty/i)).toBeInTheDocument();
    expect(
      screen.getByText(/paste multiple urls/i)
    ).toBeInTheDocument();
  });

  it('has no accessibility violations', async () => {
    const { container } = renderWithMui(<QueuePanelHarness />)
    expect(await axe(container, {
      rules: { 'color-contrast': { enabled: false } }
    })).toHaveNoViolations()
  });
});
