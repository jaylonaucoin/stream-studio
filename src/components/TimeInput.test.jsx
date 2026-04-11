import { describe, it, expect, vi } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe } from 'jest-axe'
import TimeInput from './TimeInput'
import { renderWithMui } from '../test-utils/render-with-mui'

describe('TimeInput', () => {
  it('renders with label and placeholder', () => {
    renderWithMui(<TimeInput label="Start" placeholder="0:00" onChange={() => {}} />)
    expect(screen.getByLabelText('Start')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('0:00')).toBeInTheDocument()
  })

  it('calls onChange when typing digits', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    renderWithMui(<TimeInput label="Start" onChange={onChange} />)
    const input = screen.getByLabelText('Start')
    await user.click(input)
    await user.keyboard('1')
    expect(onChange).toHaveBeenCalledWith('1')
  })

  it('disabled prop prevents input', () => {
    renderWithMui(<TimeInput label="Start" disabled onChange={() => {}} />)
    expect(screen.getByLabelText('Start')).toBeDisabled()
  })

  it('renders error state with helperText', () => {
    renderWithMui(
      <TimeInput label="Start" error helperText="Invalid time" onChange={() => {}} />
    )
    expect(screen.getByText('Invalid time')).toBeInTheDocument()
  })

  it('only allows digit input (letters stripped from value)', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    renderWithMui(<TimeInput label="Start" onChange={onChange} />)
    const input = screen.getByLabelText('Start')
    await user.click(input)
    await user.keyboard('a')
    expect(onChange).not.toHaveBeenCalled()
  })

  it('handles empty value', () => {
    renderWithMui(<TimeInput label="Start" value="" onChange={() => {}} />)
    expect(screen.getByLabelText('Start')).toHaveValue('')
  })

  it('has no accessibility violations', async () => {
    const { container } = renderWithMui(
      <TimeInput label="Start" placeholder="0:00" onChange={() => {}} />
    )
    expect(await axe(container)).toHaveNoViolations()
  })
})
