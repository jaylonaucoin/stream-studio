import { createTheme, alpha } from '@mui/material/styles';

// Modern color palette - softer, more refined
const colors = {
  // Primary: Warm coral red (softer than pure red)
  primary: {
    main: '#e53935',
    light: '#ff6f60',
    dark: '#ab000d',
    contrastText: '#ffffff',
  },
  // Secondary: Deep purple for accents
  secondary: {
    main: '#7c4dff',
    light: '#b47cff',
    dark: '#3f1dcb',
    contrastText: '#ffffff',
  },
  // Success: Vibrant green
  success: {
    main: '#00c853',
    light: '#5efc82',
    dark: '#009624',
    contrastText: '#000000',
  },
  // Error: Soft red
  error: {
    main: '#ff5252',
    light: '#ff867f',
    dark: '#c50e29',
    contrastText: '#ffffff',
  },
  // Warning: Amber
  warning: {
    main: '#ffc107',
    light: '#fff350',
    dark: '#c79100',
    contrastText: '#000000',
  },
  // Info: Cyan
  info: {
    main: '#00bcd4',
    light: '#62efff',
    dark: '#008ba3',
    contrastText: '#000000',
  },
  // Background colors - rich dark with subtle warmth
  background: {
    default: '#121218',
    paper: '#1a1a24',
    elevated: '#222230',
    card: '#1e1e2a',
  },
  // Text colors
  text: {
    primary: '#f5f5f7',
    secondary: '#a1a1aa',
    disabled: '#52525b',
  },
  // Divider
  divider: '#2d2d3a',
  // Gradients
  gradients: {
    primary: 'linear-gradient(135deg, #e53935 0%, #ab000d 100%)',
    secondary: 'linear-gradient(135deg, #7c4dff 0%, #3f1dcb 100%)',
    success: 'linear-gradient(135deg, #00c853 0%, #009624 100%)',
    dark: 'linear-gradient(180deg, #1a1a24 0%, #121218 100%)',
    glass: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)',
    glow: 'radial-gradient(ellipse at center, rgba(229, 57, 53, 0.15) 0%, transparent 70%)',
  },
};

// Custom scrollbar styles
const scrollbarStyles = {
  '&::-webkit-scrollbar': {
    width: '8px',
    height: '8px',
  },
  '&::-webkit-scrollbar-track': {
    background: colors.background.default,
    borderRadius: '4px',
  },
  '&::-webkit-scrollbar-thumb': {
    background: colors.divider,
    borderRadius: '4px',
    '&:hover': {
      background: alpha(colors.primary.main, 0.5),
    },
  },
};

// Animation keyframes (as CSS strings for use in sx prop)
export const keyframes = {
  pulse: `
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }
  `,
  shimmer: `
    @keyframes shimmer {
      0% { background-position: -200% 0; }
      100% { background-position: 200% 0; }
    }
  `,
  glow: `
    @keyframes glow {
      0%, 100% { box-shadow: 0 0 5px rgba(229, 57, 53, 0.3), 0 0 10px rgba(229, 57, 53, 0.2); }
      50% { box-shadow: 0 0 15px rgba(229, 57, 53, 0.5), 0 0 30px rgba(229, 57, 53, 0.3); }
    }
  `,
  fadeIn: `
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }
  `,
  scaleIn: `
    @keyframes scaleIn {
      from { opacity: 0; transform: scale(0.9); }
      to { opacity: 1; transform: scale(1); }
    }
  `,
  slideInRight: `
    @keyframes slideInRight {
      from { opacity: 0; transform: translateX(20px); }
      to { opacity: 1; transform: translateX(0); }
    }
  `,
  bounce: `
    @keyframes bounce {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-5px); }
    }
  `,
};

