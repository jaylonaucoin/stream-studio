import { useCallback, useState, useEffect } from 'react';
import { TextField } from '@mui/material';

/**
 * Format raw digits into duration format (MM:SS or H:MM:SS)
 *
 * Examples:
 * - "3" -> "3"
 * - "34" -> "34"
 * - "348" -> "3:48"
 * - "2514" -> "25:14"
 * - "12345" -> "1:23:45"
 * - "123456" -> "12:34:56"
 */
const formatDuration = (digits) => {
  if (!digits) return '';

  // Remove any non-digits
  const clean = digits.replace(/\D/g, '');

  if (clean.length <= 2) {
    // Just seconds or incomplete - show as-is
    return clean;
  }

  if (clean.length <= 4) {
    // MM:SS format
    const seconds = clean.slice(-2);
    const minutes = clean.slice(0, -2);
    return `${minutes}:${seconds}`;
  }

  // H:MM:SS or longer format
  const seconds = clean.slice(-2);
  const minutes = clean.slice(-4, -2);
  const hours = clean.slice(0, -4);
  return `${hours}:${minutes}:${seconds}`;
};

/**
 * Validate and cap seconds/minutes at 59 where appropriate
 */
const validateDuration = (value) => {
  const digits = value.replace(/\D/g, '');
  if (digits.length < 3) return value;

  // Get last 2 digits (seconds)
  const secondsStr = digits.slice(-2);
  let seconds = parseInt(secondsStr, 10);

  // Cap seconds at 59
  if (seconds > 59) {
    seconds = 59;
  }

  // For H:MM:SS format, also cap minutes
  if (digits.length > 4) {
    const minutesStr = digits.slice(-4, -2);
    let minutes = parseInt(minutesStr, 10);
    if (minutes > 59) {
      minutes = 59;
    }
    const hours = digits.slice(0, -4);
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }

  // For MM:SS format
  const minutes = digits.slice(0, -2);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

/**
 * TimeInput component - A MUI TextField with auto-formatting for duration input
 *
 * Typing behavior:
 * - Type "3" -> "3"
 * - Type "34" -> "34"
 * - Type "348" -> "3:48"
 * - Type "2514" -> "25:14"
 * - Type "12345" -> "1:23:45"
 *
 * @param {Object} props
 * @param {string} props.value - Current time value (e.g., "3:48", "25:14", "1:23:45")
 * @param {function} props.onChange - Called with new value when input changes
 * @param {string} props.label - TextField label
 * @param {string} props.placeholder - Placeholder text
 * @param {boolean} props.disabled - Whether input is disabled
 * @param {boolean} props.error - Whether to show error state
 * @param {string} props.helperText - Helper text to display below input
 * @param {Object} props.sx - MUI sx prop for styling
 */
function TimeInput({
  value = '',
  onChange,
  label,
  placeholder = '0:00',
  disabled = false,
  error = false,
  helperText = '',
  sx = {},
  ...props
}) {
  // Internal state to track raw digits for proper formatting
  const [internalValue, setInternalValue] = useState('');

  // Sync external value to internal state
  useEffect(() => {
    setInternalValue(value);
  }, [value]);

  const handleChange = useCallback(
    (e) => {
      const input = e.target.value;

      // Extract only digits from input
      const newDigits = input.replace(/\D/g, '');

      // Limit to 6 digits (HH:MM:SS)
      const limitedDigits = newDigits.slice(0, 6);

      // Format the digits
      const formatted = formatDuration(limitedDigits);

      setInternalValue(formatted);
      onChange(formatted);
    },
    [onChange]
  );

  const handleBlur = useCallback(
    (_e) => {
      // Validate on blur (cap seconds at 59)
      const validated = validateDuration(internalValue);
      if (validated !== internalValue) {
        setInternalValue(validated);
        onChange(validated);
      }
    },
    [internalValue, onChange]
  );

  const handleKeyDown = useCallback(
    (e) => {
      // Allow: backspace, delete, tab, escape, enter
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
        return;
      }

      // Allow Ctrl+A, Ctrl+C, Ctrl+V, Ctrl+X
      if (e.ctrlKey || e.metaKey) {
        return;
      }

      // Block non-numeric input
      if (!/^\d$/.test(e.key)) {
        e.preventDefault();
      }

      // Block if already at max length (6 digits)
      const currentDigits = internalValue.replace(/\D/g, '');
      if (currentDigits.length >= 6 && /^\d$/.test(e.key)) {
        // Allow if there's a selection that will be replaced
        const input = e.target;
        if (input.selectionStart === input.selectionEnd) {
          e.preventDefault();
        }
      }
    },
    [internalValue]
  );

  return (
    <TextField
      {...props}
      label={label}
      value={internalValue}
      onChange={handleChange}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      placeholder={placeholder}
      size="small"
      disabled={disabled}
      error={error}
      helperText={helperText}
      sx={{ width: 140, ...sx }}
      inputProps={{
        style: { fontFamily: 'monospace' },
        inputMode: 'numeric',
      }}
    />
  );
}

export default TimeInput;
