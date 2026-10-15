import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { FormField } from '@/components/ui/form-field'
import { cn } from '@/lib/utils'

/**
 * Expandable list item for individual playlist video metadata.
 */
function PlaylistVideoItem({
  video,
  index,
  fileMeta,
  onMetadataChange,
  totalTracks,
  useSharedArtist,
}) {
  const [expanded, setExpanded] = useState(false)

  return (
    <li className="list-none">
      <div className="w-full">
        <button
          type="button"
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left hover:bg-muted"
          onClick={() => setExpanded(!expanded)}
        >
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{video.title}</p>
            <p className="text-xs text-muted-foreground">
              Track {fileMeta.trackNumber || index + 1} of {totalTracks}
            </p>
          </div>
          {expanded ? <ChevronUp className="size-4 shrink-0" /> : <ChevronDown className="size-4 shrink-0" />}
        </button>
        <div
          className={cn(
            'overflow-hidden transition-all',
            expanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
          )}
        >
          <div className="space-y-3 bg-muted/40 p-4">
            <FormField
              label="Title"
              value={fileMeta.title || ''}
              onChange={(e) => onMetadataChange(index, 'title', e.target.value)}
            />
            {!useSharedArtist ? (
              <FormField
                label="Artist"
                value={fileMeta.artist || ''}
                onChange={(e) => onMetadataChange(index, 'artist', e.target.value)}
                helperText="Artist for this song (can be different for each song)"
              />
            ) : null}
            <FormField
              label="Track Number"
              type="number"
              value={fileMeta.trackNumber || ''}
              onChange={(e) => onMetadataChange(index, 'trackNumber', e.target.value)}
              helperText={`Total tracks: ${totalTracks} (automatic)`}
            />
          </div>
        </div>
      </div>
    </li>
  )
}

export default PlaylistVideoItem
