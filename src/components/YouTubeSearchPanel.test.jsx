import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import userEvent from '@testing-library/user-event'
import { screen, waitFor } from '@testing-library/react'
import { axe } from 'jest-axe';
import { muiComplexFormAxeConfig } from '../../tests/setup/axe-config.js';
import YouTubeSearchPanel from './YouTubeSearchPanel'
import { renderWithMui } from '../test-utils/render-with-mui'
import { createRendererApiMock, installWindowApi } from '../../tests/setup/renderer-api-mock.js'

const mockResults = [
  {
    id: 'r1',
    title: 'Test Song One',
    uploader: 'Artist A',
    durationFormatted: '3:45',
    webpageUrl: 'https://youtube.com/watch?v=abc',
    thumbnail: null,
  },
  {
    id: 'r2',
    title: 'Test Song Two',
    uploader: 'Artist B',
    durationFormatted: '4:20',
    webpageUrl: 'https://youtube.com/watch?v=def',
    thumbnail: null,
  },
]

describe('YouTubeSearchPanel', () => {
  let teardownApi
  let apiMock

  const defaultProps = {
    onSelect: vi.fn(),
    onAddToQueue: vi.fn(),
    disabled: false,
    isConverting: false,
    defaultSearchSite: 'youtube',
    defaultSearchLimit: 15,
  }

  beforeEach(() => {
    const mock = createRendererApiMock()
    apiMock = mock
    teardownApi = installWindowApi(mock.api)
  })

  afterEach(() => {
    teardownApi?.()
    vi.clearAllMocks()
  })

  it('renders search input and button', () => {
    renderWithMui(<YouTubeSearchPanel {...defaultProps} />)

    expect(screen.getByRole('textbox', { name: /search query/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /search/i })).toBeInTheDocument()
  })

  it('search button is disabled with empty query', () => {
    renderWithMui(<YouTubeSearchPanel {...defaultProps} />)

    expect(screen.getByRole('button', { name: /search/i })).toBeDisabled()
  })

  it('triggers API call on search button click', async () => {
    const user = userEvent.setup()
    apiMock.api.searchMultiSite.mockResolvedValueOnce({
      success: true,
      results: mockResults,
    })

    renderWithMui(<YouTubeSearchPanel {...defaultProps} />)

    await user.type(screen.getByRole('textbox', { name: /search query/i }), 'test query')
    await user.click(screen.getByRole('button', { name: /search/i }))

    await waitFor(() => {
      expect(apiMock.api.searchMultiSite).toHaveBeenCalledWith('youtube', 'test query', 15)
    })
  })

  it('displays results after successful search', async () => {
    const user = userEvent.setup()
    apiMock.api.searchMultiSite.mockResolvedValueOnce({
      success: true,
      results: mockResults,
    })

    renderWithMui(<YouTubeSearchPanel {...defaultProps} />)

    await user.type(screen.getByRole('textbox', { name: /search query/i }), 'test query')
    await user.click(screen.getByRole('button', { name: /search/i }))

    await waitFor(() => {
      expect(screen.getByText('Test Song One')).toBeInTheDocument()
    })
    expect(screen.getByText('Test Song Two')).toBeInTheDocument()
    expect(screen.getByText('Artist A')).toBeInTheDocument()
  })

  it('calls onSelect when a result is clicked', async () => {
    const user = userEvent.setup()
    apiMock.api.searchMultiSite.mockResolvedValueOnce({
      success: true,
      results: mockResults,
    })

    renderWithMui(<YouTubeSearchPanel {...defaultProps} />)

    await user.type(screen.getByRole('textbox', { name: /search query/i }), 'test query')
    await user.click(screen.getByRole('button', { name: /search/i }))

    await waitFor(() => {
      expect(screen.getByText('Test Song One')).toBeInTheDocument()
    })

    await user.click(screen.getByText('Test Song One'))

    expect(defaultProps.onSelect).toHaveBeenCalledWith('https://youtube.com/watch?v=abc')
  })

  it('displays error message when search fails', async () => {
    const user = userEvent.setup()
    apiMock.api.searchMultiSite.mockResolvedValueOnce({
      success: false,
      error: 'Network error occurred',
    })

    renderWithMui(<YouTubeSearchPanel {...defaultProps} />)

    await user.type(screen.getByRole('textbox', { name: /search query/i }), 'test query')
    await user.click(screen.getByRole('button', { name: /search/i }))

    await waitFor(() => {
      expect(screen.getByText('Network error occurred')).toBeInTheDocument()
    })
  })

  it('search is disabled when isConverting is true', () => {
    renderWithMui(<YouTubeSearchPanel {...defaultProps} isConverting />)

    expect(screen.getByRole('textbox', { name: /search query/i })).toBeDisabled()
    expect(screen.getByRole('button', { name: /search/i })).toBeDisabled()
  })

  it('shows empty state with no results and no search performed', () => {
    renderWithMui(<YouTubeSearchPanel {...defaultProps} />)

    expect(screen.getByText('Search for songs to learn')).toBeInTheDocument()
  })

  it('has no accessibility violations', async () => {
    const { container } = renderWithMui(<YouTubeSearchPanel {...defaultProps} />)
    expect(await axe(container, muiComplexFormAxeConfig)).toHaveNoViolations()
  })
})
