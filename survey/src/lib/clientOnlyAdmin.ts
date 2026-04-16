import { ADMIN_JWT_STORAGE_KEY } from './adminSession'

export const CLIENT_ONLY_TOKEN = '__askly_client_only_v1__'

const BUILTIN_ADMIN_PASSWORD = 'admin2026'

export function passwordMatchesClientOnly(password: string): boolean {
  return password === BUILTIN_ADMIN_PASSWORD
}

export function readClientOnlyMe(): { auth: 'password_admin' } | null {
  try {
    const t = localStorage.getItem(ADMIN_JWT_STORAGE_KEY)
    if (t === CLIENT_ONLY_TOKEN) return { auth: 'password_admin' }
  } catch {
    /* ignore */
  }
  return null
}
