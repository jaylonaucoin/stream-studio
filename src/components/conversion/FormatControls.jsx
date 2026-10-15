import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { AUDIO_FORMATS, VIDEO_FORMATS, QUALITY_OPTIONS } from '../../constants'

/**
 * Mode, Format, and Quality selection controls.
 */
function FormatControls({
  mode,
  format,
  quality,
  onModeChange,
  onFormatChange,
  onQualityChange,
  disabled,
  isConverting,
  videoModeDisabled = false,
}) {
  const isDisabled = isConverting || disabled

  return (
    <div className="mb-4 flex flex-col items-stretch gap-4 sm:flex-row sm:items-end">
      <div className="flex-1">
        <Label className="mb-1.5 block text-muted-foreground">Mode</Label>
        <ToggleGroup
          value={[mode]}
          onValueChange={(vals) => {
            const newMode = vals[0]
            if (newMode && !(newMode === 'video' && videoModeDisabled)) {
              onModeChange(newMode)
            }
          }}
          disabled={isDisabled}
          className="h-10 w-full"
          aria-label="Conversion mode selection"
        >
          <ToggleGroupItem value="audio" aria-label="Audio mode" className="flex-1">
            Audio
          </ToggleGroupItem>
          <ToggleGroupItem
            value="video"
            aria-label="Video mode"
            disabled={videoModeDisabled}
            className="flex-1"
          >
            Video
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      <div className="flex-1 space-y-1.5">
        <Label htmlFor="format-select">Format</Label>
        <Select value={format} onValueChange={onFormatChange} disabled={isDisabled}>
          <SelectTrigger id="format-select" className="w-full" aria-label="Output format selection">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(mode === 'audio' ? AUDIO_FORMATS : VIDEO_FORMATS).map((fmt) => (
              <SelectItem key={fmt.value} value={fmt.value}>
                {fmt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex-1 space-y-1.5">
        <Label htmlFor="quality-select">Quality</Label>
        <Select value={quality} onValueChange={onQualityChange} disabled={isDisabled}>
          <SelectTrigger id="quality-select" className="w-full" aria-label="Quality selection">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {QUALITY_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}

export default FormatControls
