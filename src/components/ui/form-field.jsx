import { useId } from 'react'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

/**
 * Labeled text input with optional error/helper text.
 */
export function FormField({
  label,
  id,
  error,
  helperText,
  className,
  multiline = false,
  rows = 2,
  ...props
}) {
  const autoId = useId()
  const fieldId = id || autoId
  const Comp = multiline ? Textarea : Input
  return (
    <div className={cn('space-y-1.5', className)}>
      {label ? <Label htmlFor={fieldId}>{label}</Label> : null}
      <Comp
        id={fieldId}
        aria-invalid={error ? true : undefined}
        rows={multiline ? rows : undefined}
        {...props}
      />
      {error || helperText ? (
        <p className={cn('text-xs', error ? 'text-destructive' : 'text-muted-foreground')}>
          {error || helperText}
        </p>
      ) : null}
    </div>
  )
}
