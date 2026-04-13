import { useState } from 'react'
import type { QuestionMedia } from '../../lib/supabase'
import {
  shouldRenderVideoAsEmbed,
  toEmbedIframeSrc,
  isSafeMediaUrl,
  isHostAllowedForIframeEmbed,
} from '../../lib/questionMedia'

export function QuestionMediaBlock({ media }: { media: QuestionMedia }) {
  const [imgBroken, setImgBroken] = useState(false)
  const url = media.url.trim()
  if (!isSafeMediaUrl(url)) return null

  if (media.kind === 'image') {
    if (imgBroken) return null
    return (
      <div className="qcard-media qcard-media--image">
        <img
          src={url}
          alt={media.alt ?? ''}
          loading="lazy"
          decoding="async"
          onError={() => setImgBroken(true)}
        />
      </div>
    )
  }

  if (media.kind === 'video') {
    if (shouldRenderVideoAsEmbed(url)) {
      const src = toEmbedIframeSrc(url)
      if (!src || !isSafeMediaUrl(src) || !isHostAllowedForIframeEmbed(src)) return null
      return (
        <div className="qcard-media qcard-media--embed">
          <iframe
            src={src}
            title={media.alt?.trim() || 'Видео'}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            loading="lazy"
            referrerPolicy="strict-origin-when-cross-origin"
          />
        </div>
      )
    }
    return (
      <div className="qcard-media qcard-media--video">
        <video src={url} controls playsInline preload="metadata" />
      </div>
    )
  }

  if (media.kind === 'embed') {
    const src = toEmbedIframeSrc(url)
    if (!src || !isSafeMediaUrl(src) || !isHostAllowedForIframeEmbed(src)) return null
    return (
      <div className="qcard-media qcard-media--embed">
        <iframe
          src={src}
          title={media.alt?.trim() || 'Видео'}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          loading="lazy"
          referrerPolicy="strict-origin-when-cross-origin"
        />
      </div>
    )
  }

  return null
}
