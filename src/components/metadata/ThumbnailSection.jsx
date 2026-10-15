import { useState, useCallback } from 'react'
import { Image, Crop } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import ThumbnailCropper from '../ThumbnailCropper'

/**
 * Thumbnail / album art display and edit controls.
 */
function ThumbnailSection({ thumbnailUrl, onThumbnailChange, onError }) {
  const [cropDialogOpen, setCropDialogOpen] = useState(false)
  const [imageLoading, setImageLoading] = useState(false)

  const handleImageSelect = useCallback(async () => {
    if (window.api && window.api.selectImageFile) {
      setImageLoading(true)
      try {
        const result = await window.api.selectImageFile()
        if (result.success && result.dataUrl) {
          onThumbnailChange(result.dataUrl)
        } else {
          onError?.('Failed to select image. Please try again.')
        }
      } catch (err) {
        console.error('Failed to select image:', err)
        onError?.('Failed to select image: ' + (err.message || 'Unknown error'))
      } finally {
        setImageLoading(false)
      }
    }
  }, [onThumbnailChange, onError])

  const handleCropComplete = useCallback(
    (croppedImageUrl) => {
      if (!croppedImageUrl) {
        console.error('No cropped image URL provided')
        onError?.('Failed to crop image. Please try again.')
        return
      }

      try {
        onThumbnailChange(croppedImageUrl)
        setCropDialogOpen(false)
      } catch (error) {
        console.error('Error saving cropped image:', error)
        onError?.('Failed to save cropped image. Please try again.')
      }
    },
    [onThumbnailChange, onError]
  )

  return (
    <>
      <div className="mt-4">
        <h3 className="mb-2 text-sm font-medium">Thumbnail / Album Art</h3>
        <div className="flex items-start gap-4">
          {thumbnailUrl ? (
            <img
              src={thumbnailUrl}
              alt="Thumbnail"
              className="size-50 rounded-md border border-border object-cover"
              style={{ width: 200, height: 200 }}
            />
          ) : null}
          <div className="flex flex-col gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCropDialogOpen(true)}
              disabled={!thumbnailUrl || imageLoading}
            >
              {imageLoading ? <Spinner size="sm" /> : <Crop className="size-4" />}
              Crop
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleImageSelect}
              disabled={imageLoading}
            >
              {imageLoading ? <Spinner size="sm" /> : <Image className="size-4" />}
              Replace
            </Button>
          </div>
        </div>
      </div>
      <ThumbnailCropper
        open={cropDialogOpen}
        imageUrl={thumbnailUrl}
        onClose={() => setCropDialogOpen(false)}
        onCropComplete={handleCropComplete}
      />
    </>
  )
}

export default ThumbnailSection
