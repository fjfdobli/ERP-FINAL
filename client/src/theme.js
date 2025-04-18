import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2', 
      light: '#4791db',
      dark: '#115293',
      contrastText: '#fff',
    },
    secondary: {
      main: '#dc004e', 
      light: '#e33371',
      dark: '#9a0036',
      contrastText: '#fff',
    },
    background: {
      default: '#f5f7fa', 
      paper: '#ffffff',
    },
    text: {
      primary: '#2a3241', 
      secondary: '#5f6b7c',
    },
    error: {
      main: '#d32f2f',
    },
    warning: {
      main: '#f57c00',
    },
    info: {
      main: '#0288d1',
    },
    success: {
      main: '#388e3c',
    },
  },
  typography: {
    fontFamily: '"Segoe UI", "Roboto", "Helvetica Neue", sans-serif',
    fontSize: 14,
    h1: {
      fontSize: '2.5rem',
      fontWeight: 600,
    },
    h2: {
      fontSize: '2rem',
      fontWeight: 600,
    },
    h3: {
      fontSize: '1.75rem',
      fontWeight: 600,
    },
    h4: {
      fontSize: '1.5rem',
      fontWeight: 600,
    },
    h5: {
      fontSize: '1.25rem',
      fontWeight: 600,
    },
    h6: {
      fontSize: '1rem',
      fontWeight: 600,
    },
    button: {
      textTransform: 'none', 
      fontWeight: 500,
    },
  },
  shape: {
    borderRadius: 8, 
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          padding: '8px 16px',
          boxShadow: 'none',
          '&:hover': {
            boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.2)',
          },
        },
        contained: {
          boxShadow: '0px 1px 2px rgba(0, 0, 0, 0.1)',
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            '& fieldset': {
              borderColor: '#dce0e6',
            },
            '&:hover fieldset': {
              borderColor: '#1976d2',
            },
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.05)',
          borderRadius: 12,
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.05)',
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        head: {
          fontWeight: 600,
          backgroundColor: '#f5f7fa',
        },
      },
    },
  },
});

export default theme;