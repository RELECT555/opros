import { useEffect } from 'react'

/** HTTP polling works with OAuth and with the hosted API, where WebSocket is unavailable. */
export function useAdminRefresh(refresh: (isCurrent: () => boolean, background: boolean) => Promise<void>) {
  useEffect(() => {
    let active = true
    let busy = false
    const run = async (background: boolean) => {
      if (!active || busy || (background && document.hidden)) return
      busy = true
      try { await refresh(() => active, background) } finally { busy = false }
    }
    void Promise.resolve().then(() => run(false))
    const timer = setInterval(() => { void run(true) }, 15_000)
    const onFocus = () => { void run(true) }
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onFocus)
    return () => {
      active = false
      clearInterval(timer)
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onFocus)
    }
  }, [refresh])
}
