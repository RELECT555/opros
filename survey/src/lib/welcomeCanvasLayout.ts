import type { SurveyCanvasBlock } from './supabase'

export function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n))
}

export function blockDefaults(block: SurveyCanvasBlock, index: number) {
  const xPct = 'xPct' in block && typeof block.xPct === 'number' ? block.xPct : block.type === 'cta' ? 30 : 10
  const yPx = 'yPx' in block && typeof block.yPx === 'number' ? block.yPx : 60 + index * 200
  const widthPct =
    'widthPct' in block && typeof block.widthPct === 'number'
      ? block.widthPct
      : block.type === 'cta'
        ? 40
        : 80
  return { xPct, yPx, widthPct }
}

