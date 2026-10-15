import { useState, useCallback, useEffect, useMemo, useRef } from 'react'
import { ListMusic, Music } from 'lucide-react'
import { cn } from '@/lib/utils'

const globalImageCache = new Map()

export const ThumbnailPlaceholder = ({ isPlaylist = false, width = 160, height = 90, className }) => (
  <div
    className={cn(
      'flex shrink-0 items-center justify-center rounded-md bg-muted',
      'h-[90px] w-full sm:h-auto sm:w-auto',
      className
    )}
    style={{ width, height }}
  >
    {isPlaylist ? (
      <ListMusic
        className="size-10 text-muted-foreground/50"
        aria-hidden
        data-testid="PlaylistPlayIcon"
      />
    ) : (
      <Music
        className="size-10 text-muted-foreground/50"
        aria-hidden
        data-testid="MusicNoteIcon"
      />
    )}
  </div>
)

const ThumbnailWithFallback = ({
  thumbnail,
  alt,
  isPlaylist = false,
  width = 160,
  height = 90,
  className,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [showPlaceholder, setShowPlaceholder] = useState(false)
  const imageLoadedRef = useRef(false)
  const [, forceUpdate] = useState(0)

  const thumbnailUrls = useMemo(() => {
    if (!thumbnail) return []
    if (Array.isArray(thumbnail)) return thumbnail
    return [thumbnail]
  }, [thumbnail])

  const currentUrl = thumbnailUrls[currentIndex]
  const lastLoadedUrlRef = useRef(null)
  const imgRef = useRef(null)

  const isCached = useMemo(() => {
    if (!currentUrl) return false
    return globalImageCache.has(currentUrl)
  }, [currentUrl])

  if (isCached) {
    if (lastLoadedUrlRef.current !== currentUrl) {
      imageLoadedRef.current = true
      lastLoadedUrlRef.current = currentUrl
    } else if (!imageLoadedRef.current) {
      imageLoadedRef.current = true
    }
  }

  useEffect(() => {
    if (currentUrl && !imageLoadedRef.current) {
      if (globalImageCache.has(currentUrl)) {
        lastLoadedUrlRef.current = currentUrl
        imageLoadedRef.current = true
        setShowPlaceholder(false)
        forceUpdate((n) => n + 1)
        return
      }

      const testImg = new Image()
      testImg.onload = () => {
        globalImageCache.set(currentUrl, true)
        lastLoadedUrlRef.current = currentUrl
        imageLoadedRef.current = true
        setShowPlaceholder(false)
        forceUpdate((n) => n + 1)
      }
      testImg.onerror = () => {}
      testImg.src = currentUrl
    }
  }, [currentUrl])

  useEffect(() => {
    if (currentUrl && currentUrl !== lastLoadedUrlRef.current) {
      if (!globalImageCache.has(currentUrl)) {
        imageLoadedRef.current = false
        lastLoadedUrlRef.current = null
      } else {
        imageLoadedRef.current = true
        lastLoadedUrlRef.current = currentUrl
      }
      forceUpdate((n) => n + 1)
    }
  }, [currentUrl])

  const handleError = useCallback(() => {
    if (currentIndex < thumbnailUrls.length - 1) {
      setCurrentIndex(currentIndex + 1)
    } else {
      setShowPlaceholder(true)
    }
  }, [currentIndex, thumbnailUrls.length])

  const thumbnailKey = useMemo(() => {
    if (!thumbnail) return ''
    if (Array.isArray(thumbnail)) return JSON.stringify(thumbnail)
    return String(thumbnail)
  }, [thumbnail])

  const prevThumbnailKeyRef = useRef('')

  useEffect(() => {
    if (thumbnailKey !== prevThumbnailKeyRef.current) {
      const firstUrl = thumbnailUrls[0]
      if (firstUrl && firstUrl !== lastLoadedUrlRef.current) {
        const cached = globalImageCache.has(firstUrl)
        setCurrentIndex(0)
        setShowPlaceholder(false)
        if (!cached) {
          imageLoadedRef.current = false
        } else {
          imageLoadedRef.current = true
          lastLoadedUrlRef.current = firstUrl
        }
        forceUpdate((n) => n + 1)
      } else if (firstUrl === lastLoadedUrlRef.current) {
        setCurrentIndex(0)
        setShowPlaceholder(false)
        forceUpdate((n) => n + 1)
      }
      prevThumbnailKeyRef.current = thumbnailKey
    }
  }, [thumbnailKey, thumbnailUrls])

  if (showPlaceholder || !currentUrl) {
    return <ThumbnailPlaceholder isPlaylist={isPlaylist} width={width} height={height} />
  }

  if (!imageLoadedRef.current) {
    return (
      <>
        <img
          ref={imgRef}
          key={currentUrl}
          src={currentUrl}
          alt={alt}
          onError={handleError}
          onLoad={() => {
            globalImageCache.set(currentUrl, true)
            lastLoadedUrlRef.current = currentUrl
            imageLoadedRef.current = true
            setShowPlaceholder(false)
            forceUpdate((n) => n + 1)
          }}
          className="hidden"
        />
        <ThumbnailPlaceholder isPlaylist={isPlaylist} width={width} height={height} />
      </>
    )
  }

  return (
    <img
      key={currentUrl}
      src={currentUrl}
      alt={alt}
      onError={handleError}
      onLoad={() => {
        globalImageCache.set(currentUrl, true)
        lastLoadedUrlRef.current = currentUrl
        imageLoadedRef.current = true
        setShowPlaceholder(false)
        forceUpdate((n) => n + 1)
      }}
      className={cn('block shrink-0 rounded-md object-cover', 'w-full sm:w-auto', className)}
      style={{ width, height }}
    />
  )
}

export default ThumbnailWithFallback
