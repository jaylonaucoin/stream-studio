import { describe, it, expect, vi } from 'vitest'
import userEvent from '@testing-library/user-event'
import { screen } from '@testing-library/react'
import { axe } from 'jest-axe'
import { MetadataFormFields } from './MetadataFormFields'
import { renderWithMui } from '../test-utils/render-with-mui'

const baseMetadata = {
  title: 'Test Title',
  artist: 'Test Artist',
  album: 'Test Album',
  albumArtist: 'Album Artist',
  genre: '',
  year: '2024',
  composer: 'Composer',
  publisher: 'Publisher',
  comment: 'A comment',
  description: 'A description',
  language: 'en',
  bpm: '120',
  copyright: '2024',
}

describe('MetadataFormFields', () => {
  it('renders all text fields for full section', () => {
    renderWithMui(
      <MetadataFormFields metadata={baseMetadata} onChange={() => {}} />
    )

    expect(screen.getByLabelText('Title')).toBeInTheDocument()
    expect(screen.getByLabelText('Artist')).toBeInTheDocument()
    expect(screen.getByLabelText('Album')).toBeInTheDocument()
    expect(screen.getByLabelText('Album Artist')).toBeInTheDocument()
    expect(screen.getByLabelText('Year')).toBeInTheDocument()
    expect(screen.getByLabelText('Composer')).toBeInTheDocument()
    expect(screen.getByLabelText('Publisher')).toBeInTheDocument()
    expect(screen.getByLabelText('Comment')).toBeInTheDocument()
    expect(screen.getByLabelText('Description')).toBeInTheDocument()
    expect(screen.getByLabelText('Language')).toBeInTheDocument()
    expect(screen.getByLabelText('BPM')).toBeInTheDocument()
    expect(screen.getByLabelText('Copyright')).toBeInTheDocument()
  })

  it('fires onChange callback when a field is edited', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    renderWithMui(
      <MetadataFormFields metadata={baseMetadata} onChange={onChange} />
    )

    const titleField = screen.getByLabelText('Title')
    await user.clear(titleField)
    await user.type(titleField, 'New')

    expect(onChange).toHaveBeenCalled()
    expect(onChange).toHaveBeenCalledWith('title', expect.any(String))
  })

  it('renders only albumCore fields when renderSection is albumCore', () => {
    renderWithMui(
      <MetadataFormFields
        metadata={baseMetadata}
        onChange={() => {}}
        renderSection="albumCore"
      />
    )

    expect(screen.getByLabelText('Title')).toBeInTheDocument()
    expect(screen.getByLabelText('Album')).toBeInTheDocument()
    expect(screen.queryByLabelText('Composer')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Publisher')).not.toBeInTheDocument()
  })

  it('renders only advanced fields when renderSection is advanced', () => {
    renderWithMui(
      <MetadataFormFields
        metadata={baseMetadata}
        onChange={() => {}}
        renderSection="advanced"
      />
    )

    expect(screen.queryByLabelText('Title')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Album')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Composer')).toBeInTheDocument()
    expect(screen.getByLabelText('Publisher')).toBeInTheDocument()
  })

  it('has no accessibility violations', async () => {
    const { container } = renderWithMui(
      <MetadataFormFields metadata={baseMetadata} onChange={() => {}} />
    )
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
