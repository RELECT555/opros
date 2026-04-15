import { useRef, useState } from 'react'
import { motion, easeOut } from 'framer-motion'
import type { SurveyCanvasBlock, SurveyConfigData } from '../../lib/supabase'
import {
  appendWelcomeBlock,
  canvasBlockCta,
  canvasBlockText,
  patchWelcomeBlock,
  removeWelcomeBlock,
} from '../../lib/surveyCanvas'
import { AsklyProductModal } from '../marketing/AsklyProductModal'

type WelcomePatch = (fn: (c: SurveyConfigData) => SurveyConfigData) => Promise<void>

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n))
}

interface WelcomeScreenProps {
  onStart: () => void
  title?: string
  sub?: string
  questionCount?: number
  btnLabel?: string
  logoUrl?: string
  badgeText?: string
  hintLeft?: string
  hintRight?: string
  welcomeCanvasBlocks?: SurveyCanvasBlock[] | null
  liveWelcomeEdit?: boolean
  onWelcomePatch?: WelcomePatch
}

function blockDefaults(block: SurveyCanvasBlock, index: number) {
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

export function WelcomeScreen({
  onStart,
  title,
  sub,
  questionCount,
  btnLabel,
  logoUrl,
  badgeText,
  hintLeft,
  hintRight,
  welcomeCanvasBlocks,
  liveWelcomeEdit,
  onWelcomePatch,
}: WelcomeScreenProps) {
  const [showModal, setShowModal] = useState(false)
  const canvasRef = useRef<HTMLDivElement | null>(null)

  const displayTitle = title ?? 'Помогите нам стать лучше для вас'
  const displaySub =
    sub ?? `Пройдите короткий опрос из ${questionCount ?? 4} вопросов — и мы свяжемся с вами.`
  const displayBtn = btnLabel ?? 'Начать опрос'
  const showBadge = badgeText !== undefined ? badgeText.length > 0 : true
  const badgeLabel = badgeText !== undefined ? badgeText : 'Бесплатная консультация'
  const h1 = hintLeft !== undefined ? hintLeft : '2 минуты'
  const h2 = hintRight !== undefined ? hintRight : 'данные в безопасности'
  const showHints = h1.length > 0 || h2.length > 0

  const useCanvas = welcomeCanvasBlocks != null
  const blocks = welcomeCanvasBlocks ?? []

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

  function renderBlockReadonly(block: SurveyCanvasBlock, i: number) {
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

  function renderBlockLive(block: SurveyCanvasBlock, i: number) {
    if (!onWelcomePatch) return null
    if (block.type === 'question') return null
    const d = blockDefaults(block, i)
    const fontSizePx = block.type === 'text' && typeof block.fontSizePx === 'number' ? block.fontSizePx : undefined
    const badge = block.type === 'text' ? 'Текст' : block.type === 'cta' ? 'Кнопка' : 'Линия'

    return (
      <div
        key={block.id}
        className="wc-block wc-block--edit"
        style={{ left: `${d.xPct}%`, top: `${d.yPx}px`, width: `${d.widthPct}%` }}
      >
        <div className="wc-block-chrome">
          <button
            type="button"
            className="wc-block-drag"
            onPointerDown={e => onDragPointerDown(e, block, i)}
            title="Перетаскивайте блок"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <circle cx="9" cy="7" r="1.6" /><circle cx="15" cy="7" r="1.6" />
              <circle cx="9" cy="12" r="1.6" /><circle cx="15" cy="12" r="1.6" />
              <circle cx="9" cy="17" r="1.6" /><circle cx="15" cy="17" r="1.6" />
            </svg>
          </button>
          <span className="wc-block-badge">{badge}</span>

          {block.type === 'text' && (
            <>
              <select
                className="wc-compact-select"
                value={block.align ?? 'center'}
                onChange={e =>
                  void onWelcomePatch(c =>
                    patchWelcomeBlock(c, block.id, { ...block, align: e.target.value as 'left' | 'center' | 'right' }),
                  )
                }
              >
                <option value="left">Слева</option>
                <option value="center">Центр</option>
                <option value="right">Справа</option>
              </select>
              <label className="wc-font-size">
                <input
                  type="number"
                  min={12}
                  max={120}
                  value={fontSizePx ?? ''}
                  placeholder="авто"
                  onChange={e => {
                    const v = e.target.value === '' ? undefined : clamp(Number(e.target.value) || 16, 12, 120)
                    void onWelcomePatch(c =>
                      patchWelcomeBlock(c, block.id, { ...block, fontSizePx: v }),
                    )
                  }}
                />
                px
              </label>
            </>
          )}

          {block.type === 'cta' && (
            <input
              type="text"
              className="wc-cta-input"
              value={block.label ?? ''}
              placeholder="Текст кнопки"
              onChange={e =>
                void onWelcomePatch(c =>
                  patchWelcomeBlock(c, block.id, { ...block, label: e.target.value }),
                )
              }
            />
          )}

          <button
            type="button"
            className="wc-block-del"
            onClick={() => void onWelcomePatch(c => removeWelcomeBlock(c, block))}
          >
            ✕
          </button>
        </div>

        {block.type === 'text' && (
          <textarea
            className={`welcome-canvas-text survey-canvas-block-text wc-inline-text${i === 0 ? ' welcome-canvas-text--lead' : ''}`}
            style={{
              textAlign: block.align ?? 'center',
              fontSize: fontSizePx ? `${fontSizePx}px` : undefined,
            }}
            value={block.body}
            rows={Math.min(16, Math.max(2, block.body.split('\n').length + 1))}
            onChange={e =>
              void onWelcomePatch(c =>
                patchWelcomeBlock(c, block.id, { ...block, body: e.target.value }),
              )
            }
          />
        )}

        {block.type === 'cta' && (
          <button type="button" className="welcome-cta wc-cta-preview" onClick={() => undefined}>
            {block.label?.trim() || displayBtn}
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="welcome-cta__arrow">
              <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        )}

        {block.type === 'divider' && <hr className="welcome-canvas-divider survey-canvas-divider" />}

        <button
          type="button"
          className="wc-resize-handle"
          onPointerDown={e => onResizePointerDown(e, block, i)}
          aria-label="Изменить ширину"
        />
      </div>
    )
  }

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

          {blocks.map((b, i) => renderBlockLive(b, i))}

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

          {blocks.map((b, i) => renderBlockReadonly(b, i))}

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

  /* ── Classic mode ── */
  return (
    <>
      <motion.div
        key="welcome"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0, scale: 0.98 }}
        transition={{ duration: 0.45, ease: easeOut }}
        className="welcome-wrap"
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

        {logoUrl && (
          <motion.img
            src={logoUrl}
            alt="logo"
            className="welcome-logo"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: easeOut }}
            onError={e => (e.currentTarget.style.display = 'none')}
          />
        )}

        <div className="welcome-content">
          {showBadge && (
            <motion.div
              initial={{ opacity: 0, y: 16, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.05, ease: easeOut }}
              className="welcome-badge"
            >
              <span className="welcome-badge__dot" />
              {badgeLabel}
            </motion.div>
          )}

          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.14, ease: easeOut }}
            className="welcome-heading"
          >
            {displayTitle}
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.24, ease: easeOut }}
            className="welcome-sub"
          >
            {displaySub}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.34, ease: easeOut }}
            className="welcome-actions"
          >
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

            {showHints && (
              <div className="welcome-hints">
                {h1.length > 0 && (
                  <div className="welcome-hint-item">
                    <ClockIcon /> {h1}
                  </div>
                )}
                {h1.length > 0 && h2.length > 0 && <span className="welcome-dot" aria-hidden />}
                {h2.length > 0 && (
                  <div className="welcome-hint-item">
                    <LockIcon /> {h2}
                  </div>
                )}
              </div>
            )}
          </motion.div>
        </div>
      </motion.div>
      {showModal && <AsklyProductModal onClose={() => setShowModal(false)} />}
    </>
  )
}

function ClockIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
      <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M8 5v3.5l2 1.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function LockIcon() {
  return (
    <svg width="12" height="13" viewBox="0 0 14 16" fill="none" style={{ flexShrink: 0 }}>
      <rect x="1.5" y="7" width="11" height="8" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M4 7V5a3 3 0 1 1 6 0v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}
