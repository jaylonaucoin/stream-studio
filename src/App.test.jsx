import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';
import { renderWithMui } from './test-utils/render-with-mui';
import { createRendererApiMock, installWindowApi } from '../tests/setup/renderer-api-mock.js';

describe('App', () => {
  let teardownApi;

  beforeEach(() => {
    const { api } = createRendererApiMock();
    api.getOutputFolder.mockResolvedValue('/tmp/out');
    api.checkFfmpeg.mockResolvedValue({ available: true });
    api.getSettings.mockResolvedValue({
      defaultMode: 'audio',
      defaultAudioFormat: 'mp3',
      defaultVideoFormat: 'mp4',
      defaultQuality: 'best',
      defaultSearchSite: 'youtube',
      defaultSearchLimit: 15,
      theme: 'dark',
    });
    api.getHistory.mockResolvedValue({ success: true, items: [] });
    api.getAppVersion.mockResolvedValue('9.9.9-test');
    teardownApi = installWindowApi(api);
  });

  afterEach(() => {
    teardownApi?.();
    vi.clearAllMocks();
  });

  it('registers progress listener on mount', async () => {
    renderWithMui(<App />);
    await waitFor(() => {
      expect(window.api.onProgress).toHaveBeenCalled();
    });
  });

  it('opens settings from toolbar', async () => {
    const user = userEvent.setup();
    renderWithMui(<App />);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /open settings/i })).toBeInTheDocument();
    });
    await user.click(screen.getByRole('button', { name: /open settings/i }));
    const settingsDialog = await screen.findByRole('dialog');
    expect(within(settingsDialog).getByText(/^settings$/i)).toBeInTheDocument();
  });
});
