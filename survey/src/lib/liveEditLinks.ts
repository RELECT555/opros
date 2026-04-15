/** Публичный путь опроса (включая legacy /crm). */
export function surveyPublicPath(slug: string): string {
  return slug === 'crm' ? '/crm' : `/s/${slug}`
}

const CONSTRUCTOR_CANVAS_KEY = 'askly_constructor_canvas_v1'

type StoredCanvasUnlock = { slug: string; nonce: string }

function readStoredUnlock(): StoredCanvasUnlock | null {
  try {
    /* localStorage: вкладка опроса не видит sessionStorage админки */
    const raw = localStorage.getItem(CONSTRUCTOR_CANVAS_KEY)
    if (!raw) return null
    const o = JSON.parse(raw) as Partial<StoredCanvasUnlock>
    if (typeof o.slug !== 'string' || typeof o.nonce !== 'string') return null
    return { slug: o.slug, nonce: o.nonce }
  } catch {
    return null
  }
}

/**
 * Проверка: полный canvas на живой странице разрешён только после клика
 * «открыть правку» в конструкторе (nonce в localStorage совпадает с параметром cv).
 */
export function isConstructorCanvasUnlock(slug: string, cvParam: string | null): boolean {
  if (!cvParam?.trim()) return false
  const st = readStoredUnlock()
  if (!st || st.slug !== slug) return false
  return st.nonce === cvParam
}

/** Вызвать по клику в конструкторе; открыть возвращённый URL в новой вкладке. */
export function prepareConstructorLiveEditUrl(slug: string): string {
  const nonce = `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 14)}`
  try {
    localStorage.setItem(CONSTRUCTOR_CANVAS_KEY, JSON.stringify({ slug, nonce }))
  } catch {
    /* private mode / quota */
  }
  const base = surveyPublicPath(slug)
  return `${base}?edit=1&canvas=1&cv=${encodeURIComponent(nonce)}`
}

/** Базовая правка с админки: только тексты вопросов на карточках (?edit=1). */
export function questionsLiveEditHref(slug: string): string {
  return `${surveyPublicPath(slug)}?edit=1`
}
