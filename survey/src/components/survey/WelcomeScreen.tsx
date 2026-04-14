import { useState } from 'react'
import { motion, easeOut } from 'framer-motion'
import { AsklyProductModal } from '../marketing/AsklyProductModal'

function ClockIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
      <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M8 5v3.5l2 1.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

function LockIcon() {
  return (
    <svg width="12" height="13" viewBox="0 0 14 16" fill="none" style={{ flexShrink: 0 }}>
      <rect x="1.5" y="7" width="11" height="8" rx="2" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M4 7V5a3 3 0 1 1 6 0v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  )
}

interface WelcomeScreenProps {
  onStart: () => void
  title?: string
  sub?: string
  questionCount?: number
  btnLabel?: string
  logoUrl?: string
  /** Пустая строка — не показывать бейдж. */
  badgeText?: string
  hintLeft?: string
  hintRight?: string
}

export function WelcomeScreen({
  onStart, title, sub, questionCount, btnLabel, logoUrl,
  badgeText, hintLeft, hintRight,
}: WelcomeScreenProps) {
  const [showModal, setShowModal] = useState(false)

  const displayTitle  = title    ?? 'Помогите нам стать лучше для вас'
  const displaySub    = sub      ?? `Пройдите короткий опрос из ${questionCount ?? 4} вопросов — и мы свяжемся с вами.`
  const displayBtn    = btnLabel ?? 'Начать опрос'
  const showBadge     = badgeText !== undefined ? badgeText.length > 0 : true
  const badgeLabel    = badgeText !== undefined ? badgeText : 'Бесплатная консультация'
  const h1            = hintLeft !== undefined ? hintLeft : '2 минуты'
  const h2            = hintRight !== undefined ? hintRight : 'данные в безопасности'
  const showHints     = h1.length > 0 || h2.length > 0

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
        {/* Askly brand logo — top-left corner */}
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

        {/* Logo */}
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
                <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
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
