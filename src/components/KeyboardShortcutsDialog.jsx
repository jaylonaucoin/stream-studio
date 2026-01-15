import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Divider,
  IconButton,
  List,
  ListItem,
  ListItemText,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import KeyboardIcon from '@mui/icons-material/Keyboard';

const SHORTCUTS = [
  {
    category: 'General',
    items: [
      { keys: ['Enter'], description: 'Start conversion' },
      { keys: ['Escape'], description: 'Cancel conversion' },
      { keys: ['Ctrl', 'V'], description: 'Paste URL from clipboard' },
      { keys: ['Ctrl', 'K'], description: 'Show keyboard shortcuts' },
    ],
  },
  {
    category: 'Navigation',
    items: [
      { keys: ['Ctrl', 'H'], description: 'Open history panel' },
      { keys: ['Ctrl', 'Q'], description: 'Open queue panel' },
      { keys: ['Ctrl', ','], description: 'Open settings' },
    ],
  },
];

function KeyboardShortcutsDialog({ open, onClose }) {
  const getKeyLabel = (key) => {
    const labels = {
      Ctrl: 'Ctrl',
      Cmd: '⌘',
      Shift: 'Shift',
      Alt: 'Alt',
      Enter: 'Enter',
      Escape: 'Esc',
    };
    return labels[key] || key;
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: { borderRadius: 2 },
      }}
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <KeyboardIcon />
            <Typography variant="h6">Keyboard Shortcuts</Typography>
          </Box>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {SHORTCUTS.map((category, idx) => (
            <Box key={category.category}>
              <Typography
                variant="subtitle2"
                color="text.secondary"
                gutterBottom
                sx={{ fontWeight: 600 }}
              >
                {category.category}
              </Typography>
              <List dense>
                {category.items.map((item, itemIdx) => (
                  <ListItem key={itemIdx} sx={{ px: 0 }}>
                    <ListItemText
                      primary={item.description}
                      primaryTypographyProps={{ variant: 'body2' }}
                    />
                    <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
                      {item.keys.map((key, keyIdx) => (
                        <Box key={keyIdx}>
                          <Box
                            component="kbd"
                            sx={{
                              display: 'inline-block',
                              px: 1,
                              py: 0.5,
                              bgcolor: 'background.paper',
                              border: 1,
                              borderColor: 'divider',
                              borderRadius: 1,
                              fontSize: '0.75rem',
                              fontFamily: 'monospace',
                              minWidth: 24,
                              textAlign: 'center',
                            }}
                          >
                            {getKeyLabel(key)}
                          </Box>
                          {keyIdx < item.keys.length - 1 && (
                            <Typography
                              component="span"
                              variant="body2"
                              sx={{ mx: 0.5, color: 'text.secondary' }}
                            >
                              +
                            </Typography>
                          )}
                        </Box>
                      ))}
                    </Box>
                  </ListItem>
                ))}
              </List>
              {idx < SHORTCUTS.length - 1 && <Divider sx={{ mt: 2 }} />}
            </Box>
          ))}
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} variant="contained">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default KeyboardShortcutsDialog;
