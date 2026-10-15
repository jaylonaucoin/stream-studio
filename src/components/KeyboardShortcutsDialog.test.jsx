import { describe, it, expect, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { screen } from '@testing-library/react';
import { axe } from 'jest-axe';
import { defaultA11yAxeConfig } from '../../tests/setup/axe-config.js';
import KeyboardShortcutsDialog from './KeyboardShortcutsDialog';
import { renderWithProviders } from '../test-utils/render-with-providers';

describe('KeyboardShortcutsDialog', () => {
  it('renders shortcuts list when open', () => {
    renderWithProviders(<KeyboardShortcutsDialog open onClose={() => {}} />);

    expect(screen.getByText('Keyboard Shortcuts')).toBeInTheDocument();
    expect(screen.getByText('Start conversion')).toBeInTheDocument();
    expect(screen.getByText('Cancel conversion')).toBeInTheDocument();
    expect(screen.getByText('Open history panel')).toBeInTheDocument();
  });

  it('close button triggers onClose callback', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    renderWithProviders(<KeyboardShortcutsDialog open onClose={onClose} />);

    await user.click(screen.getByRole('button', { name: /close keyboard shortcuts/i }));

    expect(onClose).toHaveBeenCalledOnce();
  });

  it('has no accessibility violations', async () => {
    const { container } = renderWithProviders(<KeyboardShortcutsDialog open onClose={() => {}} />);
    expect(await axe(container, defaultA11yAxeConfig)).toHaveNoViolations();
  });
});
