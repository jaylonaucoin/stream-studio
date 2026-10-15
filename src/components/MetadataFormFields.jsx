import { FormField } from '@/components/ui/form-field'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { GENRES } from '../constants'

export function MetadataFormFields({
  metadata,
  onChange,
  errors = {},
  showTrackNumbers = false,
  showTotalTracksOnly = false,
  totalTracksDisplay = null,
  hideTitle = false,
  hideArtist = false,
  renderSection = 'full',
}) {
  const albumCore = renderSection === 'full' || renderSection === 'albumCore'
  const advanced = renderSection === 'full' || renderSection === 'advanced'

  return (
    <div className="space-y-3">
      {!hideTitle && albumCore ? (
        <FormField
          label="Title"
          value={metadata.title || ''}
          onChange={(e) => onChange('title', e.target.value)}
          error={errors.title}
        />
      ) : null}
      {!hideArtist && albumCore ? (
        <FormField
          label="Artist"
          value={metadata.artist || ''}
          onChange={(e) => onChange('artist', e.target.value)}
          error={errors.artist}
        />
      ) : null}
      {albumCore ? (
        <>
          <FormField
            label="Album"
            value={metadata.album || ''}
            onChange={(e) => onChange('album', e.target.value)}
            error={errors.album}
          />
          <FormField
            label="Album Artist"
            value={metadata.albumArtist || ''}
            onChange={(e) => onChange('albumArtist', e.target.value)}
            error={errors.albumArtist}
          />
          <div className="mt-2 flex gap-4">
            <div className="w-full space-y-1.5">
              <Label>Genre</Label>
              <Select
                value={metadata.genre || ''}
                onValueChange={(v) => onChange('genre', v)}
              >
                <SelectTrigger className="w-full" aria-invalid={errors.genre ? true : undefined}>
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
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
              value={metadata.year || ''}
              onChange={(e) => onChange('year', e.target.value)}
              error={errors.year}
            />
          </div>
          {showTotalTracksOnly ? (
            <div className="mt-2">
              <FormField
                label="Total Tracks (album)"
                type="number"
                value={metadata.totalTracks || ''}
                onChange={(e) => onChange('totalTracks', e.target.value)}
              />
            </div>
          ) : null}
          {showTrackNumbers && !showTotalTracksOnly ? (
            <div className="mt-2 flex gap-4">
              <FormField
                className="w-full"
                label="Track Number"
                type="number"
                value={metadata.trackNumber || ''}
                onChange={(e) => onChange('trackNumber', e.target.value)}
                error={errors.trackNumber}
              />
              <FormField
                className="w-full"
                label="Total Tracks"
                type="number"
                value={metadata.totalTracks || ''}
                onChange={(e) => onChange('totalTracks', e.target.value)}
              />
            </div>
          ) : null}
          {totalTracksDisplay !== null ? (
            <p className="mt-2 mb-1 text-sm text-muted-foreground">
              Track numbers will auto-increment. Total tracks: {totalTracksDisplay} (automatic)
            </p>
          ) : null}
        </>
      ) : null}
      {advanced ? (
        <>
          <FormField
            label="Composer"
            value={metadata.composer || ''}
            onChange={(e) => onChange('composer', e.target.value)}
            error={errors.composer}
          />
          <FormField
            label="Publisher"
            value={metadata.publisher || ''}
            onChange={(e) => onChange('publisher', e.target.value)}
            error={errors.publisher}
          />
          <FormField
            label="Comment"
            value={metadata.comment || ''}
            onChange={(e) => onChange('comment', e.target.value)}
            error={errors.comment}
            multiline
            rows={2}
          />
          <FormField
            label="Description"
            value={metadata.description || ''}
            onChange={(e) => onChange('description', e.target.value)}
            error={errors.description}
            multiline
            rows={3}
          />
          <div className="mt-2 flex gap-4">
            <FormField
              className="w-full"
              label="Language"
              value={metadata.language || ''}
              onChange={(e) => onChange('language', e.target.value)}
              error={errors.language}
            />
            <FormField
              className="w-full"
              label="BPM"
              type="number"
              value={metadata.bpm || ''}
              onChange={(e) => onChange('bpm', e.target.value)}
              error={errors.bpm}
            />
          </div>
          <FormField
            label="Copyright"
            value={metadata.copyright || ''}
            onChange={(e) => onChange('copyright', e.target.value)}
            error={errors.copyright}
          />
        </>
      ) : null}
    </div>
  )
}
