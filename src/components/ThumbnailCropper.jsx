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
    // Ensure image is fully loaded
    if (!image.complete || image.naturalWidth === 0) {
      console.warn('Image not fully loaded yet');
      return;
    }
    
    const { naturalWidth, naturalHeight } = image;
    const displayWidth = image.width;
    const displayHeight = image.height;
    
    console.log('Image loaded', {
      naturalSize: { width: naturalWidth, height: naturalHeight },
      displaySize: { width: displayWidth, height: displayHeight },
      complete: image.complete,
    });
    
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
    console.log('Initial crop set:', initialCrop);
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
      // Use toDataURL for more reliable conversion
      const dataUrl = tempCanvas.toDataURL('image/jpeg', 0.95);
      return Promise.resolve(dataUrl);
    }

    // Use toDataURL for more reliable conversion
    const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
    return Promise.resolve(dataUrl);
  }, []);

  const [cropError, setCropError] = useState(null);
  const [isCropping, setIsCropping] = useState(false);

  const handleCrop = useCallback(async () => {
    setCropError(null);
    setIsCropping(true);
    
    try {
      console.log('handleCrop called', {
        hasImgRef: !!imgRef.current,
        hasCanvasRef: !!canvasRef.current,
        completedCrop: !!completedCrop,
        crop: !!crop,
        imageLoaded,
      });

      if (!imgRef.current || !canvasRef.current) {
        console.error('Image or canvas ref not available', {
          imgRef: imgRef.current,
          canvasRef: canvasRef.current,
        });
        setCropError('Image not ready. Please wait for the image to load.');
        setIsCropping(false);
        return;
      }

      const image = imgRef.current;
      if (!image.complete || image.naturalWidth === 0 || image.naturalHeight === 0) {
        console.error('Image not fully loaded', {
          complete: image.complete,
          naturalWidth: image.naturalWidth,
          naturalHeight: image.naturalHeight,
        });
        setCropError('Image not fully loaded. Please wait and try again.');
        setIsCropping(false);
        return;
      }

      // Use completedCrop if available, otherwise fall back to current crop
      const finalCrop = completedCrop || crop;

      if (!finalCrop || !finalCrop.width || !finalCrop.height) {
        console.error('Invalid crop values:', finalCrop);
        setCropError('Please select an area to crop.');
        setIsCropping(false);
        return;
      }

      console.log('Calling getCroppedImg with crop:', finalCrop);
      const croppedImageUrl = await getCroppedImg(finalCrop);
      console.log('getCroppedImg result:', croppedImageUrl ? 'Success (length: ' + croppedImageUrl.length + ')' : 'Failed');

      if (croppedImageUrl && croppedImageUrl.length > 100) {
        console.log('Calling onCropComplete');
        onCropComplete(croppedImageUrl);
        console.log('onCropComplete called successfully');
        // Reset state after successful crop
        setImageLoaded(false);
        setCrop({ unit: '%', width: 80, aspect: 1 });
        setCompletedCrop(null);
        setCropError(null);
      } else {
        console.error('Failed to generate cropped image');
        setCropError('Failed to generate cropped image. The image may have loading issues.');
      }
    } catch (error) {
      console.error('Error cropping image:', error);
      setCropError('Error cropping image: ' + (error.message || 'Unknown error'));
    } finally {
      setIsCropping(false);
    }
  }, [getCroppedImg, onCropComplete, completedCrop, crop, imageLoaded]);

  const handleClose = useCallback(() => {
    setImageLoaded(false);
    setCrop({ unit: '%', width: 80, aspect: 1 });
    setCompletedCrop(null);
    setCropError(null);
    setIsCropping(false);
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (!open) {
      setImageLoaded(false);
      setCrop({ unit: '%', width: 80, aspect: 1 });
      setCompletedCrop(null);
      setCropError(null);
      setIsCropping(false);
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
        {cropError && (
          <Box sx={{ mb: 2, p: 1, bgcolor: 'error.light', borderRadius: 1 }}>
            <Typography color="error.contrastText" variant="body2">
              {cropError}
            </Typography>
          </Box>
        )}
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
                onError={(e) => {
                  console.error('Image load error');
                  setCropError('Failed to load image for cropping.');
                }}
                style={{ maxWidth: '100%', maxHeight: '70vh' }}
              />
            </ReactCrop>
          )}
          {!imageUrl && (
            <Typography color="text.secondary">No image to crop</Typography>
          )}
          <canvas ref={canvasRef} style={{ display: 'none' }} />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} startIcon={<CancelIcon />} disabled={isCropping}>
          Cancel
        </Button>
        <Button
          onClick={async (e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('Apply Crop button clicked', {
              imageLoaded,
              completedCrop: !!completedCrop,
              crop: !!crop,
              cropWidth: crop?.width,
              cropHeight: crop?.height,
              hasImgRef: !!imgRef.current,
              hasCanvasRef: !!canvasRef.current,
            });
            await handleCrop();
          }}
          variant="contained"
          startIcon={<CheckIcon />}
          disabled={
            isCropping ||
            !imageLoaded ||
            (!completedCrop && (!crop || !crop.width || !crop.height))
          }
        >
          {isCropping ? 'Cropping...' : 'Apply Crop'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default ThumbnailCropper;
