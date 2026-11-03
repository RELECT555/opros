import { motion } from 'framer-motion'
import type { SurveyCanvasBlock } from '../../lib/supabase'
import { blockDefaults } from '../../lib/welcomeCanvasLayout'

export function WelcomeCanvasBlock({ block, i, onStart, displayBtn }: {
  block: SurveyCanvasBlock
  i: number
  onStart: () => void
  displayBtn: string
}) {
    const d = blockDefaults(block, i)
    const fontSizePx = block.type === 'text' && typeof block.fontSizePx === 'number' ? block.fontSizePx : undefined
    return (
      <div
        key={block.id}
        className="wc-block"
        style={{ left: `${d.xPct}%`, top: `${d.yPx}px`, width: `${d.widthPct}%` }}
      >
        {block.type === 'text' && (
          <p
            className={`welcome-canvas-text survey-canvas-block-text${i === 0 ? ' welcome-canvas-text--lead' : ''}`}
            style={{
              textAlign: block.align ?? 'center',
              fontSize: fontSizePx ? `${fontSizePx}px` : undefined,
              margin: 0,
            }}
          >
            {block.body}
          </p>
        )}
        {block.type === 'cta' && (
          <motion.button
            type="button"
            className="welcome-cta"
            onClick={onStart}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
          >
            {block.label?.trim() || displayBtn}
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="welcome-cta__arrow">
              <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </motion.button>
        )}
        {block.type === 'divider' && <hr className="welcome-canvas-divider survey-canvas-divider" />}
      </div>
    )
  }

