const FALLBACK = 'http://localhost:3001'

function trimBase(s: string): string {
  return s.replace(/\/+$/, '')
}

const raw = import.meta.env.VITE_API_URL as string | undefined

function resolvePublicBase(): string {
  const fromEnv = raw?.trim()
  if (fromEnv) return trimBase(fromEnv)
  if (import.meta.env.PROD) return ''
  return trimBase(FALLBACK)
}

export const API_BASE_URL = resolvePublicBase()

export function isProductionApiMisconfigured(): boolean {
  if (!import.meta.env.PROD) return false
  const v = raw?.trim()
  if (!v) return false
  try {
    const u = new URL(v)
    return u.hostname === 'localhost' || u.hostname === '127.0.0.1'
  } catch {
    return true
  }
}
