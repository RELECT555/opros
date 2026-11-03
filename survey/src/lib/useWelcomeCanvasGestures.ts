import { useRef } from 'react'
import type { SurveyCanvasBlock, SurveyConfigData } from './supabase'
import { patchWelcomeBlock } from './surveyCanvas'
import { blockDefaults, clamp } from './welcomeCanvasLayout'

type WelcomePatch = (fn: (c: SurveyConfigData) => SurveyConfigData) => Promise<void>

export function useWelcomeCanvasGestures(onWelcomePatch?: WelcomePatch) {
  const canvasRef = useRef<HTMLDivElement | null>(null)
  function patchBlock(
    block: SurveyCanvasBlock,
    next: Partial<{ xPct: number; yPx: number; widthPct: number; fontSizePx: number }>,
  ) {
    if (!onWelcomePatch) return
    void onWelcomePatch(c => patchWelcomeBlock(c, block.id, { ...block, ...next } as SurveyCanvasBlock))
  }

  function onDragPointerDown(e: React.PointerEvent, block: SurveyCanvasBlock, index: number) {
    if (!onWelcomePatch) return
    const stage = canvasRef.current
    if (!stage) return
    e.preventDefault()
    e.stopPropagation()
    if (block.type === 'question') return
    const rect = stage.getBoundingClientRect()
    const startX = e.clientX
    const startY = e.clientY
    const d = blockDefaults(block, index)
    const startXPct = d.xPct
    const startYPx = d.yPx
    const onMove = (ev: PointerEvent) => {
      const dx = ev.clientX - startX
      const dy = ev.clientY - startY
      patchBlock(block, {
        xPct: clamp(startXPct + (dx / rect.width) * 100, 0, 95),
        yPx: clamp(startYPx + dy, 0, 4000),
      })
    }
    const onUp = () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }

  function onResizePointerDown(e: React.PointerEvent, block: SurveyCanvasBlock, index: number) {
    if (!onWelcomePatch) return
    const stage = canvasRef.current
    if (!stage) return
    e.preventDefault()
    e.stopPropagation()
    if (block.type === 'question') return
    const rect = stage.getBoundingClientRect()
    const startX = e.clientX
    const startW = blockDefaults(block, index).widthPct
    const onMove = (ev: PointerEvent) => {
      const dx = ev.clientX - startX
      patchBlock(block, { widthPct: clamp(startW + (dx / rect.width) * 100, 10, 100) })
    }
    const onUp = () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }


  return { canvasRef, onDragPointerDown, onResizePointerDown }
}
