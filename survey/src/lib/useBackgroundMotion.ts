import { useSyncExternalStore } from 'react'

const STORAGE_KEY = 'askly_background_motion'
const CHANGE_EVENT = 'askly-background-motion-change'
let sessionOverride: boolean | undefined

function snapshot(): boolean {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved === 'on' || saved === 'off') return saved === 'on'
  } catch { /* The in-memory preference also works when storage is unavailable. */ }
  if (sessionOverride !== undefined) return sessionOverride
  return !window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function subscribe(onChange: () => void) {
  const media = window.matchMedia('(prefers-reduced-motion: reduce)')
  window.addEventListener(CHANGE_EVENT, onChange)
  window.addEventListener('storage', onChange)
  media.addEventListener('change', onChange)
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange)
    window.removeEventListener('storage', onChange)
    media.removeEventListener('change', onChange)
  }
}

export function useBackgroundMotion() {
  const enabled = useSyncExternalStore(subscribe, snapshot, () => false)
  function setEnabled(next: boolean) {
    sessionOverride = next
    try { localStorage.setItem(STORAGE_KEY, next ? 'on' : 'off') } catch { /* Keep session preference. */ }
    window.dispatchEvent(new Event(CHANGE_EVENT))
  }
  return [enabled, setEnabled] as const
}
