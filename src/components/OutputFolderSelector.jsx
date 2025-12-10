import { Box, Typography, Button, Tooltip, Chip } from '@mui/material';
import FolderIcon from '@mui/icons-material/Folder';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';

function OutputFolderSelector({ folder, onChange }) {
  const truncatePath = (path, maxLength = 200) => {
    if (path.length <= maxLength) return path;
    const parts = path.split(/[/\\]/);
    if (parts.length <= 2) {
      return path.length > maxLength ? '...' + path.slice(-maxLength + 3) : path;
    }
    return '...' + parts.slice(-2).join('/');
  };

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexGrow: 1, minWidth: 0 }}>
        <FolderIcon color="action" />
        <Typography variant="body2" color="text.secondary" sx={{ mr: 1 }}>
          Output:
        </Typography>
        <Tooltip title={folder} arrow>
          <Chip
            label={truncatePath(folder)}
            icon={<FolderOpenIcon />}
            variant="outlined"
            sx={{
              maxWidth: '100%',
              '& .MuiChip-label': {
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              },
            }}
          />
        </Tooltip>
      </Box>
      <Button size="small" variant="outlined" startIcon={<FolderOpenIcon />} onClick={onChange}>
        Choose Folder
      </Button>
    </Box>
  );
}

export default OutputFolderSelector;
