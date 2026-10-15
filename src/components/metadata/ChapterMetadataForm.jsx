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

function ChapterMetadataForm({
  chapterMetadata,
  onChapterMetadataChange,
  thumbnailUrl,
  onThumbnailChange,
  onError,
}) {
  const handleFieldChange = useCallback(
    (field, value) => {
      onChapterMetadataChange((prev) => ({
        ...prev,
        albumMetadata: {
          ...prev.albumMetadata,
          [field]: value,
        },
      }))
    },
    [onChapterMetadataChange]
  )

  const handleTemplateChange = useCallback(
    (value) => {
      onChapterMetadataChange((prev) => ({
        ...prev,
        chapterTitleTemplate: value,
      }))
    },
    [onChapterMetadataChange]
  )

  return (
    <div className="space-y-3">
      <Alert>
        <AlertDescription>
          Album metadata will be applied to all chapters. Track numbers will auto-increment based on
          selected chapters.
        </AlertDescription>
      </Alert>
      <CatalogLinkSection
        variant="albumShared"
        onMetadataLoaded={(m) => {
          onChapterMetadataChange((prev) => ({
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
        value={chapterMetadata.albumMetadata.artist}
        onChange={(e) => handleFieldChange('artist', e.target.value)}
      />
      <FormField
        label="Album"
        value={chapterMetadata.albumMetadata.album}
        onChange={(e) => handleFieldChange('album', e.target.value)}
      />
      <FormField
        label="Album Artist"
        value={chapterMetadata.albumMetadata.albumArtist}
        onChange={(e) => handleFieldChange('albumArtist', e.target.value)}
      />
      <div className="mt-2 flex gap-4">
        <div className="w-full space-y-1.5">
          <Label>Genre</Label>
          <Select
            value={chapterMetadata.albumMetadata.genre || '__none__'}
            onValueChange={(v) => handleFieldChange('genre', v === '__none__' ? '' : v)}
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
          value={chapterMetadata.albumMetadata.year}
          onChange={(e) => handleFieldChange('year', e.target.value)}
        />
      </div>
      <FormField
        label="Composer"
        value={chapterMetadata.albumMetadata.composer}
        onChange={(e) => handleFieldChange('composer', e.target.value)}
      />
      <FormField
        label="Comment"
        value={chapterMetadata.albumMetadata.comment}
        onChange={(e) => handleFieldChange('comment', e.target.value)}
        multiline
        rows={2}
      />
      <Separator className="my-4" />
      <h3 className="text-base font-semibold">Chapter Titles</h3>
      <div className="space-y-1.5">
        <Label>Title Template</Label>
        <Select
          value={chapterMetadata.chapterTitleTemplate}
          onValueChange={handleTemplateChange}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="{chapterTitle}">Use Original Chapter Title</SelectItem>
            <SelectItem value="{album} - {chapterTitle}">Album - Chapter Title</SelectItem>
            <SelectItem value="Track {trackNumber}: {chapterTitle}">
              Track N: Chapter Title
            </SelectItem>
          </SelectContent>
        </Select>
      </div>
      <ThumbnailSection
        thumbnailUrl={thumbnailUrl}
        onThumbnailChange={onThumbnailChange}
        onError={onError}
        />
    </div>
  )
}

export default ChapterMetadataForm
