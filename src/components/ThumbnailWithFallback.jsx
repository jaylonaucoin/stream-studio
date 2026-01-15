import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { Box } from '@mui/material';
import PlaylistPlayIcon from '@mui/icons-material/PlaylistPlay';
import MusicNoteIcon from '@mui/icons-material/MusicNote';

// Global cache to track loaded images across ALL component instances
// This persists even when components unmount/remount
const globalImageCache = new Map();

// Thumbnail placeholder component
export const ThumbnailPlaceholder = ({ isPlaylist = false, width = 160, height = 90 }) => (
  <Box
    sx={{
      width: { xs: '100%', sm: width },
      height: { xs: 90, sm: height },
      bgcolor: 'action.hover',
      borderRadius: 1,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    }}
  >
    {isPlaylist ? (
      <PlaylistPlayIcon sx={{ fontSize: 40, color: 'text.disabled' }} />
    ) : (
      <MusicNoteIcon sx={{ fontSize: 40, color: 'text.disabled' }} />
    )}
  </Box>
);

// Thumbnail with fallback component - tries multiple URLs in sequence
const ThumbnailWithFallback = ({ thumbnail, alt, isPlaylist = false, width = 160, height = 90, sx = {} }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showPlaceholder, setShowPlaceholder] = useState(false);
  // Use ref to track loaded state - persists across re-renders without causing them
  const imageLoadedRef = useRef(false);
  const [, forceUpdate] = useState(0);

  // Normalize thumbnail to array
  const thumbnailUrls = useMemo(() => {
    if (!thumbnail) return [];
    if (Array.isArray(thumbnail)) return thumbnail;
    return [thumbnail];
  }, [thumbnail]);

  const currentUrl = thumbnailUrls[currentIndex];
  
  // Use a ref to track the last loaded URL to prevent unnecessary resets
  const lastLoadedUrlRef = useRef(null);
  
  // Compute if image is cached synchronously using useMemo
  // This runs during render, before effects, so we can use it immediately
  const isCached = useMemo(() => {
    if (!currentUrl) return false;
    return globalImageCache.has(currentUrl);
  }, [currentUrl]);
  
  // Initialize loaded state from cache synchronously if cached
  // This MUST happen before any effects that might reset it
  if (isCached) {
    if (lastLoadedUrlRef.current !== currentUrl) {
      imageLoadedRef.current = true;
      lastLoadedUrlRef.current = currentUrl;
    } else if (!imageLoadedRef.current) {
      imageLoadedRef.current = true;
    }
  }
  
  // Check if image is cached immediately
  useEffect(() => {
    if (currentUrl && !imageLoadedRef.current) {
      if (globalImageCache.has(currentUrl)) {
        lastLoadedUrlRef.current = currentUrl;
        imageLoadedRef.current = true;
        setShowPlaceholder(false);
        forceUpdate(n => n + 1);
        return;
      }
      
      // Create a test image to check if it's cached in browser
      const testImg = new Image();
      testImg.onload = () => {
        globalImageCache.set(currentUrl, true);
        lastLoadedUrlRef.current = currentUrl;
        imageLoadedRef.current = true;
        setShowPlaceholder(false);
        forceUpdate(n => n + 1);
      };
      testImg.onerror = () => {
        // Image not cached, will load normally
      };
      testImg.src = currentUrl;
    }
  }, [currentUrl]);
  
  // Reset image loaded state when URL actually changes
  useEffect(() => {
    if (currentUrl && currentUrl !== lastLoadedUrlRef.current) {
      if (!globalImageCache.has(currentUrl)) {
        imageLoadedRef.current = false;
        lastLoadedUrlRef.current = null;
      } else {
        imageLoadedRef.current = true;
        lastLoadedUrlRef.current = currentUrl;
      }
      forceUpdate(n => n + 1);
    }
  }, [currentUrl]);

  const handleError = useCallback(() => {
    if (currentIndex < thumbnailUrls.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      setShowPlaceholder(true);
    }
  }, [currentIndex, thumbnailUrls.length]);

  // Create a stable string representation of thumbnail for comparison
  const thumbnailKey = useMemo(() => {
    if (!thumbnail) return '';
    if (Array.isArray(thumbnail)) return JSON.stringify(thumbnail);
    return String(thumbnail);
  }, [thumbnail]);
  
  const prevThumbnailKeyRef = useRef('');

  // Reset when thumbnail prop actually changes
  useEffect(() => {
    if (thumbnailKey !== prevThumbnailKeyRef.current) {
      const firstUrl = thumbnailUrls[0];
      if (firstUrl && firstUrl !== lastLoadedUrlRef.current) {
        const cached = globalImageCache.has(firstUrl);
        setCurrentIndex(0);
        setShowPlaceholder(false);
        if (!cached) {
          imageLoadedRef.current = false;
        } else {
          imageLoadedRef.current = true;
          lastLoadedUrlRef.current = firstUrl;
        }
        forceUpdate(n => n + 1);
      } else if (firstUrl === lastLoadedUrlRef.current) {
        setCurrentIndex(0);
        setShowPlaceholder(false);
        forceUpdate(n => n + 1);
      }
      prevThumbnailKeyRef.current = thumbnailKey;
    }
  }, [thumbnailKey, thumbnailUrls]);

  if (showPlaceholder || !currentUrl) {
    return <ThumbnailPlaceholder isPlaylist={isPlaylist} width={width} height={height} />;
  }
  
  const imgRef = useRef(null);

  // Show placeholder while image is loading
  if (!imageLoadedRef.current) {
    return (
      <>
        <Box
          ref={imgRef}
          component="img"
          key={currentUrl}
          src={currentUrl}
          alt={alt}
          onError={handleError}
          onLoad={() => {
            globalImageCache.set(currentUrl, true);
            lastLoadedUrlRef.current = currentUrl;
            imageLoadedRef.current = true;
            setShowPlaceholder(false);
            forceUpdate(n => n + 1);
          }}
          sx={{
            display: 'none',
          }}
        />
        <ThumbnailPlaceholder isPlaylist={isPlaylist} width={width} height={height} />
      </>
    );
  }

  // Image has loaded, render it
  return (
    <Box
      component="img"
      key={currentUrl}
      src={currentUrl}
      alt={alt}
      onError={handleError}
      onLoad={() => {
        globalImageCache.set(currentUrl, true);
        lastLoadedUrlRef.current = currentUrl;
        imageLoadedRef.current = true;
        setShowPlaceholder(false);
        forceUpdate(n => n + 1);
      }}
      sx={{
        width: { xs: '100%', sm: width },
        height: { xs: 'auto', sm: height },
        objectFit: 'cover',
        borderRadius: 1,
        flexShrink: 0,
        display: 'block',
        ...sx,
      }}
    />
  );
};

export default ThumbnailWithFallback;
