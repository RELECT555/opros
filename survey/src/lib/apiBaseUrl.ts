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
 * Non-null in production when VITE_API_URL is missing, invalid, or localhost.
 * API is always a separate origin from the static site; empty base would hit wrong host.
 * Bad strings also make Safari throw: "The string did not match the expected pattern."
 */
export function productionApiUrlWarning(): string | null {
  if (!import.meta.env.PROD) return null
  const v = raw?.trim()
  if (!v) {
    return (
      'Задайте при сборке фронта VITE_API_URL — полный HTTPS-адрес отдельного сервера API (корень, без /api), затем пересоберите. Сайт и API на разных хостах: без этого запросы уйдут не туда.'
    )
  }
  const base = sanitizeApiBase(v)
  if (!isValidHttpUrlBase(base)) {
    return (
      'VITE_API_URL не является корректным URL: полный адрес с https://, без пробелов и кавычек ' +
      '(иначе Safari может показать «The string did not match the expected pattern»). Пример: https://api.example.com'
    )
  }
  try {
    const u = new URL(base)
    if (u.hostname === 'localhost' || u.hostname === '127.0.0.1') {
      return (
        'В VITE_API_URL для продакшена указан localhost — укажите публичный HTTPS-адрес отдельного бэкенда в переменных сборки и пересоберите фронт.'
      )
    }
  } catch {
    return (
      'VITE_API_URL не удаётся разобрать как URL. Одна строка https://… без лишних символов.'
    )
  }
  return null
}

export function isProductionApiMisconfigured(): boolean {
  return productionApiUrlWarning() !== null
}
