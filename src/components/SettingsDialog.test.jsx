import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { screen, waitFor } from '@testing-library/react';
import { axe } from 'jest-axe'
import SettingsDialog from './SettingsDialog';
import { renderWithMui } from '../test-utils/render-with-mui';
import { createRendererApiMock, installWindowApi } from '../../tests/setup/renderer-api-mock.js';

describe('SettingsDialog', () => {
  let teardownApi;

  beforeEach(() => {
    const { api } = createRendererApiMock({ initialSettings: { theme: 'dark' } });
    teardownApi = installWindowApi(api);
  });

  afterEach(() => {
    teardownApi?.();
    vi.clearAllMocks();
  });

  it('loads settings when opened and shows theme control', async () => {
    renderWithMui(
      <SettingsDialog open onClose={() => {}} onSettingsSaved={() => {}} />
    );

    await waitFor(() => {
      expect(window.api.getSettings).toHaveBeenCalled();
      expect(screen.queryByLabelText(/loading settings/i)).not.toBeInTheDocument();
    });

    expect(screen.getByLabelText(/theme selection/i)).toBeInTheDocument();
  });

  it('Save Settings invokes saveSettings and onClose', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const onSettingsSaved = vi.fn();

    renderWithMui(
      <SettingsDialog open onClose={onClose} onSettingsSaved={onSettingsSaved} />
    );

    await waitFor(() => {
      expect(screen.queryByLabelText(/loading settings/i)).not.toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /save settings/i }));
    await waitFor(() => {
      expect(window.api.saveSettings).toHaveBeenCalled();
      expect(onClose).toHaveBeenCalled();
      expect(onSettingsSaved).toHaveBeenCalled();
    });
  });

  it('cancel button closes without saving', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const onSettingsSaved = vi.fn();

    renderWithMui(
      <SettingsDialog open onClose={onClose} onSettingsSaved={onSettingsSaved} />
    );

    await waitFor(() => {
      expect(screen.queryByLabelText(/loading settings/i)).not.toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /cancel/i }));
    expect(onClose).toHaveBeenCalled();
    expect(window.api.saveSettings).not.toHaveBeenCalled();
    expect(onSettingsSaved).not.toHaveBeenCalled();
  });

  it('has no accessibility violations', async () => {
    const { container } = renderWithMui(
      <SettingsDialog open onClose={() => {}} onSettingsSaved={() => {}} />
    )
    await waitFor(() => {
      expect(screen.queryByLabelText(/loading settings/i)).not.toBeInTheDocument()
    })
    expect(await axe(container, {
      rules: { 'color-contrast': { enabled: false } }
    })).toHaveNoViolations()
  });
});
