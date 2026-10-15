import { Loader2Icon } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Loading spinner.
 * @param {{ className?: string, size?: 'sm'|'default'|'lg' }} props
 */
function Spinner({ className, size = 'default' }) {
  const sizeClass =
    size === 'sm' ? 'size-4' : size === 'lg' ? 'size-8' : 'size-5'
  return (
    <Loader2Icon
      className={cn('animate-spin text-primary', sizeClass, className)}
      aria-hidden
    />
  )
}

export { Spinner }
