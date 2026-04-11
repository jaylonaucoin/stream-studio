import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen } from '@testing-library/react';
import ErrorBoundary from './ErrorBoundary';
import { renderWithMui } from '../test-utils/render-with-mui';

function ThrowingChild() {
  throw new Error('unit-test-boom')
}

describe('ErrorBoundary', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders fallback UI when child throws', () => {
    renderWithMui(
      <ErrorBoundary>
        <ThrowingChild />
      </ErrorBoundary>
    )
    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /reload window/i })).toBeInTheDocument()
  })
})
