import { useState, useEffect, useCallback } from 'react'
import { Settings } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Slider } from '@/components/ui/slider'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Spinner } from '@/components/ui/spinner'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AUDIO_FORMAT_VALUES,
  VIDEO_FORMAT_VALUES,
  QUALITY_OPTIONS,
  SEARCH_SITES,
  DEFAULT_SEARCH_SITE,
  DEFAULT_SEARCH_LIMIT,
} from '../constants'
import { isIpcFailure } from '../utils/ipcResult'

const AUDIO_FORMATS = AUDIO_FORMAT_VALUES
const VIDEO_FORMATS = VIDEO_FORMAT_VALUES

function SettingsDialog({ open, onClose, onSettingsSaved }) {
  const [settings, setSettings] = useState({
    notificationsEnabled: true,
    maxHistoryItems: 50,
    defaultMode: 'audio',
    defaultAudioFormat: 'mp3',
    defaultVideoFormat: 'mp4',
    defaultQuality: 'best',
    theme: 'dark',
    defaultSearchSite: DEFAULT_SEARCH_SITE,
    defaultSearchLimit: DEFAULT_SEARCH_LIMIT,
    discogsToken: '',
  })
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [saveError, setSaveError] = useState(null)

  const loadSettings = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    if (window.api && window.api.getSettings) {
      try {
        const savedSettings = await window.api.getSettings()
        if (isIpcFailure(savedSettings)) {
          setLoadError(savedSettings.error || 'Failed to load settings')
        } else {
          setSettings((prev) => ({ ...prev, ...savedSettings }))
        }
      } catch (err) {
        console.error('Failed to load settings:', err)
        setLoadError(err.message || 'Failed to load settings')
      }
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    if (open) {
      setSaveError(null)
      loadSettings()
    }
  }, [open, loadSettings])

  const handleChange = (key, value) => {
    setSettings((prev) => ({ ...prev, [key]: value }))
  }

  const handleSave = async () => {
    setSaveError(null)
    if (window.api && window.api.saveSettings) {
      try {
        const res = await window.api.saveSettings(settings)
        if (isIpcFailure(res)) {
          setSaveError(res.error || 'Failed to save settings')
          return
        }
        onSettingsSaved?.(settings)
        onClose()
      } catch (err) {
        console.error('Failed to save settings:', err)
        setSaveError(err.message || 'Failed to save settings')
      }
    } else {
      onClose()
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg" showCloseButton>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="size-5" aria-hidden />
            Settings
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-10">
            <Spinner size="lg" aria-label="Loading settings" />
          </div>
        ) : (
          <div className="flex flex-col gap-6">
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
            {saveError ? (
              <Alert variant="destructive">
                <AlertDescription className="flex items-center justify-between gap-2">
                  <span>{saveError}</span>
                  <Button size="sm" variant="ghost" onClick={() => setSaveError(null)}>
                    Dismiss
                  </Button>
                </AlertDescription>
              </Alert>
            ) : null}

            <div>
              <h3 className="mb-2 text-sm font-semibold text-muted-foreground">Appearance</h3>
              <div className="mt-2 space-y-1.5">
                <Label htmlFor="theme-select">Theme</Label>
                <Select
                  value={settings.theme || 'dark'}
                  onValueChange={async (newTheme) => {
                    const prevTheme = settings.theme
                    setSaveError(null)
                    handleChange('theme', newTheme)
                    if (!window.api?.saveSettings) return
                    try {
                      const res = await window.api.saveSettings({ ...settings, theme: newTheme })
                      if (isIpcFailure(res)) {
                        setSaveError(res.error || 'Failed to save theme')
                        handleChange('theme', prevTheme)
                        return
                      }
                      onSettingsSaved?.({ ...settings, theme: newTheme })
                    } catch (err) {
                      setSaveError(err.message || 'Failed to save theme')
                      handleChange('theme', prevTheme)
                    }
                  }}
                >
                  <SelectTrigger id="theme-select" className="w-40" aria-label="Theme selection">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">Light</SelectItem>
                    <SelectItem value="dark">Dark</SelectItem>
                    <SelectItem value="system">System</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Separator />

            <div>
              <h3 className="mb-2 text-sm font-semibold text-muted-foreground">Notifications</h3>
              <div className="flex items-center gap-3">
                <Switch
                  checked={settings.notificationsEnabled}
                  onCheckedChange={(checked) => handleChange('notificationsEnabled', checked)}
                  aria-label="Enable notifications"
                />
                <Label>Show notification when conversion completes</Label>
              </div>
            </div>

            <Separator />

            <div>
              <h3 className="mb-1 text-sm font-semibold text-muted-foreground">
                Default Conversion Settings
              </h3>
              <p className="mb-3 text-sm text-muted-foreground">
                These settings will be used as defaults for new conversions
              </p>
              <div className="mt-2 flex flex-wrap gap-3">
                <div className="space-y-1.5">
                  <Label>Default Mode</Label>
                  <Select
                    value={settings.defaultMode}
                    onValueChange={(v) => handleChange('defaultMode', v)}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="audio">Audio</SelectItem>
                      <SelectItem value="video">Video</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Audio Format</Label>
                  <Select
                    value={settings.defaultAudioFormat}
                    onValueChange={(v) => handleChange('defaultAudioFormat', v)}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {AUDIO_FORMATS.map((fmt) => (
                        <SelectItem key={fmt} value={fmt}>
                          {fmt.toUpperCase()}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Video Format</Label>
                  <Select
                    value={settings.defaultVideoFormat}
                    onValueChange={(v) => handleChange('defaultVideoFormat', v)}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {VIDEO_FORMATS.map((fmt) => (
                        <SelectItem key={fmt} value={fmt}>
                          {fmt.toUpperCase()}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Quality</Label>
                  <Select
                    value={settings.defaultQuality}
                    onValueChange={(v) => handleChange('defaultQuality', v)}
                  >
                    <SelectTrigger className="w-32">
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
            </div>

            <Separator />

            <div>
              <h3 className="mb-1 text-sm font-semibold text-muted-foreground">Search Defaults</h3>
              <p className="mb-3 text-sm text-muted-foreground">
                Default site and result limit for the search tab
              </p>
              <div className="mt-2 flex flex-wrap gap-3">
                <div className="space-y-1.5">
                  <Label>Default Search Site</Label>
                  <Select
                    value={settings.defaultSearchSite || DEFAULT_SEARCH_SITE}
                    onValueChange={(v) => handleChange('defaultSearchSite', v)}
                  >
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SEARCH_SITES.map((site) => (
                        <SelectItem key={site.id} value={site.id}>
                          {site.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Results Limit</Label>
                  <Select
                    value={String(settings.defaultSearchLimit ?? DEFAULT_SEARCH_LIMIT)}
                    onValueChange={(v) => handleChange('defaultSearchLimit', Number(v))}
                  >
                    <SelectTrigger className="w-28">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[10, 15, 20, 25, 50].map((n) => (
                        <SelectItem key={n} value={String(n)}>
                          {n}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <Separator />

            <div>
              <h3 className="mb-1 text-sm font-semibold text-muted-foreground">Catalog metadata</h3>
              <p className="mb-2 text-sm text-muted-foreground">
                Optional personal access token for Discogs API when loading metadata from a Discogs
                release URL in the metadata editor. MusicBrainz does not require a token.
              </p>
              <div className="space-y-1.5">
                <Label htmlFor="discogs-token">Discogs personal token</Label>
                <Input
                  id="discogs-token"
                  type="password"
                  value={settings.discogsToken ?? ''}
                  onChange={(e) => handleChange('discogsToken', e.target.value)}
                  autoComplete="off"
                  placeholder="Paste token from Discogs developer settings"
                  aria-label="Discogs personal access token"
                />
                <p className="text-xs text-muted-foreground">
                  Create one at discogs.com → Settings → Developers
                </p>
              </div>
            </div>

            <Separator />

            <div>
              <h3 className="mb-2 text-sm font-semibold text-muted-foreground">History</h3>
              <p className="mb-2 text-sm">
                Maximum history items: <strong>{settings.maxHistoryItems}</strong>
              </p>
              <Slider
                value={[settings.maxHistoryItems]}
                onValueChange={(vals) => handleChange('maxHistoryItems', vals[0])}
                min={10}
                max={200}
                step={10}
                className="max-w-xs"
                aria-label="Maximum history items"
              />
              <div className="mt-1 flex max-w-xs justify-between text-xs text-muted-foreground">
                <span>10</span>
                <span>100</span>
                <span>200</span>
              </div>
            </div>

            <Separator />

            <div>
              <h3 className="mb-2 text-sm font-semibold text-muted-foreground">Keyboard Shortcuts</h3>
              <p className="mb-2 text-sm text-muted-foreground">
                Press <strong>Ctrl+K</strong> (or <strong>⌘K</strong> on Mac) to view all keyboard
                shortcuts.
              </p>
              <div className="flex flex-col gap-1 text-sm">
                <p>
                  <strong>Enter</strong> — Start conversion
                </p>
                <p>
                  <strong>Escape</strong> — Cancel conversion
                </p>
                <p>
                  <strong>Ctrl+V</strong> / <strong>⌘V</strong> — Paste URL from clipboard
                </p>
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save Settings</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default SettingsDialog
