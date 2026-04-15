import { motion, easeOut } from 'framer-motion'
import type { SurveyCanvasBlock } from '../../../lib/supabase'

type Props = {
  block: SurveyCanvasBlock
  index: number
}

/** Статичный рендер блока конструктора (приветствие и шаги опроса). */
export function CanvasBlockView({ block, index }: Props) {
  if (block.type === 'text') {
    const align = block.align ?? 'center'
    const isLead = index === 0
    const minH = block.minHeightPx
    return (
      <motion.p
        key={block.id}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.05 + index * 0.04, ease: easeOut }}
        className={`welcome-canvas-text${isLead ? ' welcome-canvas-text--lead' : ''} survey-canvas-block-text`}
        style={{
          textAlign: align,
          minHeight: minH != null && minH > 0 ? `${minH}px` : undefined,
        }}
      >
        {block.body}
      </motion.p>
    )
  }
  if (block.type === 'spacer') {
    const h = Math.min(320, Math.max(4, block.height))
    return <div key={block.id} className="welcome-canvas-spacer" style={{ height: h }} aria-hidden />
  }
  if (block.type === 'divider') {
    return <hr key={block.id} className="welcome-canvas-divider survey-canvas-divider" />
  }
  if (block.type === 'cta') {
    return (
      <button type="button" key={block.id} className="welcome-cta" onClick={() => undefined}>
        {block.label?.trim() || 'Начать опрос'}
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="welcome-cta__arrow">
          <path
            d="M3 8h10M9 4l4 4-4 4"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
    )
  }
  return null
}
