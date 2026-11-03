import type {
  SurveyDesign,
  SurveyTypeScale,
  SurveyCtaStyle,
  SurveyOrbIntensity,
  SurveyRadiusPreset,
} from './supabase'

export type {
  SurveyTypeScale,
  SurveyCtaStyle,
  SurveyOrbIntensity,
  SurveyRadiusPreset,
} from './supabase'

const RADIUS_PX: Record<SurveyRadiusPreset, number> = {
  sm: 10,
  md: 14,
  lg: 20,
}

const ORB_BASE: Record<SurveyOrbIntensity, number> = {
  off: 0,
  low: 0.1,
  medium: 0.18,
  high: 0.28,
}

const COLOR_DEFAULTS = {
  accent: '#5b73f9',
  accent2: '#9b6dff',
  bg: '#07070d',
  orb1: '#5b73f9',
  orb2: '#9b6dff',
  text: '#eaeaf8',
  text2: '#8a8aaa',
}

const COPY_DEFAULTS = {
  welcome_badge: 'Бесплатная консультация',
  welcome_hint_1: '2 минуты',
  welcome_hint_2: 'данные в безопасности',
}

function _normTypeScale(v: unknown): SurveyTypeScale {
  if (v === 'compact' || v === 'large') return v
  return 'normal'
}

function _normCta(v: unknown): SurveyCtaStyle {
  if (v === 'solid' || v === 'outline') return v
  return 'gradient'
}

function _normRadius(v: unknown): SurveyRadiusPreset {
  if (v === 'sm' || v === 'lg') return v
  return 'md'
}

function _normOrb(v: unknown): SurveyOrbIntensity {
  if (v === 'off' || v === 'low' || v === 'high') return v
  return 'medium'
}

/** Полный дизайн с подставленными значениями по умолчанию (для превью, стилей, форм). */
export type MergedSurveyDesign = SurveyDesign & {
  accent: string
  accent2: string
  bg: string
  orb1: string
  orb2: string
  text: string
  text2: string
  welcome_badge: string
  welcome_hint_1: string
  welcome_hint_2: string
  type_scale: SurveyTypeScale
  cta_style: SurveyCtaStyle
  radius: SurveyRadiusPreset
  orb_intensity: SurveyOrbIntensity
}

export function mergeSurveyDesign(d?: SurveyDesign): MergedSurveyDesign {
  const merged: MergedSurveyDesign = {
    ...COLOR_DEFAULTS,
    ...COPY_DEFAULTS,
    ...d,
    accent: d?.accent ?? COLOR_DEFAULTS.accent,
    accent2: d?.accent2 ?? COLOR_DEFAULTS.accent2,
    bg: d?.bg ?? COLOR_DEFAULTS.bg,
    orb1: d?.orb1 ?? COLOR_DEFAULTS.orb1,
    orb2: d?.orb2 ?? COLOR_DEFAULTS.orb2,
    text: d?.text ?? COLOR_DEFAULTS.text,
    text2: d?.text2 ?? COLOR_DEFAULTS.text2,
    welcome_badge:
      d?.welcome_badge !== undefined ? d.welcome_badge : COPY_DEFAULTS.welcome_badge,
    welcome_hint_1:
      d?.welcome_hint_1 !== undefined ? d.welcome_hint_1 : COPY_DEFAULTS.welcome_hint_1,
    welcome_hint_2:
      d?.welcome_hint_2 !== undefined ? d.welcome_hint_2 : COPY_DEFAULTS.welcome_hint_2,
    type_scale: _normTypeScale(d?.type_scale),
    cta_style: _normCta(d?.cta_style),
    radius: _normRadius(d?.radius),
    orb_intensity: _normOrb(d?.orb_intensity),
  }
  return merged
}

/** Прозрачность орбов в мини-превью админки (0–1). */
export function previewOrbMultiplier(m: MergedSurveyDesign): number {
  const v = ORB_BASE[m.orb_intensity]
  return m.orb_intensity === 'off' ? 0 : Math.min(0.35, v * 1.35)
}

