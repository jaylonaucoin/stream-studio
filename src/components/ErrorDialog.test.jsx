import { describe, it, expect, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { screen } from '@testing-library/react';
import { axe } from 'jest-axe'
import ErrorDialog from './ErrorDialog';
import { renderWithMui } from '../test-utils/render-with-mui';

describe('ErrorDialog', () => {
  it('closes and resets details expansion', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    const longMsg = 'x'.repeat(220)
    const { rerender } = renderWithMui(
      <ErrorDialog open title="Error" message={longMsg} onClose={onClose} />
    )
    await user.click(screen.getByRole('button', { name: /show full details/i }))
    await user.click(screen.getByRole('button', { name: /close error dialog/i }))
    expect(onClose).toHaveBeenCalled()
    rerender(
      <ErrorDialog open={false} title="Error" message={longMsg} onClose={onClose} />
    )
    rerender(
      <ErrorDialog open title="Error" message={longMsg} onClose={onClose} />
    )
    expect(screen.queryByRole('button', { name: /hide full details/i })).not.toBeInTheDocument()
  })

  it('has no accessibility violations', async () => {
    const { container } = renderWithMui(
      <ErrorDialog open title="Error" message="Something failed" onClose={() => {}} />
    )
    expect(await axe(container, {
      rules: { 'color-contrast': { enabled: false } }
    })).toHaveNoViolations()
  })
})
