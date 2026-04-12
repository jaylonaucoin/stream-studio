import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { screen } from '@testing-library/react';
import { axe } from 'jest-axe';
import { muiComplexFormAxeConfig } from '../../tests/setup/axe-config.js';
import SegmentEditor, { parseTimestampsFromDescription } from './SegmentEditor';
import { renderWithMui } from '../test-utils/render-with-mui';

describe('parseTimestampsFromDescription', () => {
  it('returns empty array for null/empty description', () => {
    expect(parseTimestampsFromDescription(null, 300)).toEqual([]);
    expect(parseTimestampsFromDescription('', 300)).toEqual([]);
    expect(parseTimestampsFromDescription(undefined, 300)).toEqual([]);
  });

  it('parses "0:00 Title" format with correct titles and times', () => {
    const desc = '0:00 Intro\n3:45 Verse';
    const result = parseTimestampsFromDescription(desc, 600);

    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({ title: 'Intro', startTime: '0:00' });
    expect(result[1]).toMatchObject({ title: 'Verse', startTime: '3:45' });
  });

  it('parses numbered "1. 0:00 Title" format', () => {
    const desc = '1. 0:00 Intro\n2. 3:45 Verse';
    const result = parseTimestampsFromDescription(desc, 600);

    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({ title: 'Intro', startTime: '0:00' });
    expect(result[1]).toMatchObject({ title: 'Verse', startTime: '3:45' });
  });

  it('parses timestamps at end of line "Title - 0:00"', () => {
    const desc = 'Intro - 0:00\nVerse - 3:45';
    const result = parseTimestampsFromDescription(desc, 600);

    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({ title: 'Intro', startTime: '0:00' });
    expect(result[1]).toMatchObject({ title: 'Verse', startTime: '3:45' });
  });

  it('deduplicates segments with the same start time', () => {
    const desc = '0:00 Intro\n0:00 Opening\n3:45 Verse';
    const result = parseTimestampsFromDescription(desc, 600);

    expect(result).toHaveLength(2);
    expect(result[0].startTime).toBe('0:00');
    expect(result[1].startTime).toBe('3:45');
  });

  it('sorts segments by start time', () => {
    const desc = '3:45 Verse\n0:00 Intro\n7:20 Chorus';
    const result = parseTimestampsFromDescription(desc, 600);

    expect(result).toHaveLength(3);
    expect(result[0].startTime).toBe('0:00');
    expect(result[1].startTime).toBe('3:45');
    expect(result[2].startTime).toBe('7:20');
  });

  it('calculates end times as next segment start time', () => {
    const desc = '0:00 Intro\n3:45 Verse\n7:20 Chorus';
    const result = parseTimestampsFromDescription(desc, 600);

    expect(result[0].endTime).toBe('3:45');
    expect(result[1].endTime).toBe('7:20');
  });

  it('uses videoDuration as the last segment end time', () => {
    const desc = '0:00 Intro\n3:45 Verse';
    const result = parseTimestampsFromDescription(desc, 600);

    expect(result[1].endTime).toBe('10:00');
  });
});

describe('SegmentEditor component', () => {
  const defaultProps = {
    videoInfo: { duration: 600, description: '' },
    chapterInfo: { hasChapters: false, chapters: [] },
    segments: [],
    setSegments: vi.fn(),
    useSharedArtist: true,
    setUseSharedArtist: vi.fn(),
    disabled: false,
    onOpenMetadataEditor: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns null when videoInfo is null', () => {
    const { container } = renderWithMui(<SegmentEditor {...defaultProps} videoInfo={null} />);
    expect(container.innerHTML).toBe('');
  });

  it('renders header with "Manual Segmentation" text', () => {
    renderWithMui(<SegmentEditor {...defaultProps} />);
    expect(screen.getByText('Manual Segmentation')).toBeInTheDocument();
  });

  it('shows "No chapters detected" chip when chapterInfo has no chapters', () => {
    renderWithMui(<SegmentEditor {...defaultProps} />);
    expect(screen.getByText('No chapters detected')).toBeInTheDocument();
  });

  it('calls setSegments when Add Segment is clicked', async () => {
    const user = userEvent.setup();
    renderWithMui(<SegmentEditor {...defaultProps} />);

    await user.click(screen.getByRole('button', { name: /add segment/i }));

    expect(defaultProps.setSegments).toHaveBeenCalledTimes(1);
    const newSegments = defaultProps.setSegments.mock.calls[0][0];
    expect(newSegments).toHaveLength(1);
    expect(newSegments[0]).toMatchObject({
      title: '',
      artist: '',
      startTime: '0:00',
    });
  });

  it('has no accessibility violations', async () => {
    const { container } = renderWithMui(<SegmentEditor {...defaultProps} />);
    expect(await axe(container, muiComplexFormAxeConfig)).toHaveNoViolations();
  });
});
