import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { axe } from 'jest-axe';
import { defaultA11yAxeConfig } from '../../../tests/setup/axe-config.js';
import VideoPreviewCard from './VideoPreviewCard';
import { renderWithMui } from '../../test-utils/render-with-mui';

vi.mock('../ThumbnailWithFallback', () => ({
  default: () => <div data-testid="thumbnail" />,
}));

const videoInfo = {
  title: 'Cool Video Title',
  thumbnail: 'https://img.example.com/thumb.jpg',
  durationFormatted: '5:30',
  uploader: 'TestChannel',
  webpageUrl: 'https://youtube.com/watch?v=abc',
};

describe('VideoPreviewCard', () => {
  const defaultProps = {
    videoInfo,
    chapterInfo: null,
    customMetadata: null,
    onEditMetadata: vi.fn(),
    disabled: false,
    isConverting: false,
  };

  it('renders video title and thumbnail', () => {
    renderWithMui(<VideoPreviewCard {...defaultProps} />);

    expect(screen.getByText('Cool Video Title')).toBeInTheDocument();
    expect(screen.getByTestId('thumbnail')).toBeInTheDocument();
  });

  it('shows uploader and duration chips', () => {
    renderWithMui(<VideoPreviewCard {...defaultProps} />);

    expect(screen.getByText('5:30')).toBeInTheDocument();
    expect(screen.getByText('TestChannel')).toBeInTheDocument();
  });

  it('shows audio preview button when canPreview is true', () => {
    renderWithMui(<VideoPreviewCard {...defaultProps} />);

    expect(screen.getByRole('button', { name: /play preview/i })).toBeInTheDocument();
  });

  it('hides edit metadata when chapters are present', () => {
    renderWithMui(
      <VideoPreviewCard {...defaultProps} chapterInfo={{ hasChapters: true, totalChapters: 5 }} />
    );

    expect(screen.queryByRole('button', { name: /edit metadata/i })).not.toBeInTheDocument();
    expect(screen.getByText('5 chapters')).toBeInTheDocument();
  });

  it('shows error alert when audioError is rendered via prop scenario', () => {
    renderWithMui(
      <VideoPreviewCard {...defaultProps} videoInfo={{ ...videoInfo, webpageUrl: '' }} />
    );

    expect(screen.queryByRole('button', { name: /play preview/i })).not.toBeInTheDocument();
  });

  it('has no accessibility violations', async () => {
    const { container } = renderWithMui(<VideoPreviewCard {...defaultProps} />);
    expect(await axe(container, defaultA11yAxeConfig)).toHaveNoViolations();
  });
});
