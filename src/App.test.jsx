import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { screen, waitFor, within, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';
import { renderWithMui } from './test-utils/render-with-mui';
import { createRendererApiMock, installWindowApi } from '../tests/setup/renderer-api-mock.js';
import { buildSettings } from '../tests/factories.js';

const qs = vi.hoisted(() => ({
  loadQueueFromStorage: vi.fn(() => ({ items: [], loadError: null })),
  saveQueueToStorage: vi.fn(() => ({ success: true })),
}));

vi.mock('./lib/queueStorage', () => ({
  loadQueueFromStorage: () => qs.loadQueueFromStorage(),
  saveQueueToStorage: (queue) => qs.saveQueueToStorage(queue),
}));

describe('App', () => {
  let teardownApi;
  let emitProgress;
  let api;

  beforeEach(() => {
    qs.loadQueueFromStorage.mockImplementation(() => ({ items: [], loadError: null }));
    qs.saveQueueToStorage.mockImplementation(() => ({ success: true }));

    const mock = createRendererApiMock();
    api = mock.api;
    emitProgress = mock.emitProgress;
    api.getOutputFolder.mockResolvedValue('/tmp/out');
    api.checkFfmpeg.mockResolvedValue({ available: true });
    api.getSettings.mockResolvedValue(
      buildSettings({
        defaultMode: 'audio',
        defaultAudioFormat: 'mp3',
        defaultVideoFormat: 'mp4',
        defaultQuality: 'best',
        defaultSearchSite: 'youtube',
        defaultSearchLimit: 15,
        theme: 'dark',
      })
    );
    api.getHistory.mockResolvedValue({ success: true, items: [] });
    api.getAppVersion.mockResolvedValue('9.9.9-test');
    api.getVideoInfo.mockResolvedValue({
      success: true,
      title: 'Preview',
      thumbnail: null,
      extractor: 'youtube',
    });
    api.getPlaylistInfo.mockResolvedValue({ success: false, isPlaylist: false });
    api.getChapterInfo.mockResolvedValue({ success: false, hasChapters: false });
    api.convert.mockResolvedValue({ success: true, fileName: 'out.mp3' });
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

  it('calls mount loaders for folder, ffmpeg, settings, history, and version', async () => {
    renderWithMui(<App />);
    await waitFor(() => {
      expect(api.getOutputFolder).toHaveBeenCalled();
      expect(api.checkFfmpeg).toHaveBeenCalled();
      expect(api.getSettings).toHaveBeenCalled();
      expect(api.getHistory).toHaveBeenCalled();
      expect(api.getAppVersion).toHaveBeenCalled();
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

  it('shows FFmpeg unavailable warning when check fails', async () => {
    api.checkFfmpeg.mockResolvedValue({ available: false });
    renderWithMui(<App />);
    expect(await screen.findByText(/ffmpeg is not available/i)).toBeInTheDocument();
  });

  it('skips applying settings when getSettings returns IPC failure', async () => {
    api.getSettings.mockResolvedValue({ success: false, error: 'nope' });
    renderWithMui(<App />);
    await waitFor(() => {
      expect(api.getSettings).toHaveBeenCalled();
    });
    expect(screen.queryByText(/ffmpeg is not available/i)).not.toBeInTheDocument();
  });

  it('shows queue load error snackbar when bootstrap has loadError', async () => {
    qs.loadQueueFromStorage.mockImplementation(() => ({
      items: [],
      loadError: 'Could not read saved queue',
    }));
    renderWithMui(<App />);
    expect(await screen.findByText(/could not read saved queue/i)).toBeInTheDocument();
  });

  it('shows snackbar when saveQueueToStorage fails', async () => {
    qs.saveQueueToStorage.mockImplementation(() => ({
      success: false,
      error: 'The queue could not be saved to browser storage.',
    }));
    renderWithMui(<App />);
    expect(
      await screen.findByText(/the queue could not be saved to browser storage/i)
    ).toBeInTheDocument();
  });

  it('updates progress when emitProgress sends progress payload', async () => {
    const user = userEvent.setup();
    api.convert.mockImplementation(() => new Promise(() => {}));
    renderWithMui(<App />);
    await waitFor(() => expect(window.api.onProgress).toHaveBeenCalled());
    await user.click(screen.getByRole('tab', { name: /paste url/i }));
    await user.type(
      screen.getByRole('textbox', { name: /video or audio url input/i }),
      'https://www.youtube.com/watch?v=prog'
    );
    await user.click(screen.getByRole('button', { name: /^convert$/i }));
    await screen.findByText(/starting conversion/i);
    emitProgress({ type: 'progress', percent: 50 });
    expect(await screen.findByText('50%')).toBeInTheDocument();
  });

  it('appends status message to logs', async () => {
    renderWithMui(<App />);
    await waitFor(() => expect(window.api.onProgress).toHaveBeenCalled());
    emitProgress({ type: 'status', message: 'status-line' });
    await waitFor(() => {
      expect(screen.getByText('status-line')).toBeInTheDocument();
    });
  });

  it('handles cancelled progress event without throwing', async () => {
    const user = userEvent.setup();
    api.convert.mockImplementation(() => new Promise(() => {}));
    renderWithMui(<App />);
    await waitFor(() => expect(window.api.onProgress).toHaveBeenCalled());
    await user.click(screen.getByRole('tab', { name: /paste url/i }));
    await user.type(
      screen.getByRole('textbox', { name: /video or audio url input/i }),
      'https://www.youtube.com/watch?v=cancel'
    );
    await user.click(screen.getByRole('button', { name: /^convert$/i }));
    await screen.findByText(/starting conversion/i);
    emitProgress({ type: 'cancelled' });
    expect(await screen.findByText(/paste a url/i)).toBeInTheDocument();
  });

  it('completes conversion and bumps history count', async () => {
    const user = userEvent.setup();
    api.getHistory.mockResolvedValue({ success: true, items: [] });
    renderWithMui(<App />);
    await waitFor(() => screen.getByRole('button', { name: /open conversion history/i }));
    await user.click(screen.getByRole('tab', { name: /paste url/i }));
    const input = screen.getByRole('textbox', { name: /video or audio url input/i });
    await user.type(input, 'https://www.youtube.com/watch?v=testvideo');
    await user.click(screen.getByRole('button', { name: /^convert$/i }));
    await waitFor(() => {
      expect(api.convert).toHaveBeenCalled();
    });
    await waitFor(
      () => {
        const badge = screen.getByLabelText(/open conversion history/i);
        expect(within(badge).getByText('1')).toBeInTheDocument();
      },
      { timeout: 5000 }
    );
  });

  it('opens error dialog on conversion failure', async () => {
    const user = userEvent.setup();
    api.convert.mockRejectedValue(new Error('boom'));
    renderWithMui(<App />);
    await user.click(screen.getByRole('tab', { name: /paste url/i }));
    const input = screen.getByRole('textbox', { name: /video or audio url input/i });
    await user.type(input, 'https://www.youtube.com/watch?v=fail');
    await user.click(screen.getByRole('button', { name: /^convert$/i }));
    expect(await screen.findByText('Conversion Failed')).toBeInTheDocument();
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText(/boom/)).toBeInTheDocument();
  });

  it('calls cancel API when Cancel is clicked while converting', async () => {
    const user = userEvent.setup();
    let resolveConvert;
    api.cancel.mockResolvedValue(undefined);
    api.convert.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveConvert = resolve;
        })
    );
    renderWithMui(<App />);
    await user.click(screen.getByRole('tab', { name: /paste url/i }));
    const input = screen.getByRole('textbox', { name: /video or audio url input/i });
    await user.type(input, 'https://www.youtube.com/watch?v=long');
    await user.click(screen.getByRole('button', { name: /^convert$/i }));
    await screen.findByRole('button', { name: /^cancel$/i });
    await user.click(screen.getByRole('button', { name: /^cancel$/i }));
    expect(api.cancel).toHaveBeenCalled();
    resolveConvert?.({ success: true, fileName: 'x.mp3' });
  });

  it('opens settings on Meta+,', async () => {
    const user = userEvent.setup();
    renderWithMui(<App />);
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /open settings/i })).toBeTruthy()
    );
    fireEvent.keyDown(window, { key: ',', metaKey: true });
    const settingsDialog = await screen.findByRole('dialog');
    expect(within(settingsDialog).getByText(/^settings$/i)).toBeInTheDocument();
    await user.keyboard('{Escape}');
  });

  it('opens history panel on Meta+H', async () => {
    renderWithMui(<App />);
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /open conversion history/i })).toBeTruthy()
    );
    fireEvent.keyDown(window, { key: 'h', metaKey: true });
    expect(await screen.findByText('Conversion History')).toBeInTheDocument();
  });

  it('opens queue panel on Meta+B', async () => {
    renderWithMui(<App />);
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /open batch queue/i })).toBeTruthy()
    );
    fireEvent.keyDown(window, { key: 'b', metaKey: true, shiftKey: false });
    expect(await screen.findByText('Batch Queue')).toBeInTheDocument();
  });

  it('loads theme from settings (dark)', async () => {
    renderWithMui(<App />);
    await waitFor(async () => {
      const settings = await api.getSettings.mock.results[0]?.value;
      expect(settings?.theme).toBe('dark');
    });
  });
});
