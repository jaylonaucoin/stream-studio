import { useCallback } from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { FormField } from '@/components/ui/form-field'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { GENRES } from '../../constants'
import ThumbnailSection from './ThumbnailSection'
import CatalogLinkSection from './CatalogLinkSection'

function SegmentMetadataForm({
  segmentMetadata,
  onSegmentMetadataChange,
  useSharedArtistForSegments,
  thumbnailUrl,
  onThumbnailChange,
  onError,
}) {
  const handleAlbumFieldChange = useCallback(
    (field, value) => {
      onSegmentMetadataChange((prev) => ({
        ...prev,
        albumMetadata: {
          ...prev.albumMetadata,
          [field]: value,
        },
      }))
    },
    [onSegmentMetadataChange]
  )

  const handlePerTrackChange = useCallback(
    (index, field, value) => {
      onSegmentMetadataChange((prev) => {
        const updated = [...prev.perSegmentMetadata]
        updated[index] = { ...updated[index], [field]: value }
        return {
          ...prev,
          perSegmentMetadata: updated,
        }
      })
    },
    [onSegmentMetadataChange]
  )

  return (
    <div className="space-y-3">
      <Alert>
        <AlertDescription>
          Album metadata will be applied to all segments. Each segment will be downloaded as a
          separate track with its own title.
        </AlertDescription>
      </Alert>
      <CatalogLinkSection
        variant="albumShared"
        onMetadataLoaded={(m) => {
          onSegmentMetadataChange((prev) => ({
            ...prev,
            albumMetadata: { ...prev.albumMetadata, ...m },
          }))
        }}
        onCoverLoaded={(dataUrl) => {
          if (dataUrl) onThumbnailChange(dataUrl)
        }}
        onError={onError}
      />
      <h3 className="text-base font-semibold">Album Metadata</h3>
      <FormField
        label="Artist"
        value={segmentMetadata.albumMetadata.artist}
        onChange={(e) => handleAlbumFieldChange('artist', e.target.value)}
        helperText={
          useSharedArtistForSegments
            ? 'This artist will be applied to all segments'
            : 'Default artist (can be overridden per segment)'
        }
      />
      <FormField
        label="Album"
        value={segmentMetadata.albumMetadata.album}
        onChange={(e) => handleAlbumFieldChange('album', e.target.value)}
      />
      <FormField
        label="Album Artist"
        value={segmentMetadata.albumMetadata.albumArtist}
        onChange={(e) => handleAlbumFieldChange('albumArtist', e.target.value)}
      />
      <div className="mt-2 flex gap-4">
        <div className="w-full space-y-1.5">
          <Label>Genre</Label>
          <Select
            value={segmentMetadata.albumMetadata.genre || '__none__'}
            onValueChange={(v) => handleAlbumFieldChange('genre', v === '__none__' ? '' : v)}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="None" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">None</SelectItem>
              {GENRES.map((genre) => (
                <SelectItem key={genre} value={genre}>
                  {genre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <FormField
          className="w-full"
          label="Year"
          type="number"
          value={segmentMetadata.albumMetadata.year}
          onChange={(e) => handleAlbumFieldChange('year', e.target.value)}
        />
      </div>
      <FormField
        label="Composer"
        value={segmentMetadata.albumMetadata.composer}
        onChange={(e) => handleAlbumFieldChange('composer', e.target.value)}
      />
      <FormField
        label="Comment"
        value={segmentMetadata.albumMetadata.comment}
        onChange={(e) => handleAlbumFieldChange('comment', e.target.value)}
        multiline
        rows={2}
      />

      <Separator className="my-4" />

      <h3 className="text-base font-semibold">
        Segment Titles ({segmentMetadata.perSegmentMetadata.length} segments)
      </h3>
      <p className="mb-4 text-sm text-muted-foreground">
        Review and edit the title{!useSharedArtistForSegments && ' and artist'} for each segment.
      </p>

      <ul className="rounded-lg bg-muted/40">
        {segmentMetadata.perSegmentMetadata.map((seg, index) => (
          <li key={index} className="border-b border-border px-3 py-3 last:border-b-0">
            <p className="mb-2 text-xs text-muted-foreground">Track {index + 1}</p>
            <div className="flex items-start gap-4">
              <FormField
                className="w-full"
                label="Title"
                value={seg.title}
                onChange={(e) => handlePerTrackChange(index, 'title', e.target.value)}
              />
              {!useSharedArtistForSegments ? (
                <FormField
                  className="min-w-50"
                  label="Artist"
                  value={seg.artist}
                  onChange={(e) => handlePerTrackChange(index, 'artist', e.target.value)}
                />
              ) : null}
            </div>
          </li>
        ))}
      </ul>

      <ThumbnailSection
        thumbnailUrl={thumbnailUrl}
        onThumbnailChange={onThumbnailChange}
        onError={onError}
      />
    </div>
  )
}

export default SegmentMetadataForm
