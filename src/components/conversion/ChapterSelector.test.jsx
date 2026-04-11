import { describe, it, expect, vi } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe } from 'jest-axe';
import { muiComplexFormAxeConfig } from '../../../tests/setup/axe-config.js';
import ChapterSelector from './ChapterSelector'
import { renderWithMui } from '../../test-utils/render-with-mui'

const chapterInfo = {
  totalChapters: 3,
  chapters: [
    { title: 'Intro', timeRange: '0:00 – 1:00', durationFormatted: '1:00' },
    { title: 'Main', timeRange: '1:00 – 5:00', durationFormatted: '4:00' },
    { title: 'Outro', timeRange: '5:00 – 6:00', durationFormatted: '1:00' },
  ],
}

const defaults = {
  chapterInfo,
  selectedChapters: [0, 1, 2],
  onChapterToggle: vi.fn(),
  onSelectAll: vi.fn(),
  onDeselectAll: vi.fn(),
  chapterDownloadMode: 'full',
  onChapterDownloadModeChange: vi.fn(),
  editedChapterTitles: {},
  onChapterTitleChange: vi.fn(),
  onEditMetadata: vi.fn(),
  disabled: false,
  isConverting: false,
}

describe('ChapterSelector', () => {
  it('renders chapter list from chapterInfo', () => {
    renderWithMui(<ChapterSelector {...defaults} />)
    expect(screen.getByText('Intro')).toBeInTheDocument()
    expect(screen.getByText('Main')).toBeInTheDocument()
    expect(screen.getByText('Outro')).toBeInTheDocument()
  })

  it('select all calls onSelectAll', async () => {
    const onSelectAll = vi.fn()
    const user = userEvent.setup()
    renderWithMui(
      <ChapterSelector {...defaults} selectedChapters={[0]} onSelectAll={onSelectAll} />
    )
    await user.click(screen.getByRole('button', { name: /^select all$/i }))
    expect(onSelectAll).toHaveBeenCalledTimes(1)
  })

  it('deselect all calls onDeselectAll', async () => {
    const onDeselectAll = vi.fn()
    const user = userEvent.setup()
    renderWithMui(<ChapterSelector {...defaults} onDeselectAll={onDeselectAll} />)
    await user.click(screen.getByRole('button', { name: /deselect all/i }))
    expect(onDeselectAll).toHaveBeenCalledTimes(1)
  })

  it('chapter row click calls onChapterToggle', async () => {
    const onChapterToggle = vi.fn()
    const user = userEvent.setup()
    renderWithMui(<ChapterSelector {...defaults} onChapterToggle={onChapterToggle} />)
    await user.click(screen.getByText('Main'))
    expect(onChapterToggle).toHaveBeenCalledWith(1)
  })

  it('download mode toggle calls onChapterDownloadModeChange', async () => {
    const onChapterDownloadModeChange = vi.fn()
    const user = userEvent.setup()
    renderWithMui(
      <ChapterSelector
        {...defaults}
        onChapterDownloadModeChange={onChapterDownloadModeChange}
      />
    )
    await user.click(screen.getByRole('button', { name: /selected chapters mode/i }))
    expect(onChapterDownloadModeChange).toHaveBeenCalledWith('split')
  })

  it('has no accessibility violations', async () => {
    const { container } = renderWithMui(<ChapterSelector {...defaults} />)
    expect(await axe(container, muiComplexFormAxeConfig)).toHaveNoViolations()
  })
})
