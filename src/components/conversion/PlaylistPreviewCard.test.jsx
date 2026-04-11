import { describe, it, expect, vi } from 'vitest'
import userEvent from '@testing-library/user-event'
import { screen } from '@testing-library/react'
import { axe } from 'jest-axe';
import { defaultA11yAxeConfig } from '../../../tests/setup/axe-config.js';
import PlaylistPreviewCard from './PlaylistPreviewCard'
import { renderWithMui } from '../../test-utils/render-with-mui'

vi.mock('../ThumbnailWithFallback', () => ({
  default: () => <div data-testid="thumbnail" />,
}))

const playlistInfo = {
  playlistTitle: 'My Awesome Playlist',
  playlistVideoCount: 12,
  playlistTotalDurationFormatted: '1:23:45',
  videos: [{ thumbnail: 'https://img.example.com/thumb.jpg' }],
  extractor: 'youtube',
}

describe('PlaylistPreviewCard', () => {
  const defaultProps = {
    playlistInfo,
    playlistMode: 'full',
    onPlaylistModeChange: vi.fn(),
    customMetadata: null,
    onEditMetadata: vi.fn(),
    disabled: false,
    isConverting: false,
  }

  it('renders playlist title and video count', () => {
    renderWithMui(<PlaylistPreviewCard {...defaultProps} />)

    expect(screen.getByText('My Awesome Playlist')).toBeInTheDocument()
    expect(screen.getByText('12 videos')).toBeInTheDocument()
  })

  it('renders mode toggle buttons', () => {
    renderWithMui(<PlaylistPreviewCard {...defaultProps} />)

    expect(screen.getByRole('button', { name: /full playlist mode/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /selected videos mode/i })).toBeInTheDocument()
  })

  it('calls onEditMetadata when edit button is clicked', async () => {
    const user = userEvent.setup()
    const onEditMetadata = vi.fn()
    renderWithMui(
      <PlaylistPreviewCard {...defaultProps} onEditMetadata={onEditMetadata} />
    )

    await user.click(screen.getByRole('button', { name: /edit metadata/i }))

    expect(onEditMetadata).toHaveBeenCalledOnce()
  })

  it('has no accessibility violations', async () => {
    const { container } = renderWithMui(<PlaylistPreviewCard {...defaultProps} />)
    expect(await axe(container, defaultA11yAxeConfig)).toHaveNoViolations()
  })
})
