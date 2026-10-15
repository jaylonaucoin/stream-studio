import { useState, useRef, useCallback, useEffect } from 'react'
import ReactCrop from 'react-image-crop'
import 'react-image-crop/dist/ReactCrop.css'
import { Crop, Check, X } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

function ThumbnailCropper({ open, imageUrl, onClose, onCropComplete }) {
  const [crop, setCrop] = useState({ unit: '%', width: 80, aspect: 1 })
  const [completedCrop, setCompletedCrop] = useState(null)
  const [imageLoaded, setImageLoaded] = useState(false)
  const [localImageUrl, setLocalImageUrl] = useState(null)
  const imgRef = useRef(null)
  const canvasRef = useRef(null)

  const onImageLoad = useCallback((e) => {
    const image = e.currentTarget
    if (!image.complete || image.naturalWidth === 0) {
      console.warn('Image not fully loaded yet')
      return
    }

    const displayWidth = image.width
    const displayHeight = image.height

    setImageLoaded(true)

    const cropSize = Math.min(displayWidth, displayHeight) * 0.8
    const initialCrop = {
      unit: 'px',
      width: cropSize,
      height: cropSize,
      x: (displayWidth - cropSize) / 2,
      y: (displayHeight - cropSize) / 2,
    }
    setCrop(initialCrop)
    setCompletedCrop(initialCrop)
  }, [])

  const getCroppedImg = useCallback((cropToUse) => {
    if (!cropToUse || !imgRef.current || !canvasRef.current) {
      return Promise.resolve(null)
    }

    const image = imgRef.current
    const canvas = canvasRef.current
    let nextCrop = cropToUse

    if (nextCrop.unit === '%') {
      nextCrop = {
        unit: 'px',
        x: (nextCrop.x / 100) * image.width,
        y: (nextCrop.y / 100) * image.height,
        width: (nextCrop.width / 100) * image.width,
        height: (nextCrop.height / 100) * image.height,
      }
    }

    const scaleX = image.naturalWidth / image.width
    const scaleY = image.naturalHeight / image.height

    const ctx = canvas.getContext('2d')
    const pixelRatio = window.devicePixelRatio

    const outputWidth = nextCrop.width * pixelRatio * scaleX
    const outputHeight = nextCrop.height * pixelRatio * scaleY
    canvas.width = outputWidth
    canvas.height = outputHeight

    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0)
    ctx.imageSmoothingQuality = 'high'

    const cropX = nextCrop.x * scaleX
    const cropY = nextCrop.y * scaleY
    const cropWidth = nextCrop.width * scaleX
    const cropHeight = nextCrop.height * scaleY

    ctx.drawImage(image, cropX, cropY, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight)

    const maxSize = 1000
    if (canvas.width > maxSize || canvas.height > maxSize) {
      const tempCanvas = document.createElement('canvas')
      const tempCtx = tempCanvas.getContext('2d')
      const aspect = canvas.width / canvas.height

      if (canvas.width > canvas.height) {
        tempCanvas.width = maxSize
        tempCanvas.height = maxSize / aspect
      } else {
        tempCanvas.height = maxSize
        tempCanvas.width = maxSize * aspect
      }

      tempCtx.drawImage(canvas, 0, 0, tempCanvas.width, tempCanvas.height)
      return Promise.resolve(tempCanvas.toDataURL('image/jpeg', 0.95))
    }

    return Promise.resolve(canvas.toDataURL('image/jpeg', 0.95))
  }, [])

  const handleCrop = useCallback(async () => {
    try {
      if (!imgRef.current || !canvasRef.current) {
        console.error('Image or canvas ref not available')
        return
      }

      const image = imgRef.current
      if (!image.complete || image.naturalWidth === 0 || image.naturalHeight === 0) {
        console.error('Image not fully loaded')
        return
      }

      const finalCrop = completedCrop || crop

      if (!finalCrop || !finalCrop.width || !finalCrop.height) {
        console.error('Invalid crop values:', finalCrop)
        return
      }

      const croppedImageUrl = await getCroppedImg(finalCrop)

      if (croppedImageUrl) {
        onCropComplete(croppedImageUrl)
      } else {
        console.error('Failed to generate cropped image')
      }
    } catch (error) {
      console.error('Error cropping image:', error)
    }
  }, [getCroppedImg, onCropComplete, completedCrop, crop])

  const handleClose = useCallback(() => {
    setImageLoaded(false)
    setCrop({ unit: '%', width: 80, aspect: 1 })
    setCompletedCrop(null)
    onClose()
  }, [onClose])

  useEffect(() => {
    if (!open || !imageUrl) {
      setLocalImageUrl(null)
      setImageLoaded(false)
      setCrop({ unit: '%', width: 80, aspect: 1 })
      setCompletedCrop(null)
      return
    }

    let urlString = imageUrl
    if (typeof imageUrl !== 'string') {
      if (imageUrl && typeof imageUrl === 'object' && 'url' in imageUrl) {
        urlString = imageUrl.url
      } else if (imageUrl && typeof imageUrl === 'object' && 'thumbnail' in imageUrl) {
        urlString = imageUrl.thumbnail
      } else {
        urlString = String(imageUrl) || ''
      }

      if (!urlString || typeof urlString !== 'string') {
        console.error('Invalid imageUrl type:', typeof imageUrl, imageUrl)
        setLocalImageUrl(null)
        return
      }
    }

    if (urlString.startsWith('data:')) {
      setLocalImageUrl(urlString)
      return
    }

    window.api
      .fetchImageAsDataUrl(urlString)
      .then((result) => {
        if (result.success && result.dataUrl) {
          setLocalImageUrl(result.dataUrl)
        } else {
          console.error('Error fetching image:', result.error)
          setLocalImageUrl(urlString)
        }
      })
      .catch((error) => {
        console.error('Error fetching image:', error)
        setLocalImageUrl(urlString)
      })
  }, [open, imageUrl])

  return (
    <Dialog open={open} onOpenChange={(next) => !next && handleClose()}>
      <DialogContent className="sm:max-w-2xl" showCloseButton>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Crop className="size-5" aria-hidden />
            Crop Thumbnail
          </DialogTitle>
        </DialogHeader>
        <div className="flex min-h-100 items-center justify-center rounded-lg bg-muted p-4">
          {localImageUrl ? (
            <ReactCrop
              crop={crop}
              onChange={(c) => {
                setCrop(c)
                if (c && c.width && c.height) {
                  setCompletedCrop(c)
                }
              }}
              onComplete={(c) => setCompletedCrop(c)}
              aspect={1}
            >
              <img
                ref={imgRef}
                alt="Crop me"
                src={localImageUrl}
                onLoad={onImageLoad}
                className="max-h-[70vh] max-w-full"
              />
            </ReactCrop>
          ) : null}
          <canvas ref={canvasRef} className="hidden" />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            <X className="size-4" />
            Cancel
          </Button>
          <Button
            onClick={async (e) => {
              e.preventDefault()
              e.stopPropagation()
              await handleCrop()
            }}
            disabled={!imageLoaded || (!completedCrop && (!crop || !crop.width || !crop.height))}
          >
            <Check className="size-4" />
            Apply Crop
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default ThumbnailCropper
