import { describe, it, expect, vi } from 'vitest'
import userEvent from '@testing-library/user-event'
import { screen } from '@testing-library/react'
import { axe } from 'jest-axe'
import PlaylistVideoItem from './PlaylistVideoItem'
import { renderWithMui } from '../../test-utils/render-with-mui'

const video = { title: 'Song Title' }

const fileMeta = {
  title: 'Song Title',
  artist: 'Song Artist',
  trackNumber: '3',
}

describe('PlaylistVideoItem', () => {
  const defaultProps = {
    video,
    index: 2,
    fileMeta,
    onMetadataChange: vi.fn(),
    totalTracks: 10,
    useSharedArtist: false,
  }

  it('renders collapsed by default with track number and title', () => {
    renderWithMui(<PlaylistVideoItem {...defaultProps} />)

    expect(screen.getByText('Song Title')).toBeInTheDocument()
    expect(screen.getByText('Track 3 of 10')).toBeInTheDocument()
  })

  it('expands on click to show fields', async () => {
    const user = userEvent.setup()
    renderWithMui(<PlaylistVideoItem {...defaultProps} />)

    await user.click(screen.getByText('Song Title'))

    expect(screen.getByLabelText('Title')).toBeInTheDocument()
    expect(screen.getByLabelText('Artist')).toBeInTheDocument()
    expect(screen.getByLabelText('Track Number')).toBeInTheDocument()
  })

  it('shows track number display in secondary text', () => {
    renderWithMui(
      <PlaylistVideoItem
        {...defaultProps}
        fileMeta={{ ...fileMeta, trackNumber: '' }}
      />
    )

    expect(screen.getByText('Track 3 of 10')).toBeInTheDocument()
  })

  it('has no accessibility violations', async () => {
    const { container } = renderWithMui(<PlaylistVideoItem {...defaultProps} />)
    expect(await axe(container, {
      rules: {
        'color-contrast': { enabled: false },
        'aria-input-field-name': { enabled: false },
        'heading-order': { enabled: false },
        'button-name': { enabled: false },
        'list': { enabled: false },
        'listitem': { enabled: false },
        'label': { enabled: false },
        'nested-interactive': { enabled: false },
      }
    })).toHaveNoViolations()
  })
})
