import { describe, it, expect } from 'vitest'
import { screen } from '@testing-library/react'
import { axe } from 'jest-axe';
import { defaultA11yAxeConfig } from '../../tests/setup/axe-config.js';
import ThumbnailWithFallback from './ThumbnailWithFallback'
import { renderWithMui } from '../test-utils/render-with-mui'

describe('ThumbnailWithFallback', () => {
  it('renders placeholder when thumbnail is null', () => {
    renderWithMui(<ThumbnailWithFallback thumbnail={null} alt="thumb" />)
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
    expect(screen.getByTestId('MusicNoteIcon')).toBeInTheDocument()
  })

  it('renders img element when thumbnail string provided', () => {
    renderWithMui(
      <ThumbnailWithFallback thumbnail="https://example.com/img.jpg" alt="thumb" />
    )
    const img = screen.getByRole('img', { hidden: true })
    expect(img).toHaveAttribute('src', 'https://example.com/img.jpg')
  })

  it('renders playlist placeholder when isPlaylist and no thumbnail', () => {
    renderWithMui(<ThumbnailWithFallback thumbnail={null} alt="pl" isPlaylist />)
    expect(screen.getByTestId('PlaylistPlayIcon')).toBeInTheDocument()
  })

  it('renders placeholder for empty string thumbnail', () => {
    renderWithMui(<ThumbnailWithFallback thumbnail="" alt="empty" />)
    expect(screen.getByTestId('MusicNoteIcon')).toBeInTheDocument()
  })

  it('has no accessibility violations', async () => {
    const { container } = renderWithMui(
      <ThumbnailWithFallback thumbnail={null} alt="thumb" />
    )
    expect(await axe(container, defaultA11yAxeConfig)).toHaveNoViolations()
  })
})
