import { Play, Clock, Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import ThumbnailWithFallback from '../ThumbnailWithFallback'
import { isAudioOnlyExtractor } from '../../constants'

function PlaylistPreviewCard({
  playlistInfo,
  playlistMode,
  onPlaylistModeChange,
  customMetadata,
  onEditMetadata,
  disabled,
  isConverting,
}) {
  const isAudioOnly = isAudioOnlyExtractor(playlistInfo?.extractor)
  const itemLabel = isAudioOnly ? 'tracks' : 'videos'
  return (
    <div className="mb-4 rounded-xl border-2 border-primary bg-card p-4 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row">
        <ThumbnailWithFallback
          thumbnail={playlistInfo.videos?.[0]?.thumbnail}
          alt={playlistInfo.playlistTitle}
          isPlaylist={true}
        />
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <Play className="size-5 shrink-0 text-primary" aria-hidden />
            <h3 className="min-w-0 flex-1 truncate text-base font-semibold">
              {playlistInfo.playlistTitle}
            </h3>
            <Badge className="shrink-0">Playlist</Badge>
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    onClick={onEditMetadata}
                    disabled={isConverting || disabled}
                    className="shrink-0"
                    aria-label="Edit Metadata"
                  />
                }
              >
                <Pencil className="size-4" />
              </TooltipTrigger>
              <TooltipContent>Edit Metadata</TooltipContent>
            </Tooltip>
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            <Badge variant="outline" className="border-primary">
              <Clock className="size-3.5" />
              {playlistInfo.playlistVideoCount} {itemLabel}
            </Badge>
            {playlistInfo.playlistTotalDurationFormatted ? (
              <Badge variant="outline" className="border-primary">
                <Clock className="size-3.5" />
                ~{playlistInfo.playlistTotalDurationFormatted}
              </Badge>
            ) : null}
            {customMetadata ? (
              <Badge variant="outline" className="border-primary text-primary">
                <Pencil className="size-3.5" />
                Custom Metadata
              </Badge>
            ) : null}
          </div>
        </div>
      </div>
      <Separator className="my-4" />
      <div>
        <p className="mb-2 text-sm">Download mode:</p>
        <ToggleGroup
          value={[playlistMode]}
          onValueChange={(vals) => {
            if (vals[0]) onPlaylistModeChange(vals[0])
          }}
          disabled={isConverting || disabled}
          className="h-10 w-full"
          aria-label="Playlist download mode"
        >
          <ToggleGroupItem value="full" aria-label="Full playlist mode" className="flex-1">
            Full Playlist ({playlistInfo.playlistVideoCount} {itemLabel})
          </ToggleGroupItem>
          <ToggleGroupItem
            value="selected"
            aria-label={`Selected ${itemLabel} mode`}
            className="flex-1"
          >
            Selected {itemLabel.charAt(0).toUpperCase() + itemLabel.slice(1)}
          </ToggleGroupItem>
        </ToggleGroup>
      </div>
    </div>
  )
}

export default PlaylistPreviewCard
