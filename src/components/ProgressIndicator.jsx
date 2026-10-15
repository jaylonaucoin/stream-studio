import { CircleCheck, CircleX, FolderOpen } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'

function ProgressIndicator({
  progress,
  statusMessage,
  state,
  lastConvertedFile,
  onOpenFileLocation,
  progressSpeed,
  progressEta,
  progressSize,
  playlistInfo,
}) {
  const isActive = state === 'converting' || state === 'completed'
  const isCompleted = state === 'completed'
  const isError = state === 'error'

  return (
    <div className="rounded-xl border border-border bg-card p-6 shadow-sm transition-all">
      {isActive ? (
        <div>
          <div className="mb-4 flex items-center gap-4">
            <p className="flex-1 text-sm font-medium">{statusMessage}</p>
            {isCompleted ? (
              <Badge className="bg-success text-success-foreground hover:bg-success/90">
                <CircleCheck className="size-3.5" />
                Success
              </Badge>
            ) : null}
          </div>

          {state === 'converting' ? (
            <div>
              {playlistInfo ? (
                <div className="mb-4 rounded-lg border-2 border-primary bg-card p-3">
                  <div className="mb-1 flex items-center gap-2">
                    <Badge>
                      Video {playlistInfo.current} of {playlistInfo.total}
                    </Badge>
                    {playlistInfo.currentTitle ? (
                      <span
                        className="flex-1 truncate text-xs font-medium"
                        title={playlistInfo.currentTitle}
                      >
                        {playlistInfo.currentTitle}
                      </span>
                    ) : null}
                  </div>
                </div>
              ) : null}

              <div className="mb-2 flex items-center gap-4">
                <Progress value={progress} className="flex-1 [&>[data-slot=progress-track]]:h-2" />
                <span className="min-w-12 text-right text-sm text-muted-foreground tabular-nums">
                  {progress.toFixed(0)}%
                </span>
              </div>
              {progressSpeed || progressEta || progressSize ? (
                <div className="mt-2 flex flex-wrap gap-4 border-t border-border pt-2">
                  {progressSpeed ? (
                    <span className="text-xs text-muted-foreground">Speed: {progressSpeed}</span>
                  ) : null}
                  {progressEta ? (
                    <span className="text-xs text-muted-foreground">ETA: {progressEta}</span>
                  ) : null}
                  {progressSize ? (
                    <span className="text-xs text-muted-foreground">Size: {progressSize}</span>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : null}

          {isCompleted ? (
            <div className="py-4 text-center">
              <CircleCheck className="mx-auto mb-2 size-16 text-success" aria-hidden />
              <h3 className="text-lg font-semibold text-success">
                {lastConvertedFile?.isPlaylist
                  ? `Playlist Complete! (${lastConvertedFile.fileCount} videos)`
                  : 'Conversion Complete!'}
              </h3>
            </div>
          ) : null}

          {lastConvertedFile ? (
            <div className="mt-6 border-t border-border pt-4">
              <p className="mb-2 text-sm font-medium text-muted-foreground">
                {lastConvertedFile.isPlaylist ? 'Playlist saved:' : 'File saved:'}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span
                  className="min-w-0 flex-1 truncate font-mono text-sm"
                  title={
                    lastConvertedFile.isPlaylist
                      ? lastConvertedFile.playlistFolderName
                      : lastConvertedFile.fileName
                  }
                >
                  {lastConvertedFile.isPlaylist
                    ? lastConvertedFile.playlistFolderName
                    : lastConvertedFile.fileName}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    onOpenFileLocation(
                      lastConvertedFile.isPlaylist
                        ? lastConvertedFile.playlistFolder
                        : lastConvertedFile.filePath
                    )
                  }
                >
                  <FolderOpen className="size-4" />
                  Open Location
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {isError ? (
        <div className="mb-1 flex items-center gap-4">
          <p className="flex-1 text-sm font-medium">{statusMessage || 'Conversion failed'}</p>
          <Badge variant="destructive">
            <CircleX className="size-3.5" />
            Error
          </Badge>
        </div>
      ) : null}

      {!isActive && !isError && state === 'idle' ? (
        <div className="py-4 text-center">
          <p className="text-sm text-muted-foreground">
            Paste a URL, pick a result in Search, or use the Library tab for local files
          </p>
        </div>
      ) : null}
    </div>
  )
}

export default ProgressIndicator
