import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence, easeOut } from 'framer-motion'
import { SparklesCore } from '../ui/sparkles'
import { GridIcon, InboxIcon } from './AdminIcons'

type AdminLandingSectionsModalProps = {
  open: boolean
  onClose: () => void
}

export function AdminLandingSectionsModal({ open, onClose }: AdminLandingSectionsModalProps) {
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

  if (typeof document === 'undefined') return null

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          key="adm-landing-sections-help"
          className="adm-welcome-root adm-lc-sections-overlay"
          role="presentation"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onClose}
        >
          <motion.div
            id="adm-lc-sections-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="adm-lc-sections-title"
            className="adm-welcome-dialog adm-lc-sections-dialog"
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.3, ease: easeOut }}
            onClick={e => e.stopPropagation()}
          >
            <div className="adm-lc-sections-sparkles" aria-hidden>
              <SparklesCore
                background="transparent"
                minSize={0.35}
                maxSize={1.25}
                particleDensity={90}
                particleColor="#ffffff"
                speed={0.85}
                style={{ width: '100%', height: '100%' }}
              />
              <div className="adm-lc-sections-sparkles-fade" />
            </div>
            <button type="button" className="adm-welcome-close" onClick={onClose} aria-label="Закрыть">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
                <path d="M3.5 3.5l7 7M10.5 3.5l-7 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>
            <div className="adm-lc-sections-body">
              <h2 id="adm-lc-sections-title" className="adm-lc-sections-title">
                Два раздела — простыми словами
              </h2>
              <p className="adm-lc-sections-lead">
                Это разные потоки данных: опросы и заявки не перемешиваются. Переключатель в боковой панели всегда возвращает сюда.
              </p>
              <section className="adm-lc-sections-block" aria-labelledby="adm-lc-sec-surveys">
                <h3 id="adm-lc-sec-surveys" className="adm-lc-sections-subtitle">
                  <span className="adm-lc-sections-subtitle-icon" aria-hidden>
                    <GridIcon />
                  </span>
                  Опросник
                </h3>
                <ul className="adm-lc-sections-list">
                  <li>Список опросов, выбор активного, вопросы и логика прохождения.</li>
                  <li>Дизайн, canvas-сборщик и предпросмотр.</li>
                  <li>Ответы, аналитика и токены для публикации и доступа.</li>
                </ul>
              </section>
              <section className="adm-lc-sections-block" aria-labelledby="adm-lc-sec-leads">
                <h3 id="adm-lc-sec-leads" className="adm-lc-sections-subtitle">
                  <span className="adm-lc-sections-subtitle-icon" aria-hidden>
                    <InboxIcon />
                  </span>
                  Заявки
                </h3>
                <ul className="adm-lc-sections-list">
                  <li>Входящие лиды и демо-заявки в отдельной воронке.</li>
                  <li>Ручной ввод контактов без привязки к опросной ветке.</li>
                  <li>Удобно для выставок и стендов, где важен контакт, а не анкета.</li>
                </ul>
              </section>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
