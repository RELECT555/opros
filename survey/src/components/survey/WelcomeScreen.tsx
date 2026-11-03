import { useState } from 'react'
import { motion, easeOut } from 'framer-motion'
import type { SurveyCanvasBlock, SurveyConfigData } from '../../lib/supabase'
import {
  appendWelcomeBlock,
  canvasBlockCta,
  canvasBlockText,
} from '../../lib/surveyCanvas'
import { AsklyProductModal } from '../marketing/AsklyProductModal'
import { WelcomeIntro } from '../../ui/survey/WelcomeIntro'
import { WelcomeCanvasBlock } from './WelcomeCanvasBlock'
import { WelcomeCanvasBlockEditor } from './WelcomeCanvasBlockEditor'
import { blockDefaults } from '../../lib/welcomeCanvasLayout'
import { useWelcomeCanvasGestures } from '../../lib/useWelcomeCanvasGestures'

type WelcomePatch = (fn: (c: SurveyConfigData) => SurveyConfigData) => Promise<void>

interface WelcomeScreenProps {
  onStart: () => void
  title?: string
  sub?: string
  questionCount?: number
  btnLabel?: string
  logoUrl?: string
  topics?: { id: string; title: string }[]
  badgeText?: string
  hintLeft?: string
  hintRight?: string
  welcomeCanvasBlocks?: SurveyCanvasBlock[] | null
  liveWelcomeEdit?: boolean
  onWelcomePatch?: WelcomePatch
}

export function WelcomeScreen({
  onStart,
  title,
  sub,
  questionCount,
  btnLabel,
  logoUrl,
  topics,
  badgeText,
  hintLeft,
  hintRight,
  welcomeCanvasBlocks,
  liveWelcomeEdit,
  onWelcomePatch,
}: WelcomeScreenProps) {
  const [showModal, setShowModal] = useState(false)
  const { canvasRef, onDragPointerDown, onResizePointerDown } = useWelcomeCanvasGestures(onWelcomePatch)

  const displayTitle = title ?? 'Помогите нам стать лучше для вас'
  const displaySub =
    sub ?? `Пройдите короткий опрос из ${questionCount ?? 4} вопросов — и мы свяжемся с вами.`
  const displayBtn = btnLabel ?? 'Начать опрос'
  const showBadge = badgeText !== undefined ? badgeText.length > 0 : true
  const badgeLabel = badgeText !== undefined ? badgeText : 'Бесплатная консультация'
  const h1 = hintLeft !== undefined ? hintLeft : '2 минуты'
  const h2 = hintRight !== undefined ? hintRight : 'данные в безопасности'


  const useCanvas = welcomeCanvasBlocks != null
  const blocks = welcomeCanvasBlocks ?? []

  /* ── Canvas mode: вся страница = полотно ── */
  if (useCanvas && liveWelcomeEdit && onWelcomePatch) {
    return (
      <>
        <motion.div
          key="welcome"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35, ease: easeOut }}
          className="welcome-wrap wc-fullpage-canvas"
          ref={canvasRef}
        >
          <motion.button
            type="button"
            className="welcome-brand"
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, ease: easeOut }}
            onClick={() => setShowModal(true)}
            whileHover={{ opacity: 0.8 }}
            whileTap={{ scale: 0.96 }}
          >
            <img src="/favicon.svg" alt="Askly" className="welcome-brand__icon" />
            <span className="welcome-brand__name">Askly</span>
          </motion.button>

          {blocks.map((block, i) => (
            <WelcomeCanvasBlockEditor key={block.id} block={block} i={i} onWelcomePatch={onWelcomePatch}
              onDragPointerDown={onDragPointerDown} onResizePointerDown={onResizePointerDown} displayBtn={displayBtn} />
          ))}

          {blocks.length === 0 && (
            <div className="wc-empty-hint">
              <p>Полотно пустое — добавьте блок в панели справа →</p>
            </div>
          )}
        </motion.div>

        {/* Панель инструментов */}
        <div className="wc-sidebar">
          <div className="wc-sidebar-inner">
            <div className="wc-sidebar-title">Элементы</div>
            <button
              type="button"
              className="wc-sidebar-btn"
              onClick={() => {
                const y = blocks.length > 0
                  ? Math.max(...blocks.map((b, i) => blockDefaults(b, i).yPx)) + 120
                  : 60
                const tb = canvasBlockText('Текст', 'center')
                if (tb.type === 'text') { tb.xPct = 10; tb.yPx = y; tb.widthPct = 80 }
                void onWelcomePatch(c => appendWelcomeBlock(c, tb))
              }}
            >
              <span className="wc-sidebar-btn-icon">T</span>
              Текстовое поле
            </button>
            <button
              type="button"
              className="wc-sidebar-btn wc-sidebar-btn--accent"
              onClick={() => {
                const y = blocks.length > 0
                  ? Math.max(...blocks.map((b, i) => blockDefaults(b, i).yPx)) + 120
                  : 300
                const cta = canvasBlockCta()
                if (cta.type === 'cta') cta.yPx = y
                void onWelcomePatch(c => appendWelcomeBlock(c, cta))
              }}
            >
              <span className="wc-sidebar-btn-icon">◉</span>
              Кнопка
            </button>
          </div>
        </div>

        {showModal && <AsklyProductModal onClose={() => setShowModal(false)} />}
      </>
    )
  }

  /* ── Canvas mode: respondent view ── */
  if (useCanvas) {
    const hasCtaBlock = blocks.some(b => b.type === 'cta')
    return (
      <>
        <motion.div
          key="welcome"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 0.98 }}
          transition={{ duration: 0.45, ease: easeOut }}
          className="welcome-wrap wc-fullpage-canvas"
        >
          <motion.button
            type="button"
            className="welcome-brand"
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, ease: easeOut }}
            onClick={() => setShowModal(true)}
            whileHover={{ opacity: 0.8 }}
            whileTap={{ scale: 0.96 }}
          >
            <img src="/favicon.svg" alt="Askly" className="welcome-brand__icon" />
            <span className="welcome-brand__name">Askly</span>
          </motion.button>

          {blocks.map((block, i) => (
            <WelcomeCanvasBlock key={block.id} block={block} i={i} onStart={onStart} displayBtn={displayBtn} />
          ))}

          {/* Если нет CTA-блока, показываем дефолтную кнопку внизу */}
          {!hasCtaBlock && (
            <div className="wc-fallback-cta">
              <motion.button
                type="button"
                className="welcome-cta"
                onClick={onStart}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
              >
                {displayBtn}
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="welcome-cta__arrow">
                  <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </motion.button>
            </div>
          )}
        </motion.div>
        {showModal && <AsklyProductModal onClose={() => setShowModal(false)} />}
      </>
    )
  }

  return (
    <WelcomeIntro
      onStart={onStart}
      title={displayTitle}
      sub={displaySub}
      questionCount={questionCount}
      btnLabel={displayBtn}
      logoUrl={logoUrl}
      topics={topics}
      badgeLabel={showBadge ? badgeLabel : ''}
      hintLeft={h1}
      hintRight={h2}
    />
  )
}
