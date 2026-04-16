const FALLBACK = 'http://localhost:3001'

function trimBase(s: string): string {
  return s.replace(/\/+$/, '')
}

const raw = import.meta.env.VITE_API_URL as string | undefined

/** Strip wrapping quotes often pasted into .env by mistake. */
function sanitizeApiBase(s: string): string {
  let t = s.trim()
  if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))) {
    t = t.slice(1, -1).trim()
  }
  return trimBase(t)
}

function isValidHttpUrlBase(s: string): boolean {
  if (!s) return false
  try {
    const u = new URL(s)
    return u.protocol === 'http:' || u.protocol === 'https:'
  } catch {
    return false
  }
}

function resolvePublicBase(): string {
  const fromEnv = raw?.trim()
  if (fromEnv) {
    const base = sanitizeApiBase(fromEnv)
    if (!isValidHttpUrlBase(base)) {
      console.error(
        '[Askly] VITE_API_URL is not a valid absolute http(s) URL. Example: https://api.example.com — no spaces, no stray quotes.',
      )
      return ''
    }
    return base
  }
  if (import.meta.env.PROD) return ''
  return trimBase(FALLBACK)
}

export const API_BASE_URL = resolvePublicBase()

/**
 * Non-null only when VITE_API_URL is explicitly set but broken (not a valid URL, or localhost in prod).
 * Empty VITE_API_URL is fine — requests will go to same origin (Vercel rewrites / proxy).
 */
export function productionApiUrlWarning(): string | null {
  if (!import.meta.env.PROD) return null
  const v = raw?.trim()
  if (!v) return null
  const base = sanitizeApiBase(v)
  if (!isValidHttpUrlBase(base)) {
    return (
      'VITE_API_URL не является корректным URL: полный адрес с https://, без пробелов и кавычек. Пример: https://api.example.com'
    )
  }
  try {
    const u = new URL(base)
    if (u.hostname === 'localhost' || u.hostname === '127.0.0.1') {
      return (
        'В VITE_API_URL для продакшена указан localhost — укажите публичный HTTPS-адрес.'
      )
    }
  } catch {
    return 'VITE_API_URL не удаётся разобрать как URL.'
  }
  return null
}

export function isProductionApiMisconfigured(): boolean {
  return productionApiUrlWarning() !== null
}
