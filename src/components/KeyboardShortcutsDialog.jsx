import { useMemo } from 'react'
import { Keyboard } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'

const SHORTCUTS = [
  {
    category: 'General',
    items: [
      { keys: ['Enter'], description: 'Start conversion' },
      { keys: ['Escape'], description: 'Cancel conversion' },
      { keys: ['Mod', 'V'], description: 'Paste URL from clipboard' },
      { keys: ['Mod', 'K'], description: 'Show keyboard shortcuts' },
    ],
  },
  {
    category: 'Navigation',
    items: [
      { keys: ['Mod', 'H'], description: 'Open history panel' },
      { keys: ['Mod', 'B'], description: 'Open URL batch queue panel' },
      { keys: ['Mod', 'Shift', 'B'], description: 'Switch to Library tab (local files & tags)' },
      { keys: ['Mod', ','], description: 'Open settings' },
    ],
  },
]

function KeyboardShortcutsDialog({ open, onClose }) {
  const modKeyLabel = useMemo(() => {
    if (typeof navigator === 'undefined') return 'Ctrl'
    const p = navigator.platform || ''
    if (/Mac|iPhone|iPad|iPod/i.test(p)) return '⌘'
    if (/Mac/i.test(navigator.userAgent || '')) return '⌘'
    return 'Ctrl'
  }, [])

  const getKeyLabel = (key) => {
    const labels = {
      Mod: modKeyLabel,
      Shift: 'Shift',
      Alt: 'Alt',
      Enter: 'Enter',
      Escape: 'Esc',
    }
    return labels[key] || key
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="sm:max-w-md" showCloseButton>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="size-5" aria-hidden />
            Keyboard Shortcuts
          </DialogTitle>
        </DialogHeader>

        <p className="mb-4 text-xs text-muted-foreground">
          Modifier shows as {modKeyLabel} on this system (Ctrl on Windows/Linux, ⌘ on macOS).
        </p>
        <div className="flex flex-col gap-6">
          {SHORTCUTS.map((category, idx) => (
            <div key={category.category}>
              <h3 className="mb-2 text-sm font-semibold text-muted-foreground">
                {category.category}
              </h3>
              <ul className="space-y-2">
                {category.items.map((item, itemIdx) => (
                  <li key={itemIdx} className="flex items-center justify-between gap-4">
                    <span className="text-sm">{item.description}</span>
                    <div className="flex items-center gap-1">
                      {item.keys.map((key, keyIdx) => (
                        <span key={keyIdx} className="flex items-center">
                          <kbd className="inline-block min-w-6 rounded border border-border bg-card px-2 py-0.5 text-center font-mono text-xs">
                            {getKeyLabel(key)}
                          </kbd>
                          {keyIdx < item.keys.length - 1 ? (
                            <span className="mx-1 text-sm text-muted-foreground">+</span>
                          ) : null}
                        </span>
                      ))}
                    </div>
                  </li>
                ))}
              </ul>
              {idx < SHORTCUTS.length - 1 ? <Separator className="mt-4" /> : null}
            </div>
          ))}
        </div>

        <DialogFooter>
          <Button onClick={onClose} aria-label="Close keyboard shortcuts">
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default KeyboardShortcutsDialog
