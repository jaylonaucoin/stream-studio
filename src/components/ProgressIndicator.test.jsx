import { describe, it, expect, vi } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe } from 'jest-axe'
import ProgressIndicator from './ProgressIndicator'
import { renderWithMui } from '../test-utils/render-with-mui'

const baseProps = {
  progress: 0,
  statusMessage: '',
  state: 'idle',
  lastConvertedFile: null,
  onOpenFileLocation: vi.fn(),
  progressSpeed: null,
  progressEta: null,
  progressSize: null,
  playlistInfo: null,
}

describe('ProgressIndicator', () => {
  it('renders idle message when state is idle', () => {
    renderWithMui(<ProgressIndicator {...baseProps} />)
    expect(screen.getByText(/paste a url/i)).toBeInTheDocument()
  })

  it('shows progress bar during converting state', () => {
    renderWithMui(
      <ProgressIndicator
        {...baseProps}
        state="converting"
        progress={45}
        statusMessage="Downloading..."
      />
    )
    expect(screen.getByRole('progressbar')).toBeInTheDocument()
    expect(screen.getByText('45%')).toBeInTheDocument()
    expect(screen.getByText('Downloading...')).toBeInTheDocument()
  })

  it('shows completion message when state is completed', () => {
    renderWithMui(
      <ProgressIndicator
        {...baseProps}
        state="completed"
        progress={100}
        statusMessage="Done"
        lastConvertedFile={{ fileName: 'song.mp3', filePath: '/out/song.mp3' }}
      />
    )
    expect(screen.getByText('Conversion Complete!')).toBeInTheDocument()
  })

  it('shows error chip when state is error', () => {
    renderWithMui(
      <ProgressIndicator
        {...baseProps}
        state="error"
        statusMessage="Download failed"
      />
    )
    expect(screen.getByText('Error')).toBeInTheDocument()
    expect(screen.getByText('Download failed')).toBeInTheDocument()
  })

  it('calls onOpenFileLocation when open location button is clicked', async () => {
    const onOpenFileLocation = vi.fn()
    const user = userEvent.setup()
    renderWithMui(
      <ProgressIndicator
        {...baseProps}
        state="completed"
        progress={100}
        statusMessage="Done"
        lastConvertedFile={{ fileName: 'song.mp3', filePath: '/out/song.mp3' }}
        onOpenFileLocation={onOpenFileLocation}
      />
    )
    await user.click(screen.getByRole('button', { name: /open location/i }))
    expect(onOpenFileLocation).toHaveBeenCalledWith('/out/song.mp3')
  })

  it('has no accessibility violations', async () => {
    const { container } = renderWithMui(<ProgressIndicator {...baseProps} />)
    expect(await axe(container, {
      rules: { 'color-contrast': { enabled: false } }
    })).toHaveNoViolations()
  })
})
