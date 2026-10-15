import React, { useEffect, useRef } from 'react'
import {
  Eye,
  EyeOff,
  X,
  Info,
  CircleCheck,
  CircleX,
} from 'lucide-react'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

function LogViewer({ logs, visible, onToggleVisibility, onClear }) {
  const logEndRef = useRef(null)
  const [expanded, setExpanded] = React.useState(['logs'])

  useEffect(() => {
    if (expanded.includes('logs') && logEndRef.current?.scrollIntoView) {
      logEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [logs, expanded])

  const getLogIcon = (type) => {
    switch (type) {
      case 'success':
        return <CircleCheck className="size-4 text-success" />
      case 'error':
        return <CircleX className="size-4 text-destructive" />
      default:
        return <Info className="size-4 text-primary" />
    }
  }

  const getBorderClass = (type) => {
    switch (type) {
      case 'success':
        return 'border-success'
      case 'error':
        return 'border-destructive'
      case 'progress':
        return 'border-primary'
      default:
        return 'border-border'
    }
  }

  return (
    <Accordion
      multiple
      value={expanded}
      onValueChange={setExpanded}
      className="rounded-xl border border-border bg-card shadow-sm"
    >
      <AccordionItem value="logs" className="border-none px-2">
        <AccordionTrigger className="hover:no-underline">
          <div className="flex flex-1 items-center gap-2 pr-2">
            <span className="flex-1 text-left text-sm font-medium">Conversion Logs</span>
            {logs.length > 0 ? <Badge>{logs.length}</Badge> : null}
            <Button
              size="icon-sm"
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation()
                onToggleVisibility()
              }}
              aria-label={visible ? 'hide logs' : 'show logs'}
            >
              {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </Button>
            {logs.length > 0 ? (
              <Button
                size="icon-sm"
                variant="ghost"
                onClick={(e) => {
                  e.stopPropagation()
                  onClear()
                }}
                aria-label="clear logs"
              >
                <X className="size-4" />
              </Button>
            ) : null}
          </div>
        </AccordionTrigger>
        <AccordionContent>
          <div className="max-h-72 overflow-auto rounded-lg border border-border bg-muted/40 p-4 font-mono text-xs">
            {logs.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground italic">
                No logs yet. Start a conversion to see progress logs.
              </p>
            ) : (
              logs.map((log, index) => (
                <div
                  key={index}
                  className={cn(
                    'mb-2 flex items-start gap-2 border-l-2 py-1 pl-2',
                    getBorderClass(log.type)
                  )}
                >
                  <span className="mt-0.5">{getLogIcon(log.type)}</span>
                  <span
                    className={cn(
                      'flex-1 break-words',
                      log.type === 'error' ? 'text-destructive' : 'text-foreground'
                    )}
                  >
                    {log.message}
                  </span>
                </div>
              ))
            )}
            <div ref={logEndRef} />
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  )
}

export default LogViewer