// Export colors for use in components
export { colors };

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: colors.primary,
    secondary: colors.secondary,
    success: colors.success,
    error: colors.error,
    warning: colors.warning,
    info: colors.info,
    background: {
      default: colors.background.default,
      paper: colors.background.paper,
    },
    text: colors.text,
    divider: colors.divider,
  },
  typography: {
    fontFamily: [
      'Inter',
      '-apple-system',
      'BlinkMacSystemFont',
      '"Segoe UI"',
      'Roboto',
      '"Helvetica Neue"',
      'Arial',
      'sans-serif',
    ].join(','),
    h4: {
      fontWeight: 700,
      letterSpacing: '-0.02em',
    },
    h5: {
      fontWeight: 600,
      letterSpacing: '-0.01em',
    },
    h6: {
      fontWeight: 600,
      letterSpacing: '-0.01em',
    },
    subtitle1: {
      fontWeight: 500,
    },
    subtitle2: {
      fontWeight: 600,
      textTransform: 'uppercase',
      letterSpacing: '0.05em',
      fontSize: '0.75rem',
    },
    body1: {
      lineHeight: 1.6,
    },
    body2: {
      lineHeight: 1.5,
    },
    button: {
      fontWeight: 600,
      letterSpacing: '0.02em',
    },
  },
  shape: {
    borderRadius: 12,
  },
  shadows: [
    'none',
    '0 2px 4px rgba(0,0,0,0.2)',
    '0 4px 8px rgba(0,0,0,0.25)',
    '0 6px 12px rgba(0,0,0,0.3)',
    '0 8px 16px rgba(0,0,0,0.35)',
    '0 10px 20px rgba(0,0,0,0.4)',
    '0 12px 24px rgba(0,0,0,0.45)',
    '0 14px 28px rgba(0,0,0,0.5)',
    '0 16px 32px rgba(0,0,0,0.55)',
    '0 18px 36px rgba(0,0,0,0.6)',
    '0 20px 40px rgba(0,0,0,0.65)',
    '0 22px 44px rgba(0,0,0,0.7)',
    '0 24px 48px rgba(0,0,0,0.75)',
    // Add glow shadows for special effects
    '0 0 20px rgba(229, 57, 53, 0.3)',
    '0 0 30px rgba(229, 57, 53, 0.4)',
    '0 0 40px rgba(229, 57, 53, 0.5)',
    '0 0 20px rgba(0, 200, 83, 0.3)',
    '0 0 30px rgba(0, 200, 83, 0.4)',
    '0 0 40px rgba(0, 200, 83, 0.5)',
    '0 4px 20px rgba(0,0,0,0.5)',
    '0 8px 32px rgba(0,0,0,0.6)',
    '0 12px 48px rgba(0,0,0,0.7)',
    '0 16px 64px rgba(0,0,0,0.8)',
    '0 20px 80px rgba(0,0,0,0.9)',
    '0 24px 96px rgba(0,0,0,1)',
  ],
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        // Global scrollbar styles
        '*': {
          ...scrollbarStyles,
        },
        body: {
          background: colors.background.default,
          // Add subtle noise texture (optional)
          backgroundImage: `
            radial-gradient(ellipse at top, ${alpha(colors.primary.main, 0.03)} 0%, transparent 50%),
            radial-gradient(ellipse at bottom right, ${alpha(colors.secondary.main, 0.02)} 0%, transparent 50%)
          `,
          minHeight: '100vh',
        },
        // Smooth scrolling
        html: {
          scrollBehavior: 'smooth',
        },
        // Selection color
        '::selection': {
          backgroundColor: alpha(colors.primary.main, 0.3),
          color: colors.text.primary,
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
          borderRadius: 10,
          padding: '10px 20px',
          transition: 'all 0.2s ease-in-out',
          '&:hover': {
            transform: 'translateY(-1px)',
          },
          '&:active': {
            transform: 'translateY(0)',
          },
        },
        contained: {
          boxShadow: '0 4px 14px rgba(0,0,0,0.3)',
          '&:hover': {
            boxShadow: '0 6px 20px rgba(0,0,0,0.4)',
          },
        },
        containedPrimary: {
          background: colors.gradients.primary,
          '&:hover': {
            background: colors.gradients.primary,
            filter: 'brightness(1.1)',
          },
        },
        containedSuccess: {
          background: colors.gradients.success,
          '&:hover': {
            background: colors.gradients.success,
            filter: 'brightness(1.1)',
          },
        },
        outlined: {
          borderWidth: '1.5px',
          '&:hover': {
            borderWidth: '1.5px',
            backgroundColor: alpha(colors.primary.main, 0.08),
          },
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          transition: 'all 0.2s ease-in-out',
          '&:hover': {
            backgroundColor: alpha(colors.primary.main, 0.1),
            transform: 'scale(1.05)',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundColor: colors.background.card,
          backgroundImage: colors.gradients.glass,
          backdropFilter: 'blur(10px)',
          border: `1px solid ${alpha(colors.divider, 0.5)}`,
          boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
          transition: 'all 0.2s ease-in-out',
          '&:hover': {
            boxShadow: '0 8px 30px rgba(0,0,0,0.4)',
            borderColor: alpha(colors.primary.main, 0.3),
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundColor: colors.background.paper,
          backgroundImage: 'none',
        },
        elevation1: {
          boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
        },
        elevation2: {
          boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
        },
        elevation3: {
          boxShadow: '0 6px 24px rgba(0,0,0,0.3)',
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: alpha(colors.background.paper, 0.8),
          backdropFilter: 'blur(20px)',
          borderBottom: `1px solid ${colors.divider}`,
          boxShadow: '0 4px 30px rgba(0,0,0,0.3)',
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundColor: colors.background.paper,
          backgroundImage: `linear-gradient(180deg, ${colors.background.elevated} 0%, ${colors.background.paper} 100%)`,
          borderLeft: `1px solid ${colors.divider}`,
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          backgroundColor: colors.background.elevated,
          backgroundImage: colors.gradients.glass,
          border: `1px solid ${colors.divider}`,
          boxShadow: '0 24px 48px rgba(0,0,0,0.5)',
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            backgroundColor: alpha(colors.background.default, 0.5),
            transition: 'all 0.2s ease-in-out',
            '&:hover': {
              backgroundColor: alpha(colors.background.default, 0.7),
            },
            '&.Mui-focused': {
              backgroundColor: alpha(colors.background.default, 0.7),
              boxShadow: `0 0 0 3px ${alpha(colors.primary.main, 0.2)}`,
            },
            '& fieldset': {
              borderColor: colors.divider,
              transition: 'all 0.2s ease-in-out',
            },
            '&:hover fieldset': {
              borderColor: alpha(colors.primary.main, 0.5),
            },
            '&.Mui-focused fieldset': {
              borderColor: colors.primary.main,
              borderWidth: '2px',
            },
          },
        },
      },
    },
    MuiSelect: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-notchedOutline': {
            borderColor: colors.divider,
            transition: 'all 0.2s ease-in-out',
          },
          '&:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: alpha(colors.primary.main, 0.5),
          },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderColor: colors.primary.main,
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 500,
          transition: 'all 0.2s ease-in-out',
        },
        filled: {
          '&:hover': {
            transform: 'scale(1.02)',
          },
        },
        outlined: {
          borderColor: colors.divider,
          '&:hover': {
            borderColor: alpha(colors.primary.main, 0.5),
            backgroundColor: alpha(colors.primary.main, 0.08),
          },
        },
        colorPrimary: {
          background: colors.gradients.primary,
        },
        colorSuccess: {
          background: colors.gradients.success,
        },
      },
    },
    MuiLinearProgress: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          backgroundColor: alpha(colors.primary.main, 0.15),
          overflow: 'hidden',
        },
        bar: {
          borderRadius: 8,
          background: colors.gradients.primary,
        },
      },
    },
    MuiAccordion: {
      styleOverrides: {
        root: {
          backgroundColor: colors.background.paper,
          border: `1px solid ${colors.divider}`,
          '&:before': {
            display: 'none',
          },
          '&.Mui-expanded': {
            margin: 0,
            boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
          },
        },
      },
    },
    MuiAccordionSummary: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          transition: 'all 0.2s ease-in-out',
          '&:hover': {
            backgroundColor: alpha(colors.primary.main, 0.05),
          },
        },
      },
    },
    MuiToggleButton: {
      styleOverrides: {
        root: {
          borderColor: colors.divider,
          color: colors.text.secondary,
          fontWeight: 600,
          transition: 'all 0.2s ease-in-out',
          '&:hover': {
            backgroundColor: alpha(colors.primary.main, 0.1),
            borderColor: alpha(colors.primary.main, 0.3),
          },
          '&.Mui-selected': {
            backgroundColor: alpha(colors.primary.main, 0.2),
            borderColor: colors.primary.main,
            color: colors.primary.light,
            '&:hover': {
              backgroundColor: alpha(colors.primary.main, 0.3),
            },
          },
        },
      },
    },
    MuiToggleButtonGroup: {
      styleOverrides: {
        root: {
          backgroundColor: alpha(colors.background.default, 0.5),
          borderRadius: 12,
          padding: 4,
          gap: 4,
        },
        grouped: {
          border: 'none !important',
          borderRadius: '8px !important',
          margin: 0,
        },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          backgroundColor: colors.background.elevated,
          color: colors.text.primary,
          fontSize: '0.8125rem',
          fontWeight: 500,
          padding: '8px 14px',
          borderRadius: 8,
          border: `1px solid ${colors.divider}`,
          boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
        },
        arrow: {
          color: colors.background.elevated,
          '&::before': {
            border: `1px solid ${colors.divider}`,
          },
        },
      },
    },
    MuiBadge: {
      styleOverrides: {
        badge: {
          fontWeight: 700,
          fontSize: '0.7rem',
        },
        colorError: {
          background: colors.gradients.primary,
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          border: '1px solid',
        },
        standardWarning: {
          backgroundColor: alpha(colors.warning.main, 0.1),
          borderColor: alpha(colors.warning.main, 0.3),
        },
        standardError: {
          backgroundColor: alpha(colors.error.main, 0.1),
          borderColor: alpha(colors.error.main, 0.3),
        },
        standardInfo: {
          backgroundColor: alpha(colors.info.main, 0.1),
          borderColor: alpha(colors.info.main, 0.3),
        },
        standardSuccess: {
          backgroundColor: alpha(colors.success.main, 0.1),
          borderColor: alpha(colors.success.main, 0.3),
        },
      },
    },
    MuiListItem: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          transition: 'all 0.2s ease-in-out',
        },
      },
    },
    MuiDivider: {
      styleOverrides: {
        root: {
          borderColor: colors.divider,
        },
      },
    },
    MuiSlider: {
      styleOverrides: {
        root: {
          '& .MuiSlider-thumb': {
            boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
            '&:hover, &.Mui-focusVisible': {
              boxShadow: `0 0 0 8px ${alpha(colors.primary.main, 0.2)}`,
            },
          },
          '& .MuiSlider-track': {
            background: colors.gradients.primary,
            border: 'none',
          },
          '& .MuiSlider-rail': {
            backgroundColor: colors.divider,
          },
        },
      },
    },
    MuiSwitch: {
      styleOverrides: {
        root: {
          '& .MuiSwitch-switchBase.Mui-checked': {
            '& + .MuiSwitch-track': {
              background: colors.gradients.primary,
              opacity: 1,
            },
          },
        },
        track: {
          backgroundColor: colors.divider,
        },
      },
    },
  },
});

export default theme;
