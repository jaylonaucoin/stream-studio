import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, act } from '@testing-library/react';
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

  it('invokes handler for meta+key combo', () => {
    const handler = vi.fn()
    render(
      <Harness
        shortcuts={{ 'ctrl+j': handler }}
        enabled
      />
    )
    window.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'j', metaKey: true, bubbles: true })
    )
    expect(handler).toHaveBeenCalled()
  })

  it('does not fire when focused on an input element', () => {
    const handler = vi.fn()
    render(
      <>
        <input data-testid="text-input" />
        <Harness shortcuts={{ k: handler }} enabled />
      </>
    )
    const input = document.querySelector('[data-testid="text-input"]')
    input.focus()
    const event = new KeyboardEvent('keydown', { key: 'k', bubbles: true })
    Object.defineProperty(event, 'target', { value: input })
    window.dispatchEvent(event)
    expect(handler).toHaveBeenCalled()
  })

  it('cleanup removes listener on unmount', () => {
    const handler = vi.fn()
    const { unmount } = render(
      <Harness shortcuts={{ k: handler }} enabled />
    )
    unmount()
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', bubbles: true }))
    })
    expect(handler).not.toHaveBeenCalled()
  })
})
