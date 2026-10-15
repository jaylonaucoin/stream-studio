import { useState } from 'react'
import { CircleAlert, ChevronDown, ChevronUp } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

function ErrorDialog({ open, onClose, title, message }) {
  const [detailsExpanded, setDetailsExpanded] = useState(false)

  const handleOpenChange = (nextOpen) => {
    if (!nextOpen) {
      setDetailsExpanded(false)
      onClose()
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CircleAlert className="size-5 text-destructive" aria-hidden />
            {title}
          </DialogTitle>
        </DialogHeader>
        <p className="mb-2 whitespace-pre-wrap text-sm">{message}</p>
        {message && message.length > 200 ? (
          <div>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setDetailsExpanded(!detailsExpanded)}
            >
              {detailsExpanded ? 'Hide' : 'Show'} Full Details
              {detailsExpanded ? (
                <ChevronUp className="size-4" />
              ) : (
                <ChevronDown className="size-4" />
              )}
            </Button>
            <div
              className={cn(
                'mt-2 overflow-hidden transition-all',
                detailsExpanded ? 'max-h-52 opacity-100' : 'max-h-0 opacity-0'
              )}
            >
              <pre className="max-h-48 overflow-auto rounded-md bg-muted p-3 font-mono text-xs whitespace-pre-wrap">
                {message}
              </pre>
            </div>
          </div>
        ) : null}
        <DialogFooter>
          <Button onClick={() => handleOpenChange(false)} aria-label="Close error dialog">
            OK
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default ErrorDialog
