import { createTheme } from '@mui/material/styles'

export const adminTheme = createTheme({
  palette: {
    mode: 'dark',
    primary:   { main: '#5b73f9', light: '#7a8fff', dark: '#4560e8' },
    secondary: { main: '#9b6dff' },
    success:   { main: '#22c55e' },
    error:     { main: '#f87171' },
    warning:   { main: '#f59e0b' },
    background: {
      default: '#07070d',
      paper:   'rgba(18, 18, 28, 0.85)',
    },
    text: {
      primary:   '#eaeaf8',
      secondary: '#8a8aaa',
      disabled:  '#48485e',
    },
    divider: 'rgba(255,255,255,0.07)',
  },
  typography: {
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', sans-serif",
    fontSize: 13,
  },
  shape: { borderRadius: 10 },
  components: {
    MuiPagination: {
      styleOverrides: {
        root: { display: 'flex', justifyContent: 'center', marginTop: 20 },
      },
    },
    MuiPaginationItem: {
      styleOverrides: {
        root: {
          color: '#8a8aaa',
          border: '1px solid rgba(255,255,255,0.07)',
          background: 'rgba(255,255,255,0.03)',
          '&:hover': {
            background: 'rgba(255,255,255,0.07)',
            borderColor: 'rgba(255,255,255,0.15)',
          },
          '&.Mui-selected': {
            background: 'rgba(91,115,249,0.2)',
            borderColor: 'rgba(91,115,249,0.5)',
            color: '#7a8fff',
            '&:hover': { background: 'rgba(91,115,249,0.28)' },
          },
          '&.Mui-disabled': { opacity: 0.3 },
        },
      },
    },
    MuiTabs: {
      styleOverrides: {
        root: {
          minHeight: 36,
          background: 'rgba(255,255,255,0.03)',
          borderRadius: 10,
          border: '1px solid rgba(255,255,255,0.07)',
          padding: '3px',
        },
        indicator: {
          height: '100%',
          borderRadius: 8,
          background: 'rgba(91,115,249,0.18)',
          border: '1px solid rgba(91,115,249,0.35)',
          zIndex: 0,
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          minHeight: 30,
          padding: '4px 14px',
          fontSize: 12,
          fontWeight: 600,
          color: '#8a8aaa',
          textTransform: 'none',
          zIndex: 1,
          letterSpacing: '0.01em',
          transition: 'color 0.15s',
          '&.Mui-selected': { color: '#eaeaf8' },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontSize: 11,
          fontWeight: 600,
          height: 22,
          letterSpacing: '0.02em',
        },
      },
    },
  },
})
