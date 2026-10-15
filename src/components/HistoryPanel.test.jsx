import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { screen, waitFor, within } from '@testing-library/react';
import { axe } from 'jest-axe';
import { defaultA11yAxeConfig } from '../../tests/setup/axe-config.js';
import HistoryPanel from './HistoryPanel';
import { renderWithProviders } from '../test-utils/render-with-providers';
import { createRendererApiMock, installWindowApi } from '../../tests/setup/renderer-api-mock.js';

describe('HistoryPanel', () => {
  let teardownApi;

  beforeEach(() => {
    const { api } = createRendererApiMock({
      historyItems: [
        {
          id: '1',
          fileName: 'test-song.mp3',
          url: 'https://example.com/watch?v=1',
          format: 'mp3',
          mode: 'audio',
          timestamp: new Date().toISOString(),
        },
      ],
    });
    teardownApi = installWindowApi(api);
  });

  afterEach(() => {
    teardownApi?.();
    vi.clearAllMocks();
  });

  it('lists history items when opened', async () => {
    renderWithProviders(<HistoryPanel open onClose={() => {}} />);

    await waitFor(() => {
      expect(screen.getByText('test-song.mp3')).toBeInTheDocument();
    });
    expect(window.api.getHistory).toHaveBeenCalled();
  });

  it('Clear All clears history via API', async () => {
    const user = userEvent.setup();
    renderWithProviders(<HistoryPanel open onClose={() => {}} />);

    await waitFor(() => {
      expect(screen.getByText('test-song.mp3')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /clear all/i }));
    await waitFor(() => {
      expect(window.api.clearHistory).toHaveBeenCalled();
    });
    expect(screen.getByText(/no conversion history yet/i)).toBeInTheDocument();
  });

  it('remove button calls removeHistoryItem', async () => {
    const user = userEvent.setup();
    renderWithProviders(<HistoryPanel open onClose={() => {}} />);

    await waitFor(() => {
      expect(screen.getByText('test-song.mp3')).toBeInTheDocument();
    });

    const itemCard = screen.getByText('test-song.mp3').closest('[data-slot="history-item"]')
      || screen.getByText('test-song.mp3').closest('li')
      || screen.getByText('test-song.mp3').parentElement?.parentElement;
    const removeBtn = within(itemCard).getByRole('button', { name: /remove from history/i });
    await user.click(removeBtn);

    await waitFor(() => {
      expect(window.api.removeHistoryItem).toHaveBeenCalledWith('1');
    });
  });

  it('shows empty state when no history items', async () => {
    const { api } = createRendererApiMock({ historyItems: [] });
    teardownApi?.();
    teardownApi = installWindowApi(api);

    renderWithProviders(<HistoryPanel open onClose={() => {}} />);

    await waitFor(() => {
      expect(window.api.getHistory).toHaveBeenCalled();
    });
    expect(screen.getByText(/no conversion history yet/i)).toBeInTheDocument();
  });

  it('has no accessibility violations', async () => {
    const { container } = renderWithProviders(<HistoryPanel open onClose={() => {}} />);
    await waitFor(() => {
      expect(window.api.getHistory).toHaveBeenCalled();
    });
    expect(await axe(container, defaultA11yAxeConfig)).toHaveNoViolations();
  });
});
