/** Показывать модалку приветствия при входе в админку (локально в браузере). */
export const ADMIN_WELCOME_AUTOSHOW_KEY = 'askly_admin_welcome_autoshow'

export const ADMIN_WELCOME_AUTOSHOW_EVENT = 'askly-admin-welcome-autoshow'

export function getAdminWelcomeAutoshow(): boolean {
  try {
    return localStorage.getItem(ADMIN_WELCOME_AUTOSHOW_KEY) !== '0'
  } catch {
    return true
  }
}

export function setAdminWelcomeAutoshow(enabled: boolean): void {
  try {
    localStorage.setItem(ADMIN_WELCOME_AUTOSHOW_KEY, enabled ? '1' : '0')
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new CustomEvent(ADMIN_WELCOME_AUTOSHOW_EVENT))
}
