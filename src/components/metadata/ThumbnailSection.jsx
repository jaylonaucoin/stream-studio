import { useState, useCallback } from 'react';
import { Box, Typography, Button, CircularProgress } from '@mui/material';
import ImageIcon from '@mui/icons-material/Image';
import CropIcon from '@mui/icons-material/Crop';
import ThumbnailCropper from '../ThumbnailCropper';

/**
 * ThumbnailSection component for displaying and editing album art/thumbnails
 */
function ThumbnailSection({ thumbnailUrl, onThumbnailChange, onError }) {
  const [cropDialogOpen, setCropDialogOpen] = useState(false);
  const [imageLoading, setImageLoading] = useState(false);

  const handleImageSelect = useCallback(async () => {
    if (window.api && window.api.selectImageFile) {
      setImageLoading(true);
      try {
        const result = await window.api.selectImageFile();
        if (result.success && result.dataUrl) {
          onThumbnailChange(result.dataUrl);
        } else {
          onError?.('Failed to select image. Please try again.');
        }
      } catch (err) {
        console.error('Failed to select image:', err);
        onError?.('Failed to select image: ' + (err.message || 'Unknown error'));
      } finally {
        setImageLoading(false);
      }
    }
  }, [onThumbnailChange, onError]);

  const handleCropComplete = useCallback(
    (croppedImageUrl) => {
      if (!croppedImageUrl) {
        console.error('No cropped image URL provided');
        onError?.('Failed to crop image. Please try again.');
        return;
      }

      try {
        onThumbnailChange(croppedImageUrl);
        setCropDialogOpen(false);
      } catch (error) {
        console.error('Error saving cropped image:', error);
        onError?.('Failed to save cropped image. Please try again.');
      }
    },
    [onThumbnailChange, onError]
  );

  return (
    <>
      <Box sx={{ mt: 2 }}>
        <Typography variant="subtitle2" gutterBottom>
          Thumbnail / Album Art
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
          {thumbnailUrl && (
            <Box
              component="img"
              src={thumbnailUrl}
              alt="Thumbnail"
              sx={{
                width: 200,
                height: 200,
                objectFit: 'cover',
                borderRadius: 1,
                border: 1,
                borderColor: 'divider',
              }}
            />
          )}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Button
              variant="outlined"
              size="small"
              startIcon={imageLoading ? <CircularProgress size={16} /> : <CropIcon />}
              onClick={() => setCropDialogOpen(true)}
              disabled={!thumbnailUrl || imageLoading}
            >
              Crop
            </Button>
            <Button
              variant="outlined"
              size="small"
              startIcon={imageLoading ? <CircularProgress size={16} /> : <ImageIcon />}
              onClick={handleImageSelect}
              disabled={imageLoading}
            >
              Replace
            </Button>
          </Box>
        </Box>
      </Box>
      <ThumbnailCropper
        open={cropDialogOpen}
        imageUrl={thumbnailUrl}
        onClose={() => setCropDialogOpen(false)}
        onCropComplete={handleCropComplete}
      />
    </>
  );
}

export default ThumbnailSection;
