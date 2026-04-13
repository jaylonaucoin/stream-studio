import { describe, it, expect, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { screen } from '@testing-library/react';
import { axe } from 'jest-axe';
import { muiComplexFormAxeConfig } from '../../../tests/setup/axe-config.js';
import SegmentMetadataForm from './SegmentMetadataForm';
import { renderWithMui } from '../../test-utils/render-with-mui';

vi.mock('./ThumbnailSection', () => ({
  default: () => <div data-testid="thumbnail-section" />,
}));

vi.mock('./CatalogLinkSection', () => ({
  default: () => <div data-testid="catalog-link-section" />,
}));

const segmentMetadata = {
  albumMetadata: {
    artist: 'Seg Artist',
    album: 'Seg Album',
    albumArtist: 'Seg Album Artist',
    genre: '',
    year: '2025',
    composer: 'Seg Composer',
    comment: 'Seg comment',
  },
  perSegmentMetadata: [
    { title: 'Segment One', artist: 'Artist A' },
    { title: 'Segment Two', artist: 'Artist B' },
  ],
};

describe('SegmentMetadataForm', () => {
  const defaultProps = {
    segmentMetadata,
    onSegmentMetadataChange: vi.fn(),
    useSharedArtistForSegments: false,
    thumbnailUrl: 'data:image/png;base64,abc',
    onThumbnailChange: vi.fn(),
    onError: vi.fn(),
  };

  it('renders per-segment fields', () => {
    renderWithMui(<SegmentMetadataForm {...defaultProps} />);

    expect(screen.getByText('Track 1')).toBeInTheDocument();
    expect(screen.getByText('Track 2')).toBeInTheDocument();
    expect(screen.getByText('Segment Titles (2 segments)')).toBeInTheDocument();
  });

  it('renders shared artist helper text when useSharedArtistForSegments is true', () => {
    renderWithMui(<SegmentMetadataForm {...defaultProps} useSharedArtistForSegments={true} />);

    expect(screen.getByText('This artist will be applied to all segments')).toBeInTheDocument();
  });

  it('calls onSegmentMetadataChange when editing album field', async () => {
    const user = userEvent.setup();
    const onSegmentMetadataChange = vi.fn();
    renderWithMui(
      <SegmentMetadataForm {...defaultProps} onSegmentMetadataChange={onSegmentMetadataChange} />
    );

    const albumField = screen.getByLabelText('Album');
    await user.clear(albumField);
    await user.type(albumField, 'New');

    expect(onSegmentMetadataChange).toHaveBeenCalled();
  });

  it('has no accessibility violations', async () => {
    const { container } = renderWithMui(<SegmentMetadataForm {...defaultProps} />);
    expect(await axe(container, muiComplexFormAxeConfig)).toHaveNoViolations();
  });
});
