import { describe, it, expect, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { screen } from '@testing-library/react';
import { axe } from 'jest-axe';
import { muiComplexFormAxeConfig } from '../../../tests/setup/axe-config.js';
import ChapterMetadataForm from './ChapterMetadataForm';
import { renderWithProviders } from '../../test-utils/render-with-providers';

vi.mock('./ThumbnailSection', () => ({
  default: () => <div data-testid="thumbnail-section" />,
}));

vi.mock('./CatalogLinkSection', () => ({
  default: () => <div data-testid="catalog-link-section" />,
}));

const chapterMetadata = {
  albumMetadata: {
    artist: 'Test Artist',
    album: 'Test Album',
    albumArtist: 'Album Artist',
    genre: '',
    year: '2024',
    composer: 'Composer',
    comment: 'A comment',
  },
  chapterTitleTemplate: '{chapterTitle}',
};

describe('ChapterMetadataForm', () => {
  const defaultProps = {
    chapterMetadata,
    onChapterMetadataChange: vi.fn(),
    thumbnailUrl: 'data:image/png;base64,abc',
    onThumbnailChange: vi.fn(),
    onError: vi.fn(),
  };

  it('renders expected fields', () => {
    renderWithProviders(<ChapterMetadataForm {...defaultProps} />);

    expect(screen.getByLabelText('Artist')).toBeInTheDocument();
    expect(screen.getByLabelText('Album')).toBeInTheDocument();
    expect(screen.getByLabelText('Album Artist')).toBeInTheDocument();
    expect(screen.getByLabelText('Year')).toBeInTheDocument();
    expect(screen.getByLabelText('Composer')).toBeInTheDocument();
    expect(screen.getByLabelText('Comment')).toBeInTheDocument();
  });

  it('calls onChapterMetadataChange when editing a field', async () => {
    const user = userEvent.setup();
    const onChapterMetadataChange = vi.fn();
    renderWithProviders(
      <ChapterMetadataForm {...defaultProps} onChapterMetadataChange={onChapterMetadataChange} />
    );

    const artistField = screen.getByLabelText('Artist');
    await user.clear(artistField);
    await user.type(artistField, 'New');

    expect(onChapterMetadataChange).toHaveBeenCalled();
  });

  it('renders catalog link section', () => {
    renderWithProviders(<ChapterMetadataForm {...defaultProps} />);

    expect(screen.getByTestId('catalog-link-section')).toBeInTheDocument();
  });

  it('has no accessibility violations', async () => {
    const { container } = renderWithProviders(<ChapterMetadataForm {...defaultProps} />);
    expect(await axe(container, muiComplexFormAxeConfig)).toHaveNoViolations();
  });
});
