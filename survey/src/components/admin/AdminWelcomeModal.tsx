import { useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence, easeOut } from 'framer-motion'
import { SparklesCore } from '../ui/sparkles'

type AdminWelcomeModalProps = {
  open: boolean
  onClose: () => void
}

export function AdminWelcomeModal({ open, onClose }: AdminWelcomeModalProps) {
  useEffect(() => {
    if (!open) return
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  const dismiss = useCallback(() => {
    onClose()
  }, [onClose])

  if (typeof document === 'undefined') return null

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          key="admin-welcome"
          className="adm-welcome-root"
          role="presentation"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          onClick={dismiss}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="admin-welcome-title"
            className="adm-welcome-dialog"
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.97 }}
            transition={{ duration: 0.35, ease: easeOut }}
            onClick={e => e.stopPropagation()}
          >
            {/* Sparkles background layer */}
            <div className="adm-welcome-sparkles">
              <SparklesCore
                background="transparent"
                minSize={0.4}
                maxSize={1.4}
                particleDensity={100}
                particleColor="#ffffff"
                speed={1}
                style={{ width: '100%', height: '100%' }}
              />
              {/* Radial fade for smooth edges */}
              <div className="adm-welcome-sparkles-fade" />
            </div>

            {/* Close button */}
            <button
              type="button"
              className="adm-welcome-close"
              onClick={dismiss}
              aria-label="Закрыть"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
                <path d="M3.5 3.5l7 7M10.5 3.5l-7 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>

            {/* Content */}
            <div className="adm-welcome-content">
              <div className="adm-welcome-brand">
                <div className="adm-brand-mark">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  </svg>
                </div>
                <div className="adm-welcome-brand-text">
                  <span className="adm-welcome-brand-name">Askly</span>
                  <span className="adm-welcome-brand-sub">Admin</span>
                </div>
              </div>

              <h2 id="admin-welcome-title" className="adm-welcome-title">
                Построй опрос<br />своей мечты
              </h2>

              <p className="adm-welcome-lead">
                Конструктор вопросов, аналитика ответов в реальном времени и гибкая настройка внешнего вида — всё в одном месте.
              </p>

              <div className="adm-welcome-gradient-line" />

              <div className="adm-welcome-footer">
                <button type="button" className="adm-welcome-cta" onClick={dismiss}>
                  Начать работу
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
