const ADMIN_AUTH_KEY = 'askly_admin_authed'

export function markAdminAuthenticated(): void {
  try {
    localStorage.setItem(ADMIN_AUTH_KEY, '1')
  } catch {
    /* ignore */
  }
}

export function isAdminAuthenticated(): boolean {
  try {
    return localStorage.getItem(ADMIN_AUTH_KEY) === '1'
  } catch {
    return false
  }
}

export function clearAdminAuthenticated(): void {
  try {
    localStorage.removeItem(ADMIN_AUTH_KEY)
  } catch {
    /* ignore */
  }
}
