import { describe, it, expect, vi } from 'vitest'
import userEvent from '@testing-library/user-event'
import { screen } from '@testing-library/react'
import { axe } from 'jest-axe';
import { defaultA11yAxeConfig } from '../../tests/setup/axe-config.js';
import OutputFolderSelector from './OutputFolderSelector'
import { renderWithMui } from '../test-utils/render-with-mui'

describe('OutputFolderSelector', () => {
  const defaultProps = {
    folder: '/Users/test/Downloads/music',
    onChange: vi.fn(),
  }

  it('renders the current output folder path', () => {
    renderWithMui(<OutputFolderSelector {...defaultProps} />)

    expect(screen.getByText('/Users/test/Downloads/music')).toBeInTheDocument()
  })

  it('renders a change button', () => {
    renderWithMui(<OutputFolderSelector {...defaultProps} />)

    expect(screen.getByRole('button', { name: /choose folder/i })).toBeInTheDocument()
  })

  it('calls onChange when the change button is clicked', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    renderWithMui(<OutputFolderSelector folder="/tmp/out" onChange={onChange} />)

    await user.click(screen.getByRole('button', { name: /choose folder/i }))

    expect(onChange).toHaveBeenCalledOnce()
  })

  it('has no accessibility violations', async () => {
    const { container } = renderWithMui(
      <OutputFolderSelector {...defaultProps} />
    )
    expect(await axe(container, defaultA11yAxeConfig)).toHaveNoViolations()
  })

  it('matches snapshot', () => {
    const { container } = renderWithMui(<OutputFolderSelector {...defaultProps} />)
    expect(container.firstChild).toMatchSnapshot()
  })
})
