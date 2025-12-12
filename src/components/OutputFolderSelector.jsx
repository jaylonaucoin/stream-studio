import { Box, Typography, Button, Tooltip, alpha } from '@mui/material';
import DriveFileMoveIcon from '@mui/icons-material/DriveFileMove';
import StorageIcon from '@mui/icons-material/Storage';
import { colors } from '../styles/theme';

function OutputFolderSelector({ folder, onChange }) {
  const truncatePath = (path, maxLength = 50) => {
    if (!path) return 'Not set';
    if (path.length <= maxLength) return path;

    const parts = path.split(/[/\\]/);
    if (parts.length <= 2) {
      return path.length > maxLength ? '...' + path.slice(-maxLength + 3) : path;
    }

    // Show first folder and last 2 folders
    const start = parts[0];
    const end = parts.slice(-2).join('/');

    if ((start + '/.../' + end).length > maxLength) {
      return '...' + parts.slice(-2).join('/');
    }

    return start + '/.../' + end;
  };

  // Extract folder name for display
  const getFolderName = (path) => {
    if (!path) return 'Not set';
    const parts = path.split(/[/\\]/);
    return parts[parts.length - 1] || parts[parts.length - 2] || path;
  };

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        flexWrap: 'wrap',
      }}
    >
      {/* Output Info */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          flexGrow: 1,
          minWidth: 0,
        }}
      >
        {/* Icon */}
        <Box
          sx={{
            width: 40,
            height: 40,
            borderRadius: 1.5,
            bgcolor: alpha(colors.primary.main, 0.1),
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <StorageIcon sx={{ fontSize: 22, color: 'primary.main' }} />
        </Box>

        {/* Path Info */}
        <Box sx={{ minWidth: 0, flexGrow: 1 }}>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{
              display: 'block',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              fontWeight: 600,
              fontSize: '0.65rem',
              mb: 0.25,
            }}
          >
            Output Folder
          </Typography>
          <Tooltip title={folder} arrow placement="top">
            <Typography
              variant="body2"
              fontWeight={500}
              sx={{
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                cursor: 'default',
              }}
            >
              {getFolderName(folder)}
            </Typography>
          </Tooltip>
          <Tooltip title={folder} arrow placement="bottom">
            <Typography
              variant="caption"
              color="text.disabled"
              sx={{
                display: 'block',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                fontSize: '0.7rem',
                cursor: 'default',
              }}
            >
              {truncatePath(folder)}
            </Typography>
          </Tooltip>
        </Box>
      </Box>

      {/* Change Button */}
      <Button
        size="small"
        variant="outlined"
        startIcon={<DriveFileMoveIcon />}
        onClick={onChange}
        sx={{
          borderColor: colors.divider,
          color: 'text.secondary',
          px: 2,
          '&:hover': {
            borderColor: alpha(colors.primary.main, 0.5),
            bgcolor: alpha(colors.primary.main, 0.08),
            color: 'text.primary',
          },
        }}
      >
        Change
      </Button>
    </Box>
  );
}

export default OutputFolderSelector;
