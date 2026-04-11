import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { screen } from '@testing-library/react';
import { axe } from 'jest-axe'
import ConversionForm from './ConversionForm';
import { renderWithMui } from '../test-utils/render-with-mui';
import { createRendererApiMock, installWindowApi } from '../../tests/setup/renderer-api-mock.js';

describe('ConversionForm', () => {
  let teardownApi

  beforeEach(() => {
    const { api } = createRendererApiMock()
    api.getVideoInfo.mockResolvedValue({
      success: true,
      title: 'Preview',
      thumbnail: null,
      extractor: 'youtube',
    })
    api.getPlaylistInfo.mockResolvedValue({ success: false, isPlaylist: false })
    api.getChapterInfo.mockResolvedValue({ success: false, hasChapters: false })
    teardownApi = installWindowApi(api)
  })

  afterEach(() => {
    teardownApi?.()
    vi.clearAllMocks()
  })

  it('shows FFmpeg warning when disabled', () => {
    renderWithMui(
      <ConversionForm
        onConvert={() => {}}
        onCancel={() => {}}
        isConverting={false}
        disabled
      />
    )
    expect(screen.getByText(/ffmpeg is not available/i)).toBeInTheDocument()
  })

  it('validates URL on paste tab', async () => {
    const user = userEvent.setup()
    renderWithMui(
      <ConversionForm
        onConvert={() => {}}
        onCancel={() => {}}
        isConverting={false}
        disabled={false}
      />
    )
    await user.click(screen.getByRole('tab', { name: /paste url/i }))
    const input = screen.getByRole('textbox', { name: /video or audio url input/i })
    await user.type(input, 'not-a-valid-url')
    expect(screen.getByText(/valid url|website url/i)).toBeInTheDocument()
  })

  it('renders without errors when not disabled', () => {
    renderWithMui(
      <ConversionForm
        onConvert={() => {}}
        onCancel={() => {}}
        isConverting={false}
        disabled={false}
      />
    )
    expect(screen.queryByText(/ffmpeg is not available/i)).not.toBeInTheDocument()
    expect(screen.getByRole('tablist', { name: /input mode/i })).toBeInTheDocument()
  })

  it('disabled prop disables the convert button area', async () => {
    const user = userEvent.setup()
    renderWithMui(
      <ConversionForm
        onConvert={() => {}}
        onCancel={() => {}}
        isConverting={false}
        disabled
      />
    )
    await user.click(screen.getByRole('tab', { name: /paste url/i }))
    const convertBtn = screen.getByRole('button', { name: /convert/i })
    expect(convertBtn).toBeDisabled()
  })

  it('has no accessibility violations', async () => {
    const { container } = renderWithMui(
      <ConversionForm
        onConvert={() => {}}
        onCancel={() => {}}
        isConverting={false}
        disabled={false}
      />
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
