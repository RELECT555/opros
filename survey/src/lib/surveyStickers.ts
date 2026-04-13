/** Пресеты стикера на карточке опросника в админке (раздел «Опросники»). */
export const SURVEY_STICKER_PRESETS = [
  'icon:chat',
  'icon:list',
  'icon:check',
  'icon:chart',
  'icon:target',
  'icon:search',
  'icon:note',
  'icon:clipboard',
  'icon:pin',
  'icon:gear',
  'icon:flag',
  'icon:idea',
] as const

export const SURVEY_STICKER_MAX_LEN = 32

type StickerPath = {
  d: string
  fill?: string
  stroke?: string
  strokeWidth?: number
  strokeLinecap?: 'round' | 'butt' | 'square'
  strokeLinejoin?: 'round' | 'miter' | 'bevel'
}

export type SurveyStickerIcon = {
  viewBox: string
  paths: StickerPath[]
}

export const SURVEY_STICKER_ICON_MAP: Record<string, SurveyStickerIcon> = {
  'icon:list': {
    viewBox: '0 0 18 18',
    paths: [
      { d: 'M3 5h12', strokeWidth: 1.6, strokeLinecap: 'round' },
      { d: 'M3 9h8', strokeWidth: 1.6, strokeLinecap: 'round' },
      { d: 'M3 13h5', strokeWidth: 1.6, strokeLinecap: 'round' },
    ],
  },
  'icon:chat': {
    viewBox: '0 0 18 18',
    paths: [
      { d: 'M9 3.2c-3.2 0-5.8 2.1-5.8 4.8 0 1.6.9 3.1 2.4 4l-.6 2.3 2.5-1.2c.5.1 1 .2 1.5.2 3.2 0 5.8-2.1 5.8-4.8S12.2 3.2 9 3.2Z', strokeWidth: 1.35, strokeLinecap: 'round', strokeLinejoin: 'round' },
      { d: 'M6.7 8.2h.01M9 8.2h.01M11.3 8.2h.01', strokeWidth: 1.8, strokeLinecap: 'round' },
    ],
  },
  'icon:check': {
    viewBox: '0 0 18 18',
    paths: [
      { d: 'M9 2.8a6.2 6.2 0 1 1 0 12.4A6.2 6.2 0 0 1 9 2.8Z', strokeWidth: 1.4 },
      { d: 'm6.3 8.9 1.9 1.9 3.6-3.6', strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round' },
    ],
  },
  'icon:chart': {
    viewBox: '0 0 18 18',
    paths: [
      { d: 'M3 14.2h12', strokeWidth: 1.4, strokeLinecap: 'round' },
      { d: 'M5 7.5v6.7M9 5v9.2M13 8.8v5.4', strokeWidth: 1.6, strokeLinecap: 'round' },
    ],
  },
  'icon:target': {
    viewBox: '0 0 18 18',
    paths: [
      { d: 'M9 3a6 6 0 1 1 0 12 6 6 0 0 1 0-12Z', strokeWidth: 1.4 },
      { d: 'M9 5.8a3.2 3.2 0 1 1 0 6.4 3.2 3.2 0 0 1 0-6.4Z', strokeWidth: 1.35 },
      { d: 'M9 2.3v2M15.7 9h-2M9 13.7v2M4.3 9h-2', strokeWidth: 1.4, strokeLinecap: 'round' },
    ],
  },
  'icon:search': {
    viewBox: '0 0 18 18',
    paths: [
      { d: 'M8 3.5a4.5 4.5 0 1 1 0 9 4.5 4.5 0 0 1 0-9Z', strokeWidth: 1.4 },
      { d: 'm11.5 11.5 3 3', strokeWidth: 1.6, strokeLinecap: 'round' },
    ],
  },
  'icon:note': {
    viewBox: '0 0 18 18',
    paths: [
      { d: 'M5 2.8h6l2 2v10.4H5V2.8Z', strokeWidth: 1.35, strokeLinejoin: 'round' },
      { d: 'M8.8 2.8v2.3H13', strokeWidth: 1.35, strokeLinejoin: 'round' },
      { d: 'M7 8h4.2M7 10.5h4.2M7 13h2.8', strokeWidth: 1.4, strokeLinecap: 'round' },
    ],
  },
  'icon:clipboard': {
    viewBox: '0 0 18 18',
    paths: [
      { d: 'M6 4h6v10.5H6z', strokeWidth: 1.35 },
      { d: 'M7.2 2.8h3.6v1.8H7.2z', strokeWidth: 1.35 },
      { d: 'M7 7.5h4M7 10h4M7 12.5h2.8', strokeWidth: 1.35, strokeLinecap: 'round' },
    ],
  },
  'icon:pin': {
    viewBox: '0 0 18 18',
    paths: [
      { d: 'm9 2.8 3.8 3.8-1.5 1.4 1.2 3.6-1 1-3.6-1.2-1.4 1.5L2.8 9l1.5-1.4 3.6 1.2 1-1-1.2-3.6L9 2.8Z', strokeWidth: 1.2, strokeLinejoin: 'round' },
      { d: 'm7 11 4.2 4.2', strokeWidth: 1.35, strokeLinecap: 'round' },
    ],
  },
  'icon:gear': {
    viewBox: '0 0 18 18',
    paths: [
      { d: 'M9 5.9A3.1 3.1 0 1 1 9 12a3.1 3.1 0 0 1 0-6.2Z', strokeWidth: 1.35 },
      { d: 'M9 2.6v1.6M9 13.8v1.6M2.6 9h1.6M13.8 9h1.6M4.4 4.4l1.1 1.1M12.5 12.5l1.1 1.1M13.6 4.4l-1.1 1.1M5.5 12.5l-1.1 1.1', strokeWidth: 1.35, strokeLinecap: 'round' },
    ],
  },
  'icon:flag': {
    viewBox: '0 0 18 18',
    paths: [
      { d: 'M5 2.8v12.4', strokeWidth: 1.6, strokeLinecap: 'round' },
      { d: 'M5.3 3.4h7l-1.8 2.4 1.8 2.4h-7', strokeWidth: 1.35, strokeLinejoin: 'round' },
    ],
  },
  'icon:idea': {
    viewBox: '0 0 18 18',
    paths: [
      { d: 'M9 3.1a4.4 4.4 0 0 0-2.9 7.7c.5.4.8 1 1 1.6h3.8c.2-.6.5-1.2 1-1.6A4.4 4.4 0 0 0 9 3.1Z', strokeWidth: 1.35, strokeLinejoin: 'round' },
      { d: 'M7.4 13.2h3.2M7.8 14.8h2.4', strokeWidth: 1.35, strokeLinecap: 'round' },
    ],
  },
}

export function getSurveyStickerIcon(sticker: string): SurveyStickerIcon | null {
  return SURVEY_STICKER_ICON_MAP[sticker.trim()] ?? null
}
