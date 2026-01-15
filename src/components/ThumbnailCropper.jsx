import { useState, useRef, useCallback, useEffect } from 'react';
import { ListItem, ListItemButton, ListItemText } from '@mui/material';
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
  const [localImageUrl, setLocalImageUrl] = useState(null);
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
  }, []);

  const getCroppedImg = useCallback((cropToUse) => {
    if (!cropToUse || !imgRef.current || !canvasRef.current) {
      return Promise.resolve(null);
    }

    const image = imgRef.current;
    const canvas = canvasRef.current;
    let crop = cropToUse;

    // Convert percentage-based crop to pixels if needed
    if (crop.unit === '%') {
      crop = {
        unit: 'px',
        x: (crop.x / 100) * image.width,
        y: (crop.y / 100) * image.height,
        width: (crop.width / 100) * image.width,
        height: (crop.height / 100) * image.height,
      };
    }

    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;

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

  const handleCrop = useCallback(async () => {
    try {
      if (!imgRef.current || !canvasRef.current) {
        console.error('Image or canvas ref not available', {
          imgRef: imgRef.current,
          canvasRef: canvasRef.current,
        });
        return;
      }

      const image = imgRef.current;
      if (!image.complete || image.naturalWidth === 0 || image.naturalHeight === 0) {
        console.error('Image not fully loaded', {
          complete: image.complete,
          naturalWidth: image.naturalWidth,
          naturalHeight: image.naturalHeight,
        });
        return;
      }

      // Use completedCrop if available, otherwise fall back to current crop
      const finalCrop = completedCrop || crop;

      if (!finalCrop || !finalCrop.width || !finalCrop.height) {
        console.error('Invalid crop values:', finalCrop);
        return;
      }

      const croppedImageUrl = await getCroppedImg(finalCrop);

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

  // Fetch image via main process to avoid CORS tainted canvas issue
  useEffect(() => {
    if (!open || !imageUrl) {
      setLocalImageUrl(null);
      setImageLoaded(false);
      setCrop({ unit: '%', width: 80, aspect: 1 });
      setCompletedCrop(null);
      return;
    }

    // Ensure imageUrl is a string - handle cases where it might be an object or other type
    let urlString = imageUrl;
    if (typeof imageUrl !== 'string') {
      // If it's an object with a url property, use that
      if (imageUrl && typeof imageUrl === 'object' && 'url' in imageUrl) {
        urlString = imageUrl.url;
      } else if (imageUrl && typeof imageUrl === 'object' && 'thumbnail' in imageUrl) {
        urlString = imageUrl.thumbnail;
      } else {
        // Try to convert to string, or use empty string as fallback
        urlString = String(imageUrl) || '';
      }
      
      // If we couldn't get a valid string, exit early
      if (!urlString || typeof urlString !== 'string') {
        console.error('Invalid imageUrl type:', typeof imageUrl, imageUrl);
        setLocalImageUrl(null);
        return;
      }
    }

    // If it's already a data URL, use it directly
    if (urlString.startsWith('data:')) {
      setLocalImageUrl(urlString);
      return;
    }

    // Fetch image via main process (no CORS restrictions)
    window.api.fetchImageAsDataUrl(urlString)
      .then(result => {
        if (result.success && result.dataUrl) {
          setLocalImageUrl(result.dataUrl);
        } else {
          console.error('Error fetching image:', result.error);
          // Fallback to original URL if fetch fails (will cause tainted canvas but better than nothing)
          setLocalImageUrl(urlString);
        }
      })
      .catch(error => {
        console.error('Error fetching image:', error);
        // Fallback to original URL if fetch fails
        setLocalImageUrl(urlString);
      });
  }, [open, imageUrl]);

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
          {localImageUrl && (
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
                src={localImageUrl}
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
          onClick={async (e) => {
            e.preventDefault();
            e.stopPropagation();
            await handleCrop();
          }}
          variant="contained"
          startIcon={<CheckIcon />}
          disabled={
            !imageLoaded ||
            (!completedCrop && (!crop || !crop.width || !crop.height))
          }
        >
          Apply Crop
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default ThumbnailCropper;
