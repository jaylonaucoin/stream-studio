import { describe, it, expect, vi } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe } from 'jest-axe';
import { muiComplexFormAxeConfig } from '../../../tests/setup/axe-config.js';
import PlaylistVideoSelector from './PlaylistVideoSelector'
import { renderWithMui } from '../../test-utils/render-with-mui'

const videos = [
  { index: 1, title: 'Video One', thumbnail: null, durationFormatted: '3:00' },
  { index: 2, title: 'Video Two', thumbnail: null, durationFormatted: '5:30' },
  { index: 3, title: 'Video Three', thumbnail: null, durationFormatted: '2:15' },
]

const defaults = {
  videos,
  selectedVideos: [1, 2, 3],
  onVideoToggle: vi.fn(),
  onSelectAll: vi.fn(),
  onDeselectAll: vi.fn(),
  disabled: false,
  isConverting: false,
  isAudioOnly: false,
}

describe('PlaylistVideoSelector', () => {
  it('renders video list', () => {
    renderWithMui(<PlaylistVideoSelector {...defaults} />)
    expect(screen.getByText('Video One')).toBeInTheDocument()
    expect(screen.getByText('Video Two')).toBeInTheDocument()
    expect(screen.getByText('Video Three')).toBeInTheDocument()
  })

  it('calls onSelectAll when select all clicked', async () => {
    const onSelectAll = vi.fn()
    const user = userEvent.setup()
    renderWithMui(
      <PlaylistVideoSelector {...defaults} selectedVideos={[1]} onSelectAll={onSelectAll} />
    )
    await user.click(screen.getByRole('button', { name: /^select all$/i }))
    expect(onSelectAll).toHaveBeenCalledTimes(1)
  })

  it('calls onVideoToggle when row clicked', async () => {
    const onVideoToggle = vi.fn()
    const user = userEvent.setup()
    renderWithMui(<PlaylistVideoSelector {...defaults} onVideoToggle={onVideoToggle} />)
    await user.click(screen.getByText('Video Two'))
    expect(onVideoToggle).toHaveBeenCalledWith(2)
  })

  it('shows alert when no videos selected', () => {
    renderWithMui(<PlaylistVideoSelector {...defaults} selectedVideos={[]} />)
    expect(screen.getByText(/no videos selected/i)).toBeInTheDocument()
  })

  it('has no accessibility violations', async () => {
    const { container } = renderWithMui(<PlaylistVideoSelector {...defaults} />)
    expect(await axe(container, muiComplexFormAxeConfig)).toHaveNoViolations()
  })
})
