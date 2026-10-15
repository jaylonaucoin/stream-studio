import { useState, useCallback, useRef, useEffect } from 'react'
import { Play, Pause, User, Clock, Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Spinner } from '@/components/ui/spinner'
import ThumbnailWithFallback from '../ThumbnailWithFallback'

function VideoPreviewCard({
  videoInfo,
  chapterInfo,
  customMetadata,
  onEditMetadata,
  disabled,
  isConverting,
}) {
  const [playing, setPlaying] = useState(false)
  const [loadingAudio, setLoadingAudio] = useState(false)
  const [audioProgress, setAudioProgress] = useState(0)
  const [audioError, setAudioError] = useState(null)
  const audioRef = useRef(null)

  const stopAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.removeAttribute('src')
      audioRef.current.load()
      audioRef.current = null
    }
    setPlaying(false)
    setAudioProgress(0)
  }, [])

  useEffect(() => {
    return () => stopAudio()
  }, [stopAudio])

  const handlePlayPause = useCallback(async () => {
    if (disabled || isConverting || !videoInfo?.webpageUrl) return

    setAudioError(null)

    if (playing && audioRef.current) {
      audioRef.current.pause()
      setPlaying(false)
      return
    }

    if (audioRef.current) {
      try {
        await audioRef.current.play()
        setPlaying(true)
      } catch {
        setAudioError('Could not resume preview. Please try again.')
        stopAudio()
      }
      return
    }

    setLoadingAudio(true)
    try {
      const response = await window.api?.getAudioStreamUrl?.(videoInfo.webpageUrl)

      if (!response?.success || !response.url) {
        throw new Error(response?.error || 'Could not get audio stream.')
      }

      const newAudio = new Audio(response.url)
      audioRef.current = newAudio

      newAudio.addEventListener('timeupdate', () => {
        if (newAudio.duration > 0) {
          setAudioProgress((newAudio.currentTime / newAudio.duration) * 100)
        }
      })

      newAudio.addEventListener('ended', () => {
        setPlaying(false)
        setAudioProgress(0)
        audioRef.current = null
      })

      newAudio.addEventListener('error', () => {
        setAudioError('Preview not available for this site.')
        setPlaying(false)
        setAudioProgress(0)
        audioRef.current = null
      })

      await newAudio.play()
      setPlaying(true)
    } catch {
      setAudioError('Preview not available for this site.')
      stopAudio()
    } finally {
      setLoadingAudio(false)
    }
  }, [playing, disabled, isConverting, videoInfo?.webpageUrl, stopAudio])

  const canPreview = !!videoInfo?.webpageUrl && !disabled && !isConverting

  return (
    <div className="mb-4 rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="relative shrink-0">
          <ThumbnailWithFallback
            thumbnail={videoInfo.thumbnail}
            alt={videoInfo.title}
            isPlaylist={false}
          />
          {canPreview ? (
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    size="icon"
                    onClick={handlePlayPause}
                    disabled={loadingAudio}
                    className="absolute bottom-2 left-2 bg-black/60 text-white hover:bg-black/80"
                    aria-label={playing ? 'Pause preview' : 'Play preview'}
                  />
                }
              >
                {loadingAudio ? (
                  <Spinner size="sm" className="text-white" />
                ) : playing ? (
                  <Pause className="size-4" />
                ) : (
                  <Play className="size-4" />
                )}
              </TooltipTrigger>
              <TooltipContent>{playing ? 'Pause preview' : 'Play preview'}</TooltipContent>
            </Tooltip>
          ) : null}
        </div>
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex items-start gap-2">
            <Play className="mt-1 size-5 shrink-0 text-primary" aria-hidden />
            <h3 className="line-clamp-2 flex-1 text-base font-semibold">{videoInfo.title}</h3>
            {!chapterInfo?.hasChapters ? (
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
            ) : null}
          </div>

          <div className="mt-2 flex flex-wrap gap-2">
            {videoInfo.durationFormatted ? (
              <Badge variant="outline">
                <Clock className="size-3.5" />
                {videoInfo.durationFormatted}
              </Badge>
            ) : null}
            {videoInfo.uploader ? (
              <Badge variant="outline">
                <User className="size-3.5" />
                {videoInfo.uploader}
              </Badge>
            ) : null}
            {chapterInfo?.hasChapters ? (
              <Badge variant="outline" className="border-primary text-primary">
                <Play className="size-3.5" />
                {chapterInfo.totalChapters} chapters
              </Badge>
            ) : null}
            {customMetadata ? (
              <Badge variant="outline" className="border-primary text-primary">
                <Pencil className="size-3.5" />
                Custom Metadata
              </Badge>
            ) : null}
          </div>

          {audioError ? (
            <Alert className="mt-3 py-2">
              <AlertDescription className="flex items-center justify-between gap-2">
                <span>{audioError}</span>
                <Button size="sm" variant="ghost" onClick={() => setAudioError(null)}>
                  Dismiss
                </Button>
              </AlertDescription>
            </Alert>
          ) : null}
          {playing ? (
            <Progress value={audioProgress} className="mt-3 [&>[data-slot=progress-track]]:h-1" />
          ) : null}
        </div>
      </div>
    </div>
  )
}

export default VideoPreviewCard
