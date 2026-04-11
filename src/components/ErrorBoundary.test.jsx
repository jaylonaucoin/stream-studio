import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen } from '@testing-library/react';
import { axe } from 'jest-axe';
import { defaultA11yAxeConfig } from '../../tests/setup/axe-config.js';
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

  it('renders children normally when no error occurs', () => {
    renderWithMui(
      <ErrorBoundary>
        <p>All good here</p>
      </ErrorBoundary>
    )
    expect(screen.getByText('All good here')).toBeInTheDocument()
    expect(screen.queryByText(/something went wrong/i)).not.toBeInTheDocument()
  })

  it('has no accessibility violations', async () => {
    const { container } = renderWithMui(
      <ErrorBoundary>
        <p>All good here</p>
      </ErrorBoundary>
    )
    expect(await axe(container, defaultA11yAxeConfig)).toHaveNoViolations()
  })
})
