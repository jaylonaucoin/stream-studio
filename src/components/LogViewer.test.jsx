import { describe, it, expect, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { screen } from '@testing-library/react';
import { axe } from 'jest-axe';
import { muiComplexFormAxeConfig } from '../../tests/setup/axe-config.js';
import LogViewer from './LogViewer';
import { renderWithMui } from '../test-utils/render-with-mui';

describe('LogViewer', () => {
  const defaultProps = {
    logs: [],
    visible: true,
    onToggleVisibility: vi.fn(),
    onClear: vi.fn(),
  };

  it('renders log entries when provided', () => {
    const logs = [
      { type: 'info', message: 'Starting conversion' },
      { type: 'success', message: 'Conversion complete' },
    ];
    renderWithMui(<LogViewer {...defaultProps} logs={logs} />);

    expect(screen.getByText('Starting conversion')).toBeInTheDocument();
    expect(screen.getByText('Conversion complete')).toBeInTheDocument();
  });

  it('renders empty state when no logs', () => {
    renderWithMui(<LogViewer {...defaultProps} logs={[]} />);

    expect(screen.getByText(/no logs yet/i)).toBeInTheDocument();
  });

  it('clear button calls onClear', async () => {
    const user = userEvent.setup();
    const onClear = vi.fn();
    const logs = [{ type: 'info', message: 'Hello' }];
    renderWithMui(<LogViewer {...defaultProps} logs={logs} onClear={onClear} />);

    await user.click(screen.getByRole('button', { name: /clear logs/i }));

    expect(onClear).toHaveBeenCalledOnce();
  });

  it('has no accessibility violations', async () => {
    const { container } = renderWithMui(<LogViewer {...defaultProps} />);
    expect(await axe(container, muiComplexFormAxeConfig)).toHaveNoViolations();
  });
});
