import { Play } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ScrollArea } from '@/components/ui/scroll-area'
import ThumbnailWithFallback from '../ThumbnailWithFallback'

function PlaylistVideoSelector({
  videos,
  selectedVideos,
  onVideoToggle,
  onSelectAll,
  onDeselectAll,
  disabled,
  isConverting,
  isAudioOnly = false,
}) {
  const itemLabel = isAudioOnly ? 'tracks' : 'videos'
  return (
    <div className="mb-4 rounded-xl border-2 border-primary bg-card p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Play className="size-5 text-primary" aria-hidden />
          <h3 className="text-base font-semibold">
            Select {itemLabel.charAt(0).toUpperCase() + itemLabel.slice(1)}
          </h3>
          <Badge>
            {selectedVideos.length} of {videos.length} selected
          </Badge>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={onSelectAll}
            disabled={isConverting || disabled || selectedVideos.length === videos.length}
          >
            Select All
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={onDeselectAll}
            disabled={isConverting || disabled || selectedVideos.length === 0}
          >
            Deselect All
          </Button>
        </div>
      </div>
      <Separator className="my-3" />
      <ScrollArea className="h-75 rounded-md border border-border">
        <ul>
          {videos.map((video, index) => (
            <li
              key={video.index}
              className={index < videos.length - 1 ? 'border-b border-border' : ''}
            >
              <button
                type="button"
                className="flex w-full items-center gap-3 px-2 py-2 text-left hover:bg-muted disabled:opacity-50"
                onClick={() => onVideoToggle(video.index)}
                disabled={isConverting || disabled}
              >
                <Checkbox
                  checked={selectedVideos.includes(video.index)}
                  tabIndex={-1}
                  aria-hidden
                  className="pointer-events-none"
                />
                <ThumbnailWithFallback
                  thumbnail={video.thumbnail}
                  alt={video.title}
                  isPlaylist={false}
                  width={80}
                  height={45}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{video.title}</p>
                  <div className="mt-1 flex items-center gap-2">
                    <Badge variant="outline" className="h-5 text-[0.7rem]">
                      #{video.index}
                    </Badge>
                    {video.durationFormatted ? (
                      <Badge variant="outline" className="h-5 text-[0.7rem]">
                        {video.durationFormatted}
                      </Badge>
                    ) : null}
                  </div>
                </div>
              </button>
            </li>
          ))}
        </ul>
      </ScrollArea>
      {selectedVideos.length === 0 ? (
        <Alert className="mt-3">
          <AlertDescription>
            No {itemLabel} selected. Please select at least one {itemLabel.slice(0, -1)} to download.
          </AlertDescription>
        </Alert>
      ) : null}
    </div>
  )
}

export default PlaylistVideoSelector
