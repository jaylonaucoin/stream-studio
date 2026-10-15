import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { axe } from 'jest-axe';
import { defaultA11yAxeConfig } from '../../tests/setup/axe-config.js';
import ThumbnailWithFallback from './ThumbnailWithFallback';
import { renderWithProviders } from '../test-utils/render-with-providers';

describe('ThumbnailWithFallback', () => {
  it('renders placeholder when thumbnail is null', () => {
    renderWithProviders(<ThumbnailWithFallback thumbnail={null} alt="thumb" />);
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.getByTestId('MusicNoteIcon')).toBeInTheDocument();
  });

  it('renders img element when thumbnail string provided', () => {
    renderWithProviders(<ThumbnailWithFallback thumbnail="https://example.com/img.jpg" alt="thumb" />);
    const img = screen.getByRole('img', { hidden: true });
    expect(img).toHaveAttribute('src', 'https://example.com/img.jpg');
  });

  it('renders playlist placeholder when isPlaylist and no thumbnail', () => {
    renderWithProviders(<ThumbnailWithFallback thumbnail={null} alt="pl" isPlaylist />);
    expect(screen.getByTestId('PlaylistPlayIcon')).toBeInTheDocument();
  });

  it('renders placeholder for empty string thumbnail', () => {
    renderWithProviders(<ThumbnailWithFallback thumbnail="" alt="empty" />);
    expect(screen.getByTestId('MusicNoteIcon')).toBeInTheDocument();
  });

  it('has no accessibility violations', async () => {
    const { container } = renderWithProviders(<ThumbnailWithFallback thumbnail={null} alt="thumb" />);
    expect(await axe(container, defaultA11yAxeConfig)).toHaveNoViolations();
  });
});
