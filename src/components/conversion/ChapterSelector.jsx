import { useCallback, useState } from 'react'
import { Play, Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { ScrollArea } from '@/components/ui/scroll-area'

function ChapterSelector({
  chapterInfo,
  selectedChapters,
  onChapterToggle,
  onSelectAll,
  onDeselectAll,
  chapterDownloadMode,
  onChapterDownloadModeChange,
  editedChapterTitles,
  onChapterTitleChange,
  onEditMetadata,
  disabled,
  isConverting,
}) {
  const [editingChapterIndex, setEditingChapterIndex] = useState(null)
  const [editingChapterValue, setEditingChapterValue] = useState('')

  const handleChapterTitleEdit = useCallback(
    (chapterIndex) => {
      const chapter = chapterInfo?.chapters?.[chapterIndex]
      if (!chapter) return

      const currentTitle = editedChapterTitles[chapterIndex] ?? chapter.title
      setEditingChapterIndex(chapterIndex)
      setEditingChapterValue(currentTitle)
    },
    [chapterInfo, editedChapterTitles]
  )

  const handleChapterTitleSave = useCallback(
    (chapterIndex) => {
      if (editingChapterValue.trim()) {
        onChapterTitleChange(chapterIndex, editingChapterValue.trim())
      } else {
        onChapterTitleChange(chapterIndex, null)
      }
      setEditingChapterIndex(null)
      setEditingChapterValue('')
    },
    [editingChapterValue, onChapterTitleChange]
  )

  const handleChapterTitleCancel = useCallback(() => {
    setEditingChapterIndex(null)
    setEditingChapterValue('')
  }, [])

  const handleChapterTitleKeyDown = useCallback(
    (e, chapterIndex) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        handleChapterTitleSave(chapterIndex)
      } else if (e.key === 'Escape') {
        e.preventDefault()
        handleChapterTitleCancel()
      }
    },
    [handleChapterTitleSave, handleChapterTitleCancel]
  )

  return (
    <div className="mb-4 rounded-xl border-2 border-primary bg-card p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex flex-1 items-center gap-2">
          <Play className="size-5 text-primary" aria-hidden />
          <h3 className="text-base font-semibold">Chapters</h3>
          <Badge>
            {selectedChapters.length} of {chapterInfo.totalChapters} selected
          </Badge>
        </div>
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant="ghost"
            onClick={onSelectAll}
            disabled={
              isConverting || disabled || selectedChapters.length === chapterInfo.totalChapters
            }
          >
            Select All
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={onDeselectAll}
            disabled={isConverting || disabled || selectedChapters.length === 0}
          >
            Deselect All
          </Button>
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  size="icon-sm"
                  variant="ghost"
                  onClick={onEditMetadata}
                  disabled={isConverting || disabled}
                />
              }
            >
              <Pencil className="size-4" />
            </TooltipTrigger>
            <TooltipContent>Edit Metadata</TooltipContent>
          </Tooltip>
        </div>
      </div>
      <Separator className="my-3" />
      <div className="mb-3">
        <p className="mb-2 text-sm text-muted-foreground">Download mode:</p>
        <ToggleGroup
          value={[chapterDownloadMode]}
          onValueChange={(vals) => {
            if (vals[0]) onChapterDownloadModeChange(vals[0])
          }}
          disabled={isConverting || disabled || selectedChapters.length === 0}
          className="h-10 w-full"
          aria-label="Chapter download mode"
        >
          <ToggleGroupItem value="full" aria-label="Full video mode" className="flex-1">
            Full Video
          </ToggleGroupItem>
          <ToggleGroupItem value="split" aria-label="Selected chapters mode" className="flex-1">
            Selected Chapters
          </ToggleGroupItem>
        </ToggleGroup>
        {selectedChapters.length > 0 && chapterDownloadMode === 'full' ? (
          <p className="mt-1 text-xs text-muted-foreground">
            The entire video will be downloaded as one file, ignoring chapter selection.
          </p>
        ) : null}
        {selectedChapters.length > 0 && chapterDownloadMode === 'split' ? (
          <p className="mt-1 text-xs text-muted-foreground">
            Selected chapters will be downloaded as separate files.
          </p>
        ) : null}
      </div>
      <ScrollArea className="h-75 rounded-md border border-border">
        <ul>
          {chapterInfo.chapters.map((chapter, index) => (
            <li
              key={index}
              className={
                index < chapterInfo.chapters.length - 1 ? 'border-b border-border' : ''
              }
            >
              <div
                role="button"
                tabIndex={0}
                className="flex w-full cursor-pointer items-center gap-2 px-2 py-2 text-left hover:bg-muted disabled:opacity-50"
                onClick={() => !(isConverting || disabled) && onChapterToggle(index)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    if (!(isConverting || disabled)) onChapterToggle(index)
                  }
                }}
                aria-disabled={isConverting || disabled}
              >
                <Checkbox
                  checked={selectedChapters.includes(index)}
                  tabIndex={-1}
                  className="pointer-events-none"
                  aria-hidden
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    {editingChapterIndex === index ? (
                      <div
                        className="flex-1"
                        onClick={(e) => e.stopPropagation()}
                        onMouseDown={(e) => e.stopPropagation()}
                        onKeyDown={(e) => e.stopPropagation()}
                      >
                        <Input
                          value={editingChapterValue}
                          onChange={(e) => setEditingChapterValue(e.target.value)}
                          onBlur={() => handleChapterTitleSave(index)}
                          onKeyDown={(e) => handleChapterTitleKeyDown(e, index)}
                          autoFocus
                          className="h-8 text-sm"
                        />
                      </div>
                    ) : (
                      <>
                        <span className="flex-1 text-sm font-medium">
                          {editedChapterTitles[index] ?? chapter.title}
                        </span>
                        <Tooltip>
                          <TooltipTrigger
                            render={
                              <Button
                                size="icon-sm"
                                variant="ghost"
                                disabled={isConverting || disabled}
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleChapterTitleEdit(index)
                                }}
                              />
                            }
                          >
                            <Pencil className="size-3.5" />
                          </TooltipTrigger>
                          <TooltipContent>Edit chapter title</TooltipContent>
                        </Tooltip>
                      </>
                    )}
                  </div>
                  <div className="mt-1 flex items-center gap-2">
                    <Badge variant="outline" className="h-5 text-[0.7rem]">
                      {chapter.timeRange}
                    </Badge>
                    <Badge variant="outline" className="h-5 text-[0.7rem]">
                      {chapter.durationFormatted}
                    </Badge>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </ScrollArea>
      {selectedChapters.length === 0 ? (
        <Alert className="mt-3">
          <AlertDescription>
            No chapters selected. The full video will be downloaded.
          </AlertDescription>
        </Alert>
      ) : null}
    </div>
  )
}

export default ChapterSelector
