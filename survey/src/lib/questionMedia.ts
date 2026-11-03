import type { QuestionMedia } from './supabase'

function isDomain(host: string, domain: string): boolean {
  return host === domain || host.endsWith(`.${domain}`)
}

export function isSafeMediaUrl(url: string): boolean {
  try {
    const p = new URL(url.trim())
    return p.protocol === 'https:' || p.protocol === 'http:'
  } catch {
    return false
  }
}

/** Прямая ссылка на видеофайл для HTML5 video */
export function isDirectVideoFileUrl(url: string): boolean {
  try {
    const path = new URL(url.trim()).pathname.toLowerCase()
    return /\.(mp4|webm|ogv|ogg|mov|m4v|mkv)(\?.*)?$/.test(path)
  } catch {
    return false
  }
}

/** YouTube / Vimeo и т.п. — нужен iframe, а не тег video с этой ссылкой */
export function shouldRenderVideoAsEmbed(url: string): boolean {
  if (!isSafeMediaUrl(url) || isDirectVideoFileUrl(url)) return false
  const embedSrc = toEmbedIframeSrc(url)
  if (!embedSrc || !isSafeMediaUrl(embedSrc)) return false
  return /youtube(-nocookie)?\.com\/embed\/|player\.vimeo\.com\/video\/|rutube\.ru\/play\/embed\//i.test(embedSrc)
}

/** Страница или embed-URL → безопасный src для iframe */
export function toEmbedIframeSrc(raw: string): string {
  const u = raw.trim()
  if (!u || !isSafeMediaUrl(u)) return ''
  try {
    const parsed = new URL(u)
    const host = parsed.hostname.toLowerCase()

    if (isDomain(host, 'youtube.com') || isDomain(host, 'youtube-nocookie.com')) {
      if (parsed.pathname.startsWith('/embed/')) return u
      if (parsed.pathname.startsWith('/shorts/')) {
        const id = parsed.pathname.split('/').filter(Boolean)[1]
        if (id && /^[\w-]{6,}$/.test(id)) {
          return `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}`
        }
      }
      const v = parsed.searchParams.get('v')
      if (v && /^[\w-]{6,}$/.test(v)) {
        return `https://www.youtube-nocookie.com/embed/${encodeURIComponent(v)}`
      }
    }
    if (host === 'youtu.be' || host === 'www.youtu.be') {
      const id = parsed.pathname.replace(/^\//, '').split('/')[0]
      if (id && /^[\w-]{6,}$/.test(id)) {
        return `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}`
      }
    }

    if (host === 'vimeo.com' || host === 'www.vimeo.com') {
      const parts = parsed.pathname.split('/').filter(Boolean)
      const id = parts[0]
      if (id && /^\d+$/.test(id)) {
        return `https://player.vimeo.com/video/${encodeURIComponent(id)}`
      }
    }
    if (host === 'player.vimeo.com') return u

    if (isDomain(host, 'rutube.ru')) {
      const parts = parsed.pathname.split('/').filter(Boolean)
      if (parts[0] === 'play' && parts[1] === 'embed' && parts[2]) {
        return `${parsed.origin}/play/embed/${parts[2]}`
      }
      if (parts[0] === 'video' && parts[1]) {
        return `https://rutube.ru/play/embed/${encodeURIComponent(parts[1])}`
      }
      if (parts[0] === 'shorts' && parts[1]) {
        return `https://rutube.ru/play/embed/${encodeURIComponent(parts[1])}`
      }
    }

    return u
  } catch {
    return ''
  }
}

/** Разрешённые хосты для iframe — иначе страница часто пустая (чёрный прямоугольник). */
export function isHostAllowedForIframeEmbed(src: string): boolean {
  try {
    const url = new URL(src)
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return false
    const host = url.hostname.toLowerCase()
    return (
      isDomain(host, 'youtube.com') ||
      isDomain(host, 'youtube-nocookie.com') ||
      host === 'youtu.be' ||
      isDomain(host, 'vimeo.com') ||
      host === 'player.vimeo.com' ||
      isDomain(host, 'rutube.ru')
    )
  } catch {
    return false
  }
}

export function questionMediaHasContent(m?: QuestionMedia | null): m is QuestionMedia {
  return !!m?.kind && !!m.url?.trim() && isSafeMediaUrl(m.url)
}
