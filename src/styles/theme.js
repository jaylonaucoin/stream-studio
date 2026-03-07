import { createTheme } from '@mui/material/styles';

const getPalette = (mode) => ({
  mode,
  primary: {
    main: '#dc2626',
    light: '#ef4444',
    dark: '#b91c1c',
  },
  secondary: {
    main: '#991b1b',
    light: '#dc2626',
    dark: '#7f1d1d',
  },
  error: {
    main: '#ef4444',
    light: '#f87171',
    dark: '#dc2626',
  },
  success: {
    main: '#16a34a',
    light: '#22c55e',
    dark: '#15803d',
  },
  ...(mode === 'dark'
    ? {
        background: {
          default: '#1a1a1a',
          paper: '#242424',
        },
        text: {
          primary: '#ffffff',
          secondary: '#b3b3b3',
        },
        divider: '#333333',
      }
    : {
        background: {
          default: '#f5f5f5',
          paper: '#ffffff',
        },
        text: {
          primary: '#1a1a1a',
          secondary: '#666666',
        },
        divider: '#e0e0e0',
      }),
});

const getComponents = (mode) => ({
  MuiButton: {
    styleOverrides: {
      root: {
        textTransform: 'none',
        fontWeight: 500,
        transition: 'all 0.2s ease-in-out',
      },
    },
  },
  MuiCard: {
    styleOverrides: {
      root: {
        boxShadow: mode === 'dark' ? '0 2px 8px rgba(220, 38, 38, 0.2)' : '0 2px 8px rgba(0,0,0,0.08)',
        backgroundColor: mode === 'dark' ? '#242424' : '#ffffff',
        transition: 'all 0.2s ease-in-out',
      },
    },
  },
  MuiAppBar: {
    styleOverrides: {
      root: {
        backgroundColor: mode === 'dark' ? '#1f1f1f' : '#ffffff',
        borderBottom: mode === 'dark' ? '1px solid #333333' : '1px solid #e0e0e0',
        color: mode === 'dark' ? '#ffffff' : '#1a1a1a',
      },
    },
  },
  MuiPaper: {
    styleOverrides: {
      root: {
        backgroundColor: mode === 'dark' ? '#242424' : '#ffffff',
      },
    },
  },
  MuiAccordion: {
    styleOverrides: {
      root: {
        backgroundColor: mode === 'dark' ? '#242424' : '#ffffff',
        '&:before': {
          backgroundColor: mode === 'dark' ? '#333333' : '#e0e0e0',
        },
      },
    },
  },
});

/**
 * Get MUI theme for the given mode
 * @param {'dark'|'light'} mode - Theme mode
 * @returns {Object} MUI theme object
 */
export function getTheme(mode = 'dark') {
  return createTheme({
    palette: getPalette(mode),
    typography: {
      fontFamily: [
        '-apple-system',
        'BlinkMacSystemFont',
        '"Segoe UI"',
        'Roboto',
        '"Helvetica Neue"',
        'Arial',
        'sans-serif',
      ].join(','),
      h4: { fontWeight: 600 },
      h5: { fontWeight: 600 },
      h6: { fontWeight: 600 },
    },
    shape: { borderRadius: 8 },
    components: getComponents(mode),
  });
}

// Default export for backward compatibility
const theme = getTheme('dark');
export default theme;
