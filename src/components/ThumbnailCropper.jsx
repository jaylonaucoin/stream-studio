import { useState, useRef, useCallback, useEffect } from 'react';
import ReactCrop from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import CropIcon from '@mui/icons-material/Crop';
import CheckIcon from '@mui/icons-material/Check';
import CancelIcon from '@mui/icons-material/Cancel';

function ThumbnailCropper({ open, imageUrl, onClose, onCropComplete }) {
  const [crop, setCrop] = useState({ unit: '%', width: 80, aspect: 1 });
  const [completedCrop, setCompletedCrop] = useState(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const imgRef = useRef(null);
  const canvasRef = useRef(null);

  const onImageLoad = useCallback((e) => {
    const image = e.currentTarget;
    const { naturalWidth, naturalHeight } = image;
    const displayWidth = image.width;
    const displayHeight = image.height;
    setImageLoaded(true);
    // Set initial crop to center square using displayed dimensions (ReactCrop works with displayed size)
    const cropSize = Math.min(displayWidth, displayHeight) * 0.8;
    const initialCrop = {
      unit: 'px',
      width: cropSize,
      height: cropSize,
      x: (displayWidth - cropSize) / 2,
      y: (displayHeight - cropSize) / 2,
    };
    setCrop(initialCrop);
    setCompletedCrop(initialCrop); // Set completedCrop immediately so button is enabled
    console.log('Image loaded', {
      naturalSize: { width: naturalWidth, height: naturalHeight },
      displaySize: { width: displayWidth, height: displayHeight },
      initialCrop,
    });
  }, []);

  const getCroppedImg = useCallback((cropToUse) => {
    if (!cropToUse || !imgRef.current || !canvasRef.current) {
      console.log('getCroppedImg: Missing requirements', {
        hasCrop: !!cropToUse,
        hasImgRef: !!imgRef.current,
        hasCanvasRef: !!canvasRef.current,
      });
      return Promise.resolve(null);
    }

    const image = imgRef.current;
    const canvas = canvasRef.current;
    let crop = cropToUse;

    console.log('getCroppedImg: Starting', {
      cropUnit: crop.unit,
      cropValues: { x: crop.x, y: crop.y, width: crop.width, height: crop.height },
      imageSize: { width: image.width, height: image.height },
      naturalSize: { width: image.naturalWidth, height: image.naturalHeight },
    });

    // Convert percentage-based crop to pixels if needed
    if (crop.unit === '%') {
      crop = {
        unit: 'px',
        x: (crop.x / 100) * image.width,
        y: (crop.y / 100) * image.height,
        width: (crop.width / 100) * image.width,
        height: (crop.height / 100) * image.height,
      };
      console.log('Converted percentage crop to pixels:', crop);
    }

    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;
    console.log('Scaling factors:', { scaleX, scaleY });

    const ctx = canvas.getContext('2d');
    const pixelRatio = window.devicePixelRatio;

    const outputWidth = crop.width * pixelRatio * scaleX;
    const outputHeight = crop.height * pixelRatio * scaleY;
    canvas.width = outputWidth;
    canvas.height = outputHeight;

    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    ctx.imageSmoothingQuality = 'high';

    const cropX = crop.x * scaleX;
    const cropY = crop.y * scaleY;
    const cropWidth = crop.width * scaleX;
    const cropHeight = crop.height * scaleY;

    console.log('Drawing image with crop:', {
      cropX,
      cropY,
      cropWidth,
      cropHeight,
      outputWidth,
      outputHeight,
    });

    ctx.drawImage(image, cropX, cropY, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight);

    // Resize if too large (max 1000px)
    const maxSize = 1000;
    if (canvas.width > maxSize || canvas.height > maxSize) {
      const tempCanvas = document.createElement('canvas');
      const tempCtx = tempCanvas.getContext('2d');
      const aspect = canvas.width / canvas.height;

      if (canvas.width > canvas.height) {
        tempCanvas.width = maxSize;
        tempCanvas.height = maxSize / aspect;
      } else {
        tempCanvas.height = maxSize;
        tempCanvas.width = maxSize * aspect;
      }

      tempCtx.drawImage(canvas, 0, 0, tempCanvas.width, tempCanvas.height);
      return new Promise((resolve) => {
        tempCanvas.toBlob(
          (blob) => {
            if (blob) {
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result);
              reader.readAsDataURL(blob);
            } else {
              resolve(null);
            }
          },
          'image/jpeg',
          0.95
        );
      });
    }

    return new Promise((resolve) => {
      canvas.toBlob(
        (blob) => {
          if (blob) {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.readAsDataURL(blob);
          } else {
            resolve(null);
          }
        },
        'image/jpeg',
        0.95
      );
    });
  }, []);

  const handleCrop = useCallback(async () => {
    try {
      // Use current crop if completedCrop is not set yet
      const finalCrop = completedCrop || crop;
      console.log('handleCrop called', {
        finalCrop,
        imageLoaded,
        hasImgRef: !!imgRef.current,
        hasCanvasRef: !!canvasRef.current,
      });

      if (!finalCrop || !finalCrop.width || !finalCrop.height || !imgRef.current) {
        console.error('No crop area selected or image not loaded', {
          finalCrop,
          hasImgRef: !!imgRef.current,
          imageLoaded,
        });
        return;
      }

      console.log('Calling getCroppedImg with crop:', finalCrop);
      const croppedImageUrl = await getCroppedImg(finalCrop);
      console.log('Got cropped image URL:', croppedImageUrl ? 'Success' : 'Failed');

      if (croppedImageUrl) {
        onCropComplete(croppedImageUrl);
      } else {
        console.error('Failed to generate cropped image');
      }
    } catch (error) {
      console.error('Error cropping image:', error);
    }
  }, [getCroppedImg, onCropComplete, completedCrop, crop, imageLoaded]);

  const handleClose = useCallback(() => {
    setImageLoaded(false);
    setCrop({ unit: '%', width: 80, aspect: 1 });
    setCompletedCrop(null);
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (!open) {
      setImageLoaded(false);
      setCrop({ unit: '%', width: 80, aspect: 1 });
      setCompletedCrop(null);
    }
  }, [open]);

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CropIcon />
            <Typography variant="h6">Crop Thumbnail</Typography>
          </Box>
          <IconButton onClick={handleClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>
      <DialogContent>
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: 400,
            bgcolor: 'background.default',
            borderRadius: 1,
            p: 2,
          }}
        >
          {imageUrl && (
            <ReactCrop
              crop={crop}
              onChange={(c) => {
                setCrop(c);
                // Also update completedCrop immediately so it's available when user clicks Apply
                if (c && c.width && c.height) {
                  setCompletedCrop(c);
                }
              }}
              onComplete={(c) => setCompletedCrop(c)}
              aspect={1}
            >
              <img
                ref={imgRef}
                alt="Crop me"
                src={imageUrl}
                onLoad={onImageLoad}
                style={{ maxWidth: '100%', maxHeight: '70vh' }}
              />
            </ReactCrop>
          )}
          <canvas ref={canvasRef} style={{ display: 'none' }} />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} startIcon={<CancelIcon />}>
          Cancel
        </Button>
        <Button
          onClick={(e) => {
            console.log('Apply Crop button clicked', {
              imageLoaded,
              completedCrop: !!completedCrop,
              crop: !!crop,
              cropWidth: crop?.width,
              cropHeight: crop?.height,
            });
            handleCrop(e);
          }}
          variant="contained"
          startIcon={<CheckIcon />}
          disabled={!imageLoaded || (!completedCrop && (!crop || !crop.width || !crop.height))}
        >
          Apply Crop
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default ThumbnailCropper;
