import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  History,
  Trash2,
  FolderOpen,
  Music,
  Film,
  X,
  Copy,
  Search,
  ListMusic,
} from 'lucide-react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  historyItemsFromResponse,
  historyErrorFromResponse,
  isIpcFailure,
} from '../utils/ipcResult'

function HistoryPanel({ open, onClose }) {
  const [history, setHistory] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [loadError, setLoadError] = useState(null)

  const loadHistory = useCallback(async () => {
    if (window.api && window.api.getHistory) {
      try {
        const res = await window.api.getHistory()
        const err = historyErrorFromResponse(res)
        if (err) {
          setLoadError(err)
          setHistory([])
          return
        }
        setLoadError(null)
        setHistory(historyItemsFromResponse(res))
      } catch (err) {
        console.error('Failed to load history:', err)
        setLoadError(err.message || 'Failed to load history')
        setHistory([])
      }
    }
  }, [])

  useEffect(() => {
    if (open) {
      loadHistory()
    }
  }, [open, loadHistory])

  const handleRemoveItem = async (id) => {
    if (window.api && window.api.removeHistoryItem) {
      try {
        const updated = await window.api.removeHistoryItem(id)
        if (isIpcFailure(updated)) {
          setLoadError(updated.error || 'Failed to remove item')
          return
        }
        setHistory(Array.isArray(updated) ? updated : [])
      } catch (err) {
        console.error('Failed to remove history item:', err)
        setLoadError(err.message || 'Failed to remove item')
      }
    }
  }

  const handleClearAll = async () => {
    if (window.api && window.api.clearHistory) {
      try {
        const res = await window.api.clearHistory()
        if (isIpcFailure(res)) {
          setLoadError(res.error || 'Failed to clear history')
          return
        }
        setHistory([])
      } catch (err) {
        console.error('Failed to clear history:', err)
        setLoadError(err.message || 'Failed to clear history')
      }
    }
  }

  const handleOpenLocation = async (item) => {
    if (window.api && window.api.openFileLocation) {
      try {
        const pathToOpen = item.isPlaylist ? item.playlistFolder || item.filePath : item.filePath
        await window.api.openFileLocation(pathToOpen)
      } catch (err) {
        console.error('Failed to open file location:', err)
      }
    }
  }

  const handleCopyUrl = async (url) => {
    try {
      await navigator.clipboard.writeText(url)
    } catch (err) {
      console.error('Failed to copy URL:', err)
    }
  }

  const formatDate = (timestamp) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diff = now - date

    if (diff < 3600000) {
      const mins = Math.floor(diff / 60000)
      return mins <= 1 ? 'Just now' : `${mins} minutes ago`
    }

    if (diff < 86400000) {
      const hours = Math.floor(diff / 3600000)
      return hours === 1 ? '1 hour ago' : `${hours} hours ago`
    }

    if (diff < 604800000) {
      const days = Math.floor(diff / 86400000)
      return days === 1 ? 'Yesterday' : `${days} days ago`
    }

    return date.toLocaleDateString()
  }

  const filteredHistory = useMemo(() => {
    if (!searchQuery.trim()) return history

    const query = searchQuery.toLowerCase()
    return history.filter((item) => {
      const fileName = item.fileName?.toLowerCase() || ''
      const url = item.url?.toLowerCase() || ''
      const format = item.format?.toLowerCase() || ''
      return fileName.includes(query) || url.includes(query) || format.includes(query)
    })
  }, [history, searchQuery])

  return (
    <Sheet open={open} onOpenChange={(next) => !next && onClose()}>
      <SheetContent side="right" className="w-full bg-background sm:max-w-md" showCloseButton>
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <History className="size-5" aria-hidden />
            Conversion History
            {history.length > 0 ? (
              <Badge title={`${history.length} item${history.length !== 1 ? 's' : ''} in history`}>
                {history.length}
              </Badge>
            ) : null}
          </SheetTitle>
        </SheetHeader>

        <div className="flex flex-1 flex-col gap-3 overflow-hidden px-1 pb-4">
          {loadError ? (
            <Alert variant="destructive">
              <AlertDescription className="flex items-center justify-between gap-2">
                <span>{loadError}</span>
                <Button size="sm" variant="ghost" onClick={() => setLoadError(null)}>
                  Dismiss
                </Button>
              </AlertDescription>
            </Alert>
          ) : null}

          {history.length > 0 ? (
            <Button
              size="sm"
              variant="ghost"
              className="w-fit text-destructive hover:text-destructive"
              onClick={handleClearAll}
            >
              <Trash2 className="size-4" />
              Clear All
            </Button>
          ) : null}

          {history.length > 0 ? (
            <div className="relative">
              <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search history..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pr-8 pl-8"
              />
              {searchQuery ? (
                <Button
                  size="icon-xs"
                  variant="ghost"
                  className="absolute top-1/2 right-1 -translate-y-1/2"
                  onClick={() => setSearchQuery('')}
                  aria-label="Clear search"
                >
                  <X className="size-3.5" />
                </Button>
              ) : null}
            </div>
          ) : null}

          <Separator />

          {history.length === 0 ? (
            <div className="py-12 text-center">
              <History className="mx-auto mb-4 size-16 text-muted-foreground/50" aria-hidden />
              <h3 className="mb-1 text-base font-semibold text-muted-foreground">
                No conversion history yet
              </h3>
              <p className="mx-auto max-w-xs text-sm text-muted-foreground/80">
                Your converted files will appear here for easy access and management
              </p>
            </div>
          ) : filteredHistory.length === 0 ? (
            <div className="py-12 text-center">
              <Search className="mx-auto mb-4 size-16 text-muted-foreground/50" aria-hidden />
              <h3 className="mb-1 text-base font-semibold text-muted-foreground">No results found</h3>
              <p className="mx-auto max-w-xs text-sm text-muted-foreground/80">
                Try a different search term or clear the search to see all items
              </p>
            </div>
          ) : (
            <ScrollArea className="h-[calc(100vh-220px)]">
              <ul className="space-y-2 pr-3">
                {filteredHistory.map((item) => (
                  <li
                    key={item.id}
                    data-slot="history-item"
                    className="rounded-lg border border-border bg-card p-3 transition-shadow hover:shadow-sm"
                  >
                    <div className="mb-2 flex items-center gap-2">
                      {item.isPlaylist ? (
                        <ListMusic className="size-4 shrink-0 text-primary" />
                      ) : item.mode === 'audio' ? (
                        <Music className="size-4 shrink-0 text-primary" />
                      ) : (
                        <Film className="size-4 shrink-0 text-secondary" />
                      )}
                      <span className="flex-1 truncate text-sm font-medium" title={item.fileName}>
                        {item.fileName}
                      </span>
                    </div>

                    <div className="mb-2 flex flex-wrap gap-1">
                      {item.isPlaylist ? (
                        <Badge>
                          <ListMusic className="size-3" />
                          Playlist ({item.playlistFiles?.length || 0} files)
                        </Badge>
                      ) : null}
                      <Badge variant="outline">{item.format?.toUpperCase() || 'Unknown'}</Badge>
                      {!item.isPlaylist ? (
                        <Badge variant="outline">
                          {item.mode === 'audio' ? 'Audio' : 'Video'}
                        </Badge>
                      ) : null}
                      <Badge variant="outline">{formatDate(item.timestamp)}</Badge>
                    </div>

                    <div className="flex gap-1">
                      <Tooltip>
                        <TooltipTrigger
                          render={
                            <Button
                              size="icon-sm"
                              variant="ghost"
                              onClick={() => handleOpenLocation(item)}
                              aria-label={
                                item.isPlaylist ? 'Open playlist folder' : 'Open file location'
                              }
                            />
                          }
                        >
                          <FolderOpen className="size-4" />
                        </TooltipTrigger>
                        <TooltipContent>
                          {item.isPlaylist ? 'Open playlist folder' : 'Open file location'}
                        </TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger
                          render={
                            <Button
                              size="icon-sm"
                              variant="ghost"
                              onClick={() => handleCopyUrl(item.url)}
                              aria-label="Copy URL"
                            />
                          }
                        >
                          <Copy className="size-4" />
                        </TooltipTrigger>
                        <TooltipContent>Copy URL</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger
                          render={
                            <Button
                              size="icon-sm"
                              variant="ghost"
                              className="text-destructive hover:text-destructive"
                              onClick={() => handleRemoveItem(item.id)}
                              aria-label="Remove from history"
                            />
                          }
                        >
                          <Trash2 className="size-4" />
                        </TooltipTrigger>
                        <TooltipContent>Remove from history</TooltipContent>
                      </Tooltip>
                    </div>
                  </li>
                ))}
              </ul>
            </ScrollArea>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}

export default HistoryPanel
