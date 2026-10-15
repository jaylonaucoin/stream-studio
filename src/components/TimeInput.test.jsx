import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { defaultA11yAxeConfig } from '../../tests/setup/axe-config.js';
import TimeInput from './TimeInput';
import { renderWithProviders } from '../test-utils/render-with-providers';

describe('TimeInput', () => {
  it('renders with label and placeholder', () => {
    renderWithProviders(<TimeInput label="Start" placeholder="0:00" onChange={() => {}} />);
    expect(screen.getByLabelText('Start')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('0:00')).toBeInTheDocument();
  });

  it('calls onChange when typing digits', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    renderWithProviders(<TimeInput label="Start" onChange={onChange} />);
    const input = screen.getByLabelText('Start');
    await user.click(input);
    await user.keyboard('1');
    expect(onChange).toHaveBeenCalledWith('1');
  });

  it('disabled prop prevents input', () => {
    renderWithProviders(<TimeInput label="Start" disabled onChange={() => {}} />);
    expect(screen.getByLabelText('Start')).toBeDisabled();
  });

  it('renders error state with helperText', () => {
    renderWithProviders(<TimeInput label="Start" error helperText="Invalid time" onChange={() => {}} />);
    expect(screen.getByText('Invalid time')).toBeInTheDocument();
  });

  it('only allows digit input (letters stripped from value)', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    renderWithProviders(<TimeInput label="Start" onChange={onChange} />);
    const input = screen.getByLabelText('Start');
    await user.click(input);
    await user.keyboard('a');
    expect(onChange).not.toHaveBeenCalled();
  });

  it('handles empty value', () => {
    renderWithProviders(<TimeInput label="Start" value="" onChange={() => {}} />);
    expect(screen.getByLabelText('Start')).toHaveValue('');
  });

  it('has no accessibility violations', async () => {
    const { container } = renderWithProviders(
      <TimeInput label="Start" placeholder="0:00" onChange={() => {}} />
    );
    expect(await axe(container, defaultA11yAxeConfig)).toHaveNoViolations();
  });
});
