import { describe, it, expect, vi } from 'vitest'
import userEvent from '@testing-library/user-event'
import { screen } from '@testing-library/react'
import { axe } from 'jest-axe'
import KeyboardShortcutsDialog from './KeyboardShortcutsDialog'
import { renderWithMui } from '../test-utils/render-with-mui'

describe('KeyboardShortcutsDialog', () => {
  it('renders shortcuts list when open', () => {
    renderWithMui(<KeyboardShortcutsDialog open onClose={() => {}} />)

    expect(screen.getByText('Keyboard Shortcuts')).toBeInTheDocument()
    expect(screen.getByText('Start conversion')).toBeInTheDocument()
    expect(screen.getByText('Cancel conversion')).toBeInTheDocument()
    expect(screen.getByText('Open history panel')).toBeInTheDocument()
  })

  it('close button triggers onClose callback', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    renderWithMui(<KeyboardShortcutsDialog open onClose={onClose} />)

    await user.click(screen.getByRole('button', { name: /close keyboard shortcuts/i }))

    expect(onClose).toHaveBeenCalledOnce()
  })

  it('has no accessibility violations', async () => {
    const { container } = renderWithMui(
      <KeyboardShortcutsDialog open onClose={() => {}} />
    )
    expect(await axe(container, {
      rules: { 'color-contrast': { enabled: false } }
    })).toHaveNoViolations()
  })
})
