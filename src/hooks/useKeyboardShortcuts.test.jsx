import { describe, it, expect, vi, afterEach } from 'vitest';
import { render } from '@testing-library/react';
import { useKeyboardShortcuts } from './useKeyboardShortcuts';

function Harness({ shortcuts, enabled }) {
  useKeyboardShortcuts(shortcuts, { enabled })
  return null
}

describe('useKeyboardShortcuts', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('invokes handler for ctrl+k style combo', () => {
    const handler = vi.fn()
    render(
      <Harness
        shortcuts={{ 'ctrl+k': handler }}
        enabled
      />
    )
    window.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true })
    )
    expect(handler).toHaveBeenCalled()
  })

  it('does nothing when disabled', () => {
    const handler = vi.fn()
    render(
      <Harness shortcuts={{ k: handler }} enabled={false} />
    )
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', bubbles: true }))
    expect(handler).not.toHaveBeenCalled()
  })
})
