import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { ListMusic, History, Settings } from 'lucide-react'
import { toast } from 'sonner'
import { ThemeProvider } from '@/components/theme-provider'
import { TooltipProvider } from '@/components/ui/tooltip'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Toaster } from '@/components/ui/sonner'
import { cn } from '@/lib/utils'
import { resolveTheme } from '@/styles/theme'
import ConversionForm from './components/ConversionForm'
import ProgressIndicator from './components/ProgressIndicator'
import LogViewer from './components/LogViewer'
import ErrorDialog from './components/ErrorDialog'
import OutputFolderSelector from './components/OutputFolderSelector'
import SettingsDialog from './components/SettingsDialog'
import HistoryPanel from './components/HistoryPanel'
import QueuePanel from './components/QueuePanel'
import KeyboardShortcutsDialog from './components/KeyboardShortcutsDialog'
import { loadQueueFromStorage, saveQueueToStorage } from './lib/queueStorage'
import { isIpcFailure, historyItemsFromResponse } from './utils/ipcResult'
import logo from '../assets/icon.png'

function App() {
  const [conversionState, setConversionState] = useState('idle')
  const [progress, setProgress] = useState(0)
  const [statusMessage, setStatusMessage] = useState('')
  const [progressSpeed, setProgressSpeed] = useState(null)
  const [progressEta, setProgressEta] = useState(null)
  const [progressSize, setProgressSize] = useState(null)
  const [logs, setLogs] = useState([])
  const [logsVisible, setLogsVisible] = useState(false)
  const [error, setError] = useState(null)
  const [outputFolder, setOutputFolder] = useState('')
  const [lastConvertedFile, setLastConvertedFile] = useState(null)
  const [playlistInfo, setPlaylistInfo] = useState(null)
  const [ffmpegAvailable, setFfmpegAvailable] = useState(true)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [queueOpen, setQueueOpen] = useState(false)
  const [conversionInputMode, setConversionInputMode] = useState('search')
  const [historyCount, setHistoryCount] = useState(0)
  const [appVersion, setAppVersion] = useState('')
  const [shortcutsOpen, setShortcutsOpen] = useState(false)
  const [defaultSettings, setDefaultSettings] = useState({
    defaultMode: 'audio',
    defaultAudioFormat: 'mp3',
    defaultVideoFormat: 'mp4',
    defaultQuality: 'best',
    defaultSearchSite: 'youtube',
    defaultSearchLimit: 15,
  })
  const addToQueueRef = useRef(null)
  const queueBootstrap = useMemo(() => loadQueueFromStorage(), [])
  const [queue, setQueue] = useState(queueBootstrap.items)
  const [themeMode, setThemeMode] = useState('dark')
  const [systemPrefersDark, setSystemPrefersDark] = useState(
    () =>
      (typeof window !== 'undefined' &&
        window.matchMedia?.('(prefers-color-scheme: dark)')?.matches) ??
      true
  )

  const resolvedTheme = resolveTheme(themeMode, systemPrefersDark)

  useEffect(() => {
    if (queueBootstrap.loadError) {
      console.warn('Queue storage:', queueBootstrap.loadError)
      toast.warning(queueBootstrap.loadError)
    }
  }, [queueBootstrap.loadError])

  useEffect(() => {
    const { success, error: saveError } = saveQueueToStorage(queue)
    if (!success && saveError) {
      console.warn('Queue storage:', saveError)
      toast.warning(saveError)
    }
  }, [queue])

  useEffect(() => {
    if (themeMode !== 'system') return undefined
    const mq = window.matchMedia?.('(prefers-color-scheme: dark)')
    if (!mq) return undefined
    const handler = (e) => setSystemPrefersDark(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [themeMode])

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        setShortcutsOpen(true)
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'h') {
        e.preventDefault()
        setHistoryOpen(true)
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'b' && !e.shiftKey) {
        e.preventDefault()
        setQueueOpen(true)
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'b' && e.shiftKey) {
        e.preventDefault()
        setConversionInputMode('batch-local')
      }
      if ((e.ctrlKey || e.metaKey) && e.key === ',') {
        e.preventDefault()
        setSettingsOpen(true)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  useEffect(() => {
    const loadOutputFolder = async () => {
      if (window.api && window.api.getOutputFolder) {
        try {
          const folder = await window.api.getOutputFolder()
          setOutputFolder(folder)
        } catch (err) {
          console.error('Failed to load output folder:', err)
          setOutputFolder('Downloads')
        }
      }
    }

    const checkFfmpeg = async () => {
      if (window.api && window.api.checkFfmpeg) {
        try {
          const result = await window.api.checkFfmpeg()
          setFfmpegAvailable(!!result?.available)
        } catch (err) {
          console.error('Failed to check FFmpeg:', err)
          setFfmpegAvailable(false)
        }
      }
    }

    const loadSettings = async () => {
      if (window.api && window.api.getSettings) {
        try {
          const settings = await window.api.getSettings()
          if (isIpcFailure(settings)) {
            console.error('Failed to load settings:', settings.error)
            return
          }
          setDefaultSettings({
            defaultMode: settings.defaultMode || 'audio',
            defaultAudioFormat: settings.defaultAudioFormat || 'mp3',
            defaultVideoFormat: settings.defaultVideoFormat || 'mp4',
            defaultQuality: settings.defaultQuality || 'best',
            defaultSearchSite: settings.defaultSearchSite || 'youtube',
            defaultSearchLimit: settings.defaultSearchLimit ?? 15,
          })
          setThemeMode(settings.theme || 'dark')
        } catch (err) {
          console.error('Failed to load settings:', err)
        }
      }
    }

    const loadHistoryCount = async () => {
      if (window.api && window.api.getHistory) {
        try {
          const res = await window.api.getHistory()
          const items = historyItemsFromResponse(res)
          setHistoryCount(items.length)
        } catch (err) {
          console.error('Failed to load history:', err)
        }
      }
    }

    const loadVersion = async () => {
      if (window.api && window.api.getAppVersion) {
        try {
          const version = await window.api.getAppVersion()
          setAppVersion(version)
        } catch (err) {
          console.error('Failed to load version:', err)
        }
      }
    }

    loadOutputFolder()
    checkFfmpeg()
    loadSettings()
    loadHistoryCount()
    loadVersion()
  }, [])

  const handleProgress = useCallback((data) => {
    if (!data) return

    switch (data.type) {
      case 'progress':
      case 'playlist-progress':
      case 'chapter-progress':
      case 'segment-progress':
        if (data.percent !== undefined) {
          setProgress(data.percent)

          if (data.type === 'playlist-progress' && data.playlistInfo) {
            setPlaylistInfo(data.playlistInfo)
            const { current, total, currentTitle } = data.playlistInfo
            let message = `Downloading playlist: Video ${current} of ${total}`
            if (currentTitle) {
              message += ` - ${currentTitle}`
            }
            message += ` (${data.percent.toFixed(1)}%)`
            if (data.speed) {
              message += ` @ ${data.speed}`
            }
            if (data.eta) {
              message += ` (ETA: ${data.eta})`
            }
            setStatusMessage(message)
          } else if (data.type === 'chapter-progress') {
            let message = `Downloading chapters... ${data.percent.toFixed(1)}%`
            if (data.speed) {
              message += ` @ ${data.speed}`
            }
            if (data.eta) {
              message += ` (ETA: ${data.eta})`
            }
            setStatusMessage(message)
            setPlaylistInfo(null)
          } else if (data.type === 'segment-progress') {
            const message =
              data.message || `Splitting segments... ${data.percent.toFixed(1)}%`
            setStatusMessage(message)
            setPlaylistInfo(null)
          } else {
            let message = `Converting... ${data.percent.toFixed(1)}%`
            if (data.speed) {
              message += ` @ ${data.speed}`
            }
            if (data.eta) {
              message += ` (ETA: ${data.eta})`
            }
            setStatusMessage(message)
            setPlaylistInfo(null)
          }

          setProgressSpeed(data.speed || null)
          setProgressEta(data.eta || null)
          setProgressSize(data.size || null)
        }
        if (data.message) {
          setLogs((prev) => [
            ...prev,
            { type: 'progress', message: data.message, timestamp: Date.now() },
          ])
        }
        break

      case 'status':
      case 'info':
        if (data.message) {
          setLogs((prev) => [
            ...prev,
            { type: 'info', message: data.message, timestamp: Date.now() },
          ])
        }
        break

      case 'cancelled':
        setStatusMessage('Cancelled')
        setConversionState('idle')
        setProgress(0)
        setProgressSpeed(null)
        setProgressEta(null)
        setProgressSize(null)
        setPlaylistInfo(null)
        if (data.message) {
          setLogs((prev) => [
            ...prev,
            { type: 'error', message: data.message, timestamp: Date.now() },
          ])
        }
        break
    }
  }, [])

  useEffect(() => {
    if (window.api && window.api.onProgress) {
      window.api.onProgress(handleProgress)
    }

    return () => {
      if (window.api && window.api.offProgress) {
        window.api.offProgress(handleProgress)
      }
    }
  }, [handleProgress])

  const handleConvert = useCallback(
    async (url, options = {}) => {
      const isLocal = options.source === 'local'
      if (conversionState === 'converting') return
      if (!isLocal && !url) return
      if (isLocal && !options.filePath) return

      setConversionState('converting')
      setProgress(0)
      const isPlaylist = options.playlistMode === 'full' || options.playlistMode === 'selected'
      const chapterDownloadMode = options.chapterDownloadMode || 'split'
      const isChapters =
        chapterDownloadMode === 'split' && options.chapters && options.chapters.length > 0
      const isFullVideoWithChapters =
        chapterDownloadMode === 'full' && options.chapterDownloadMode !== undefined
      const isManualSegments = options.manualSegments && options.manualSegments.length > 0
      setStatusMessage(
        options.source === 'local'
          ? 'Converting local file...'
          : isPlaylist
            ? 'Starting playlist download...'
            : isManualSegments
              ? 'Starting segmented download...'
              : isChapters
                ? 'Starting chapter download...'
                : isFullVideoWithChapters
                  ? 'Downloading full video...'
                  : 'Starting conversion...'
      )
      setProgressSpeed(null)
      setProgressEta(null)
      setProgressSize(null)
      setLogs([])
      setError(null)
      setLastConvertedFile(null)
      setPlaylistInfo(null)

      try {
        const convertOptions = {
          outputFolder,
          mode: options.mode || 'audio',
          format: options.format || 'mp3',
          quality: options.quality || 'best',
          playlistMode: options.playlistMode || 'single',
          selectedVideos: options.selectedVideos || null,
          chapters: options.chapters || null,
          chapterDownloadMode: options.chapterDownloadMode || null,
          chapterInfo: options.chapterInfo || null,
          manualSegments: options.manualSegments || null,
          useSharedArtistForSegments: options.useSharedArtistForSegments !== false,
          customMetadata: options.customMetadata || null,
          startTime: options.startTime || null,
          endTime: options.endTime || null,
        }

        const result =
          options.source === 'local'
            ? await window.api.convertLocalFile(options.filePath, convertOptions)
            : await window.api.convert(url, convertOptions)

        if (result.success) {
          setProgress(100)
          if (result.isPlaylist) {
            setStatusMessage(`Playlist download complete! ${result.fileCount} videos downloaded.`)
          } else if (result.isSegments) {
            setStatusMessage(
              `Segment download complete! ${result.fileCount} segment${result.fileCount > 1 ? 's' : ''} created.`
            )
          } else if (result.isChapters) {
            setStatusMessage(
              `Chapter download complete! ${result.fileCount} chapter${result.fileCount > 1 ? 's' : ''} downloaded.`
            )
          } else {
            setStatusMessage('Conversion complete!')
          }
          setConversionState('completed')
          setLastConvertedFile(result)
          setLogs((prev) => [
            ...prev,
            {
              type: 'success',
              message: result.isPlaylist
                ? `✓ Playlist download completed successfully (${result.fileCount} videos)`
                : result.isSegments
                  ? `✓ Segment download completed successfully (${result.fileCount} segment${result.fileCount > 1 ? 's' : ''})`
                  : result.isChapters
                    ? `✓ Chapter download completed successfully (${result.fileCount} chapter${result.fileCount > 1 ? 's' : ''})`
                    : '✓ Conversion completed successfully',
              timestamp: Date.now(),
            },
          ])
          setHistoryCount((prev) => prev + (result.fileCount || 1))
        }
      } catch (convertError) {
        if (convertError?.message === 'Conversion was cancelled') {
          setConversionState('idle')
          setProgress(0)
          setStatusMessage('Cancelled')
          return
        }
        setConversionState('error')
        const failIsPlaylist =
          options.playlistMode === 'full' || options.playlistMode === 'selected'
        const failChapterMode = options.chapterDownloadMode || 'split'
        const failIsChapters =
          failChapterMode === 'split' && options.chapters && options.chapters.length > 0
        const failIsManualSegments = options.manualSegments && options.manualSegments.length > 0
        setStatusMessage(
          failIsPlaylist
            ? 'Playlist download failed'
            : failIsManualSegments
              ? 'Segment download failed'
              : failIsChapters
                ? 'Chapter download failed'
                : 'Conversion failed'
        )
        setPlaylistInfo(null)
        setError({
          title: failIsPlaylist
            ? 'Playlist Download Failed'
            : failIsManualSegments
              ? 'Segment Download Failed'
              : failIsChapters
                ? 'Chapter Download Failed'
                : 'Conversion Failed',
          message: convertError.message || 'An error occurred during conversion',
        })
        setLogs((prev) => [
          ...prev,
          { type: 'error', message: `✗ Error: ${convertError.message}`, timestamp: Date.now() },
        ])
      }
    },
    [outputFolder, conversionState]
  )

  const handleCancel = useCallback(async () => {
    if (conversionState !== 'converting') return

    try {
      await window.api.cancel()
      setConversionState('idle')
      setProgress(0)
      setStatusMessage('Cancelled')
    } catch (cancelError) {
      console.error('Failed to cancel:', cancelError)
    }
  }, [conversionState])

  const handleOutputFolderChange = useCallback(async () => {
    if (window.api && window.api.chooseOutput) {
      try {
        const result = await window.api.chooseOutput()
        if (result.success && result.folder) {
          setOutputFolder(result.folder)
        }
      } catch (folderError) {
        setError({
          title: 'Folder Selection Error',
          message: folderError.message || 'Failed to select output folder',
        })
      }
    }
  }, [])

  const handleOpenFileLocation = useCallback(async (filePath) => {
    if (window.api && window.api.openFileLocation) {
      try {
        await window.api.openFileLocation(filePath)
      } catch (locationError) {
        setError({
          title: 'File Location Error',
          message: locationError.message || 'Failed to open file location',
        })
      }
    }
  }, [])

  const handleCloseError = useCallback(() => {
    setError(null)
  }, [])

  const registerAddToQueue = useCallback((fn) => {
    addToQueueRef.current = fn
  }, [])

  const handleAddToQueue = useCallback((urlOrItem) => {
    addToQueueRef.current?.(urlOrItem)
  }, [])

  return (
    <ThemeProvider themeMode={themeMode}>
      <TooltipProvider>
        <div className="flex min-h-screen flex-col bg-background text-foreground">
          <header className="sticky top-0 z-40 border-b border-border bg-appbar">
            <div className="flex h-14 items-center gap-2 px-4">
              <img src={logo} alt="Stream Studio" className="mr-2 size-8" />
              <h1 className="flex-1 text-lg font-semibold tracking-tight">Stream Studio</h1>
              {appVersion ? (
                <Badge variant="outline" className="mr-2 opacity-70">
                  v{appVersion}
                </Badge>
              ) : null}
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button
                      variant="ghost"
                      size="icon"
                      className="relative mr-1"
                      onClick={() => setQueueOpen(true)}
                      aria-label="Open batch queue"
                    />
                  }
                >
                  <ListMusic className="size-5" />
                  {queue.length > 0 ? (
                    <span className="absolute -top-0.5 -right-0.5 flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-medium text-primary-foreground">
                      {queue.length > 99 ? '99+' : queue.length}
                    </span>
                  ) : null}
                </TooltipTrigger>
                <TooltipContent>Batch Queue (Ctrl+B)</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button
                      variant="ghost"
                      size="icon"
                      className="relative mr-1"
                      onClick={() => setHistoryOpen(true)}
                      aria-label={`Open conversion history, ${historyCount} items`}
                    />
                  }
                >
                  <History className="size-5" />
                  {historyCount > 0 ? (
                    <span className="absolute -top-0.5 -right-0.5 flex size-4 items-center justify-center rounded-full bg-destructive text-[10px] font-medium text-white">
                      {historyCount > 99 ? '99+' : historyCount}
                    </span>
                  ) : null}
                </TooltipTrigger>
                <TooltipContent>{`Conversion History (Ctrl+H) - ${historyCount} items`}</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setSettingsOpen(true)}
                      aria-label="Open settings"
                    />
                  }
                >
                  <Settings className="size-5" />
                </TooltipTrigger>
                <TooltipContent>Settings (Ctrl+,)</TooltipContent>
              </Tooltip>
            </div>
          </header>

          <main
            className={cn(
              'mx-auto w-full flex-1 px-4 py-8',
              conversionInputMode === 'batch-local' ? 'max-w-5xl' : 'max-w-3xl'
            )}
          >
            <ConversionForm
              onConvert={handleConvert}
              onCancel={handleCancel}
              isConverting={conversionState === 'converting'}
              disabled={!ffmpegAvailable}
              defaultMode={defaultSettings.defaultMode}
              defaultAudioFormat={defaultSettings.defaultAudioFormat}
              defaultVideoFormat={defaultSettings.defaultVideoFormat}
              defaultQuality={defaultSettings.defaultQuality}
              defaultSearchSite={defaultSettings.defaultSearchSite}
              defaultSearchLimit={defaultSettings.defaultSearchLimit}
              onAddToQueue={handleAddToQueue}
              inputMode={conversionInputMode}
              onInputModeChange={setConversionInputMode}
              outputFolder={outputFolder}
              onLocalBatchComplete={() => {
                if (window.api && window.api.getHistory) {
                  window.api.getHistory().then((res) => {
                    setHistoryCount(historyItemsFromResponse(res).length)
                  })
                }
              }}
            />

            <div className="mt-8">
              <ProgressIndicator
                progress={progress}
                statusMessage={statusMessage}
                state={conversionState}
                lastConvertedFile={lastConvertedFile}
                onOpenFileLocation={handleOpenFileLocation}
                progressSpeed={progressSpeed}
                progressEta={progressEta}
                progressSize={progressSize}
                playlistInfo={playlistInfo}
              />
            </div>

            <div className="mt-6">
              <LogViewer
                logs={logs}
                visible={logsVisible}
                onToggleVisibility={() => setLogsVisible(!logsVisible)}
                onClear={() => setLogs([])}
              />
            </div>
          </main>

          <footer className="mt-auto border-t border-border bg-card px-6 py-4">
            <OutputFolderSelector folder={outputFolder} onChange={handleOutputFolderChange} />
          </footer>

          <ErrorDialog
            open={!!error}
            onClose={handleCloseError}
            title={error?.title || 'Error'}
            message={error?.message || ''}
          />

          <SettingsDialog
            open={settingsOpen}
            onClose={() => setSettingsOpen(false)}
            onSettingsSaved={(settings) => {
              setThemeMode(settings?.theme || 'dark')
              setDefaultSettings((prev) => ({
                ...prev,
                defaultMode: settings?.defaultMode || prev.defaultMode,
                defaultAudioFormat: settings?.defaultAudioFormat || prev.defaultAudioFormat,
                defaultVideoFormat: settings?.defaultVideoFormat || prev.defaultVideoFormat,
                defaultQuality: settings?.defaultQuality || prev.defaultQuality,
                defaultSearchSite: settings?.defaultSearchSite || prev.defaultSearchSite,
                defaultSearchLimit: settings?.defaultSearchLimit ?? prev.defaultSearchLimit,
              }))
            }}
          />

          <HistoryPanel
            open={historyOpen}
            onClose={() => {
              setHistoryOpen(false)
              if (window.api && window.api.getHistory) {
                window.api.getHistory().then((res) => {
                  setHistoryCount(historyItemsFromResponse(res).length)
                })
              }
            }}
          />

          <QueuePanel
            open={queueOpen}
            onClose={() => setQueueOpen(false)}
            queue={queue}
            setQueue={setQueue}
            onRegisterAddToQueue={registerAddToQueue}
            outputFolder={outputFolder}
            defaultMode={defaultSettings.defaultMode}
            defaultFormat={
              defaultSettings.defaultMode === 'audio'
                ? defaultSettings.defaultAudioFormat
                : defaultSettings.defaultVideoFormat
            }
            defaultQuality={defaultSettings.defaultQuality}
            defaultSearchSite={defaultSettings.defaultSearchSite}
            defaultSearchLimit={defaultSettings.defaultSearchLimit}
            onQueueComplete={() => {
              if (window.api && window.api.getHistory) {
                window.api.getHistory().then((res) => {
                  setHistoryCount(historyItemsFromResponse(res).length)
                })
              }
            }}
          />

          <KeyboardShortcutsDialog open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
          <Toaster theme={resolvedTheme} position="bottom-center" richColors closeButton />
        </div>
      </TooltipProvider>
    </ThemeProvider>
  )
}

export default App
