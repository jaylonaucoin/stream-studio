import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { defaultA11yAxeConfig } from '../../../tests/setup/axe-config.js';
import FormatControls from './FormatControls';
import { renderWithProviders } from '../../test-utils/render-with-providers';

const defaults = {
  mode: 'audio',
  format: 'mp3',
  quality: 'best',
  onModeChange: vi.fn(),
  onFormatChange: vi.fn(),
  onQualityChange: vi.fn(),
  disabled: false,
  isConverting: false,
  videoModeDisabled: false,
};

describe('FormatControls', () => {
  it('renders mode toggle with audio/video options', () => {
    renderWithProviders(<FormatControls {...defaults} />);
    expect(screen.getByRole('button', { name: /audio mode/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /video mode/i })).toBeInTheDocument();
  });

  it('calls onModeChange when toggling mode', async () => {
    const onModeChange = vi.fn();
    const user = userEvent.setup();
    renderWithProviders(<FormatControls {...defaults} onModeChange={onModeChange} />);
    await user.click(screen.getByRole('button', { name: /video mode/i }));
    expect(onModeChange).toHaveBeenCalledWith('video');
  });

  it('disables video mode when videoModeDisabled is true', () => {
    renderWithProviders(<FormatControls {...defaults} videoModeDisabled />);
    expect(screen.getByRole('button', { name: /video mode/i })).toBeDisabled();
  });

  it('renders format select with audio formats', () => {
    renderWithProviders(<FormatControls {...defaults} mode="audio" />);
    expect(screen.getByLabelText(/output format selection/i)).toBeInTheDocument();
  });

  it('renders disabled when isConverting', () => {
    renderWithProviders(<FormatControls {...defaults} isConverting />);
    expect(screen.getByRole('button', { name: /audio mode/i })).toBeDisabled();
  });

  it('has no accessibility violations', async () => {
    const { container } = renderWithProviders(<FormatControls {...defaults} />);
    expect(await axe(container, defaultA11yAxeConfig)).toHaveNoViolations();
  });
});
