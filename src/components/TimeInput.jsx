import { useCallback, useState, useEffect, useId } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

/**
 * Format raw digits into duration format (MM:SS or H:MM:SS)
 */
const formatDuration = (digits) => {
  if (!digits) return ''

  const clean = digits.replace(/\D/g, '')

  if (clean.length <= 2) {
    return clean
  }

  if (clean.length <= 4) {
    const seconds = clean.slice(-2)
    const minutes = clean.slice(0, -2)
    return `${minutes}:${seconds}`
  }

  const seconds = clean.slice(-2)
  const minutes = clean.slice(-4, -2)
  const hours = clean.slice(0, -4)
  return `${hours}:${minutes}:${seconds}`
}

/**
 * Validate and cap seconds/minutes at 59 where appropriate
 */
const validateDuration = (value) => {
  const digits = value.replace(/\D/g, '')
  if (digits.length < 3) return value

  const secondsStr = digits.slice(-2)
  let seconds = parseInt(secondsStr, 10)

  if (seconds > 59) {
    seconds = 59
  }

  if (digits.length > 4) {
    const minutesStr = digits.slice(-4, -2)
    let minutes = parseInt(minutesStr, 10)
    if (minutes > 59) {
      minutes = 59
    }
    const hours = digits.slice(0, -4)
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
  }

  const minutes = digits.slice(0, -2)
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

/**
 * Duration input with auto-formatting.
 */
function TimeInput({
  value = '',
  onChange,
  label,
  placeholder = '0:00',
  disabled = false,
  error = false,
  helperText = '',
  className,
  ...props
}) {
  const [internalValue, setInternalValue] = useState('')
  const inputId = useId()

  useEffect(() => {
    setInternalValue(value)
  }, [value])

  const handleChange = useCallback(
    (e) => {
      const input = e.target.value
      const newDigits = input.replace(/\D/g, '')
      const limitedDigits = newDigits.slice(0, 6)
      const formatted = formatDuration(limitedDigits)

      setInternalValue(formatted)
      onChange(formatted)
    },
    [onChange]
  )

  const handleBlur = useCallback(() => {
    const validated = validateDuration(internalValue)
    if (validated !== internalValue) {
      setInternalValue(validated)
      onChange(validated)
    }
  }, [internalValue, onChange])

  const handleKeyDown = useCallback(
    (e) => {
      if (
        e.key === 'Backspace' ||
        e.key === 'Delete' ||
        e.key === 'Tab' ||
        e.key === 'Escape' ||
        e.key === 'Enter' ||
        e.key === 'ArrowLeft' ||
        e.key === 'ArrowRight' ||
        e.key === 'Home' ||
        e.key === 'End'
      ) {
        return
      }

      if (e.ctrlKey || e.metaKey) {
        return
      }

      if (!/^\d$/.test(e.key)) {
        e.preventDefault()
      }

      const currentDigits = internalValue.replace(/\D/g, '')
      if (currentDigits.length >= 6 && /^\d$/.test(e.key)) {
        const input = e.target
        if (input.selectionStart === input.selectionEnd) {
          e.preventDefault()
        }
      }
    },
    [internalValue]
  )

  return (
    <div className={cn('w-35 space-y-1.5', className)}>
      {label ? <Label htmlFor={inputId}>{label}</Label> : null}
      <Input
        {...props}
        id={inputId}
        value={internalValue}
        onChange={handleChange}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        aria-invalid={error || undefined}
        className="font-mono"
        inputMode="numeric"
      />
      {helperText ? (
        <p className={cn('text-xs', error ? 'text-destructive' : 'text-muted-foreground')}>
          {helperText}
        </p>
      ) : null}
    </div>
  )
}

export default TimeInput
