import { createTheme, type Theme } from '@mui/material/styles'

const font =
  "-apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', sans-serif"

function paginationItemSx(mode: 'light' | 'dark') {
  if (mode === 'light') {
    return {
      color: '#64748b',
      border: '1px solid rgba(15,23,42,0.1)',
      background: 'rgba(255,255,255,0.85)',
      '&:hover': {
        background: 'rgba(15,23,42,0.04)',
        borderColor: 'rgba(15,23,42,0.18)',
      },
      '&.Mui-selected': {
        background: 'rgba(91,115,249,0.12)',
        borderColor: 'rgba(91,115,249,0.45)',
        color: '#4f46e5',
        '&:hover': { background: 'rgba(91,115,249,0.18)' },
      },
      '&.Mui-disabled': { opacity: 0.35 },
    }
  }
  return {
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
  }
}

export function createAdminMuiTheme(mode: 'light' | 'dark'): Theme {
  const isLight = mode === 'light'
  return createTheme({
    palette: {
      mode,
      primary: { main: '#5b73f9', light: '#7a8fff', dark: '#4560e8' },
      secondary: { main: '#9b6dff' },
      success: { main: '#22c55e' },
      error: { main: isLight ? '#dc2626' : '#f87171' },
      warning: { main: '#f59e0b' },
      background: {
        default: isLight ? '#f1f4fb' : '#07070d',
        paper: isLight ? 'rgba(255,255,255,0.95)' : 'rgba(18, 18, 28, 0.85)',
      },
      text: {
        primary: isLight ? '#0f172a' : '#eaeaf8',
        secondary: isLight ? '#475569' : '#8a8aaa',
        disabled: isLight ? '#94a3b8' : '#48485e',
      },
      divider: isLight ? 'rgba(15,23,42,0.09)' : 'rgba(255,255,255,0.07)',
    },
    typography: {
      fontFamily: font,
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
          root: paginationItemSx(mode),
        },
      },
      MuiTabs: {
        styleOverrides: {
          root: {
            minHeight: 36,
            background: isLight ? 'rgba(15,23,42,0.04)' : 'rgba(255,255,255,0.03)',
            borderRadius: 10,
            border: isLight
              ? '1px solid rgba(15,23,42,0.08)'
              : '1px solid rgba(255,255,255,0.07)',
            padding: '3px',
          },
          indicator: {
            height: '100%',
            borderRadius: 8,
            background: isLight
              ? 'rgba(91,115,249,0.12)'
              : 'rgba(91,115,249,0.18)',
            border: isLight
              ? '1px solid rgba(91,115,249,0.35)'
              : '1px solid rgba(91,115,249,0.35)',
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
            color: isLight ? '#64748b' : '#8a8aaa',
            textTransform: 'none',
            zIndex: 1,
            letterSpacing: '0.01em',
            transition: 'color 0.15s',
            '&.Mui-selected': {
              color: isLight ? '#0f172a' : '#eaeaf8',
            },
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
}

/** @deprecated use createAdminMuiTheme('dark') */
export const adminTheme = createAdminMuiTheme('dark')