function _hexToRgb(hex: string): [number, number, number] | null {
  const h = hex.replace('#', '').trim()
  if (h.length === 3) {
    const r = parseInt(h[0] + h[0], 16)
    const g = parseInt(h[1] + h[1], 16)
    const b = parseInt(h[2] + h[2], 16)
    return Number.isFinite(r) && Number.isFinite(g) && Number.isFinite(b) ? [r, g, b] : null
  }
  if (h.length === 6) {
    const r = parseInt(h.slice(0, 2), 16)
    const g = parseInt(h.slice(2, 4), 16)
    const b = parseInt(h.slice(4, 6), 16)
    return Number.isFinite(r) && Number.isFinite(g) && Number.isFinite(b) ? [r, g, b] : null
  }
  return null
}

function _relLum([r, g, b]: [number, number, number]): number {
  const a = [r, g, b].map(v => {
    const x = v / 255
    return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2]
}

/** Контраст WCAG между двумя цветами #rrggbb. */
export function contrastRatio(fgHex: string, bgHex: string): number | null {
  const fg = _hexToRgb(fgHex.startsWith('#') ? fgHex : `#${fgHex}`)
  const bg = _hexToRgb(bgHex.startsWith('#') ? bgHex : `#${bgHex}`)
  if (!fg || !bg) return null
  const L1 = _relLum(fg)
  const L2 = _relLum(bg)
  const hi = Math.max(L1, L2)
  const lo = Math.min(L1, L2)
  return (hi + 0.05) / (lo + 0.05)
}

/** Сообщения для блока «доступность» в админке (рус.). */
export function surveyDesignContrastHints(m: MergedSurveyDesign): string[] {
  const out: string[] = []
  const body = contrastRatio(m.text, m.bg)
  if (body !== null && body < 4.5) {
    out.push(`Контраст основного текста и фона ${body.toFixed(2)}:1 — для текста желательно ≥ 4.5:1.`)
  }
  const sub = contrastRatio(m.text2, m.bg)
  if (sub !== null && sub < 3) {
    out.push(`Контраст вторичного текста и фона ${sub.toFixed(2)}:1 — для мелкого текста желательно ≥ 3:1.`)
  }
  const ctaBg =
    m.cta_style === 'outline' ? m.bg : m.cta_style === 'solid' ? m.accent : m.accent
  const ctaFg = m.cta_style === 'outline' ? m.accent : '#ffffff'
  const btn = contrastRatio(ctaFg, ctaBg)
  if (btn !== null && btn < 3) {
    out.push(`Контраст подписи на кнопке (оценка) ${btn.toFixed(2)}:1 — проверьте читаемость CTA.`)
  }
  return out
}

export function buildSurveyDesignStylesheet(d?: SurveyDesign): string {
  const m = mergeSurveyDesign(d)
  const r = RADIUS_PX[m.radius]
  const orbOp = ORB_BASE[m.orb_intensity]

  const ctaGradient = `
    .root .welcome-cta {
      background: linear-gradient(135deg, ${m.accent} 0%, ${m.accent2} 100%) !important;
      color: #fff !important;
      border: none !important;
      box-shadow: 0 4px 24px color-mix(in srgb, ${m.accent} 45%, transparent), 0 0 0 1px color-mix(in srgb, ${m.accent} 35%, transparent) inset !important;
    }
    .root .welcome-cta:hover {
      filter: brightness(1.08);
 box-shadow: 0 6px 32px color-mix(in srgb, ${m.accent} 55%, transparent), 0 0 0 1px color-mix(in srgb, ${m.accent} 40%, transparent) inset !important;
    }
    .root .welcome-cta__arrow path { stroke: currentColor !important; }
  `
  const ctaSolid = `
    .root .welcome-cta {
      background: ${m.accent} !important;
      color: #fff !important;
      border: none !important;
      box-shadow: 0 4px 24px color-mix(in srgb, ${m.accent} 45%, transparent) !important;
    }
    .root .welcome-cta:hover { filter: brightness(1.08); }
    .root .welcome-cta__arrow path { stroke: currentColor !important; }
  `
  const ctaOutline = `
    .root .welcome-cta {
      background: transparent !important;
      color: ${m.accent} !important;
      border: 2px solid ${m.accent} !important;
      box-shadow: none !important;
    }
    .root .welcome-cta:hover {
      background: color-mix(in srgb, ${m.accent} 12%, transparent) !important;
    }
    .root .welcome-cta__arrow path { stroke: currentColor !important; }
  `

  const ctaBlock =
    m.cta_style === 'solid' ? ctaSolid : m.cta_style === 'outline' ? ctaOutline : ctaGradient

  const btnOnGradient = `
    .root .btn-submit--on {
      background: linear-gradient(135deg, ${m.accent} 0%, ${m.accent2} 100%) !important;
      border-color: transparent !important;
      color: #fff !important;
      box-shadow: 0 4px 24px color-mix(in srgb, ${m.accent} 40%, transparent), 0 0 0 1px color-mix(in srgb, ${m.accent} 30%, transparent) !important;
      border-radius: var(--survey-radius, ${r}px) !important;
    }
    .root .btn-submit--on:hover {
      box-shadow: 0 6px 32px color-mix(in srgb, ${m.accent} 50%, transparent), 0 0 0 1px color-mix(in srgb, ${m.accent} 35%, transparent) !important;
      filter: brightness(1.08);
    }
  `
  const btnOnSolid = `
    .root .btn-submit--on {
      background: ${m.accent} !important;
      border-color: transparent !important;
      color: #fff !important;
      box-shadow: 0 4px 24px color-mix(in srgb, ${m.accent} 40%, transparent) !important;
      border-radius: var(--survey-radius, ${r}px) !important;
    }
    .root .btn-submit--on:hover { filter: brightness(1.08); }
  `
  const btnOnOutline = `
    .root .btn-submit--on {
      background: transparent !important;
      border: 2px solid ${m.accent} !important;
      color: ${m.accent} !important;
      box-shadow: none !important;
      border-radius: var(--survey-radius, ${r}px) !important;
    }
    .root .btn-submit--on:hover {
      background: color-mix(in srgb, ${m.accent} 10%, transparent) !important;
    }
  `

  const btnBlock =
    m.cta_style === 'solid' ? btnOnSolid : m.cta_style === 'outline' ? btnOnOutline : btnOnGradient

  return `
    :root {
      --accent: ${m.accent};
      --accent-2: ${m.accent2};
      --bg: ${m.bg};
      --text: ${m.text};
      --text-2: ${m.text2};
      --survey-radius: ${r}px;
      --survey-orb-opacity: ${orbOp};
    }
    body { background: ${m.bg}; color: ${m.text}; }
    .bg-orb--1 { background: radial-gradient(circle, ${m.orb1} 0%, transparent 70%) !important; }
    .bg-orb--2 { background: radial-gradient(circle, ${m.orb2} 0%, transparent 70%) !important; }
    .bg-orb--1, .bg-orb--2 {
      opacity: var(--survey-orb-opacity, 0.18) !important;
    }
    .bg-orb--3 {
      opacity: calc(var(--survey-orb-opacity, 0.18) * 0.55) !important;
    }
    .root .welcome-heading { color: var(--text) !important; }
    .root .welcome-sub { color: var(--text-2) !important; }
    .root .welcome-hint-item { color: var(--text-2) !important; }
    .root .welcome-dot { background: color-mix(in srgb, var(--text-2) 35%, transparent) !important; }
    .root .consent-card,
    .root .field input,
    .root .field textarea {
      border-radius: var(--survey-radius, ${r}px) !important;
    }
    .root .btn-submit:not(.btn-submit--on) {
      border-radius: var(--survey-radius, ${r}px) !important;
    }
    .root .success-card {
      border-radius: max(18px, var(--survey-radius, ${r}px)) !important;
    }
    .root .success-card__btn {
      border-radius: var(--survey-radius, ${r}px) !important;
    }
    .root .welcome-cta {
      border-radius: min(999px, calc(var(--survey-radius, ${r}px) * 2 + 8px)) !important;
    }
    .root .chip,
    .root .sf-nav-btn {
      border-radius: var(--survey-radius, ${r}px) !important;
    }
    ${ctaBlock}
    ${btnBlock}
  `
}
