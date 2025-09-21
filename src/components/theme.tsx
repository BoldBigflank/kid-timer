import { createTheme } from '@mui/material/styles'
import type { ThemeOptions } from '@mui/material/styles'

const getDesignTokens = (mode: 'light' | 'dark'): ThemeOptions => ({
  palette: {
    mode,
    primary: {
      main: '#3b82f6', // Blue for primary actions (start button)
      dark: '#2563eb',
    },
    secondary: {
      main: '#10b981', // Green for add time buttons
      dark: '#059669',
    },
    error: {
      main: '#ef4444', // Red for remove time buttons
      dark: '#dc2626',
    },
    warning: {
      main: '#f59e0b', // Orange for pause button
      dark: '#d97706',
    },
    grey: {
      500: '#6b7280', // For reset button
      600: '#4b5563',
    },
    success: {
      main: '#047857', // For sync indicator
      dark: '#065f46',
    },
    background: {
      default: mode === 'light' ? '#ffffff' : '#0f1419',
      paper: mode === 'light' ? '#f8fafc' : '#1a1f2e',
    },
    text: {
      primary: mode === 'light' ? '#111827' : '#f9fafb',
      secondary: mode === 'light' ? '#374151' : '#d1d5db',
    },
  },
  typography: {
    fontFamily: 'system-ui, Avenir, Helvetica, Arial, sans-serif',
    h1: {
      fontSize: '2.5rem',
      fontWeight: 700,
      '@media (max-width:480px)': {
        fontSize: '2rem',
      },
      '@media (max-width:360px)': {
        fontSize: '1.75rem',
      },
      '@media (max-height:600px) and (orientation: landscape)': {
        fontSize: '1.5rem',
      },
    },
    h2: {
      fontSize: '1.5rem',
      fontWeight: 700,
      '@media (max-width:480px)': {
        fontSize: '1.375rem',
      },
    },
    subtitle1: {
      fontSize: '1.125rem',
      '@media (max-width:480px)': {
        fontSize: '1rem',
      },
      '@media (max-width:360px)': {
        fontSize: '0.9rem',
      },
      '@media (max-height:600px) and (orientation: landscape)': {
        fontSize: '0.875rem',
      },
    },
    body2: {
      fontSize: '0.875rem',
      fontWeight: 500,
      '@media (max-width:480px)': {
        fontSize: '0.8rem',
      },
      '@media (max-width:360px)': {
        fontSize: '0.75rem',
      },
      '@media (max-height:600px) and (orientation: landscape)': {
        fontSize: '0.7rem',
      },
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: '0.75rem',
          textTransform: 'none',
          fontWeight: 600,
          minHeight: 44, // iOS minimum touch target
          touchAction: 'manipulation',
          userSelect: 'none',
          transition: 'all 0.2s ease',
        },
        sizeLarge: {
          padding: '1rem 2rem',
          fontSize: '1.125rem',
          minWidth: '5.5rem',
          minHeight: 48,
          borderRadius: '1rem',
          '@media (max-width:480px)': {
            padding: '1rem 1.5rem',
            fontSize: '1rem',
            minWidth: '5rem',
            minHeight: 52,
          },
          '@media (max-width:360px)': {
            padding: '0.875rem 1.25rem',
            fontSize: '0.9rem',
            minWidth: '4.5rem',
          },
        },
        sizeSmall: {
          padding: '0.75rem 1.25rem',
          fontSize: '1rem',
          minWidth: '3.5rem',
          '@media (max-width:480px)': {
            padding: '0.875rem 1rem',
            fontSize: '0.9rem',
            minWidth: '3.25rem',
            minHeight: 48,
          },
          '@media (max-width:360px)': {
            padding: '0.75rem 0.875rem',
            fontSize: '0.875rem',
            minWidth: '3rem',
          },
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: '1rem',
          maxWidth: 400,
          width: '90%',
          '@media (max-width:480px)': {
            width: '95%',
            margin: '1rem',
          },
        },
      },
    },
    MuiDialogTitle: {
      styleOverrides: {
        root: {
          fontSize: '1.5rem',
          fontWeight: 700,
          color: '#111827',
          padding: '1.5rem 1.5rem 1rem 1.5rem',
          '@media (max-width:480px)': {
            fontSize: '1.375rem',
            padding: '1.25rem',
          },
        },
      },
    },
    MuiDialogContent: {
      styleOverrides: {
        root: {
          padding: '1rem 1.5rem 1.5rem 1.5rem',
          '@media (max-width:480px)': {
            padding: '1rem 1.25rem 1.25rem 1.25rem',
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 500,
        },
      },
    },
  },
  breakpoints: {
    values: {
      xs: 0,
      sm: 360,
      md: 480,
      lg: 600,
      xl: 1200,
    },
  },
})

export const lightTheme = createTheme(getDesignTokens('light'))
export const darkTheme = createTheme(getDesignTokens('dark'))

// Function to create theme based on mode
export const createAppTheme = (mode: 'light' | 'dark') => 
  createTheme(getDesignTokens(mode))
