import { useState } from 'react'
import { motion, easeOut, AnimatePresence } from 'framer-motion'

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

function ConstructorPreview() {
  return (
    <div className="askly-preview">
      {/* Sidebar */}
      <div className="askly-preview__sidebar">
        <div className="askly-preview__sb-brand">
          <img src="/favicon.svg" alt="" style={{ width: 14, height: 'auto' }} />
          <span>Askly</span>
        </div>
        <div className="askly-preview__sb-section">Опросники</div>
        {['Вопросы', 'Ответы', 'Аналитика', 'Дизайн', 'Настройки'].map((t, i) => (
          <div key={t} className={`askly-preview__sb-item${i === 0 ? ' askly-preview__sb-item--active' : ''}`}>
            {t}
          </div>
        ))}
      </div>

      {/* Main content */}
      <div className="askly-preview__main">
        <div className="askly-preview__topbar">
          <span className="askly-preview__topbar-title">Редактор вопросов</span>
          <div className="askly-preview__topbar-btn">+ Вопрос</div>
        </div>
        <div className="askly-preview__questions">
          <div className="askly-preview__qcard askly-preview__qcard--active">
            <div className="askly-preview__qcard-head">
              <span className="askly-preview__qcard-num">01</span>
              <span className="askly-preview__qcard-type">checkbox</span>
            </div>
            <div className="askly-preview__qcard-title">Цель внедрения CRM?</div>
            <div className="askly-preview__qcard-opts">
              {['Автоматизация продаж', 'Управление клиентами', 'Аналитика'].map(o => (
                <div key={o} className="askly-preview__qcard-opt">
                  <div className="askly-preview__qcard-check" />
                  <span>{o}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="askly-preview__qcard">
            <div className="askly-preview__qcard-head">
              <span className="askly-preview__qcard-num">02</span>
              <span className="askly-preview__qcard-type">radio</span>
            </div>
            <div className="askly-preview__qcard-title">Использовали CRM раньше?</div>
            <div className="askly-preview__qcard-opts">
              {['Да', 'Нет, впервые'].map(o => (
                <div key={o} className="askly-preview__qcard-opt">
                  <div className="askly-preview__qcard-radio" />
                  <span>{o}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="askly-preview__qcard">
            <div className="askly-preview__qcard-head">
              <span className="askly-preview__qcard-num">03</span>
              <span className="askly-preview__qcard-type">text</span>
            </div>
            <div className="askly-preview__qcard-title">Имя и телефон</div>
            <div className="askly-preview__qcard-input" />
          </div>
        </div>
      </div>
    </div>
  )
}

function AsklyModal({ onClose }: { onClose: () => void }) {
  return (
    <AnimatePresence>
      <motion.div
        className="askly-modal-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="askly-modal"
          initial={{ opacity: 0, y: 24, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 12, scale: 0.97 }}
          transition={{ duration: 0.35, ease: easeOut }}
          onClick={e => e.stopPropagation()}
        >
          <div className="askly-modal__glow" />

          <button className="askly-modal__close" onClick={onClose}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
            </svg>
          </button>

          <div className="askly-modal__layout">
            {/* LEFT */}
            <div className="askly-modal__left">
              <div className="askly-modal__brand">
                <div className="askly-modal__icon-wrap">
                  <img src="/favicon.svg" alt="Askly" className="askly-modal__icon" />
                </div>
                <div className="askly-modal__title">Askly</div>
              </div>

              <p className="askly-modal__lead">
                Платформа для создания опросов, сбора заявок и аналитики — без разработчиков.
              </p>

              <ul className="askly-modal__features">
                <li>
                  <div className="askly-modal__feat-line" />
                  <div>
                    <div className="askly-modal__feat-name">Конструктор вопросов</div>
                    <div className="askly-modal__feat-desc">Любые типы, ветвления, логика показа</div>
                  </div>
                </li>
                <li>
                  <div className="askly-modal__feat-line" />
                  <div>
                    <div className="askly-modal__feat-name">Аналитика в реальном времени</div>
                    <div className="askly-modal__feat-desc">Графики, фильтры, экспорт ответов</div>
                  </div>
                </li>
                <li>
                  <div className="askly-modal__feat-line" />
                  <div>
                    <div className="askly-modal__feat-name">Telegram-уведомления</div>
                    <div className="askly-modal__feat-desc">Алерт мгновенно при каждом ответе</div>
                  </div>
                </li>
                <li>
                  <div className="askly-modal__feat-line" />
                  <div>
                    <div className="askly-modal__feat-name">Кастомный дизайн</div>
                    <div className="askly-modal__feat-desc">Логотип, цвета и стиль под бренд</div>
                  </div>
                </li>
              </ul>

              <div className="askly-modal__footer">
                <span className="askly-modal__footer-dot" />
                Этот опрос создан внутри Askly
              </div>
            </div>

            {/* RIGHT */}
            <div className="askly-modal__right">
              <ConstructorPreview />
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

interface WelcomeScreenProps {
  onStart: () => void
  title?: string
  sub?: string
  questionCount?: number
  btnLabel?: string
  logoUrl?: string
}

export function WelcomeScreen({ onStart, title, sub, questionCount, btnLabel, logoUrl }: WelcomeScreenProps) {
  const [showModal, setShowModal] = useState(false)

  const displayTitle  = title    ?? 'Помогите нам стать лучше для вас'
  const displaySub    = sub      ?? `Пройдите короткий опрос из ${questionCount ?? 4} вопросов — и мы свяжемся с вами.`
  const displayBtn    = btnLabel ?? 'Начать опрос'

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

        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 16, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.05, ease: easeOut }}
          className="welcome-badge"
        >
          <span className="welcome-badge__dot" />
          Бесплатная консультация
        </motion.div>

        {/* Heading */}
        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.14, ease: easeOut }}
          className="welcome-heading"
        >
          {displayTitle}
        </motion.h1>

        {/* Sub */}
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.24, ease: easeOut }}
          className="welcome-sub"
        >
          {displaySub}
        </motion.p>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.34, ease: easeOut }}
          className="welcome-actions"
        >
          <motion.button
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

          <div className="welcome-hints">
            <div className="welcome-hint-item">
              <ClockIcon /> 2 минуты
            </div>
            <span className="welcome-dot" />
            <div className="welcome-hint-item">
              <LockIcon /> данные в безопасности
            </div>
          </div>
        </motion.div>
      </motion.div>

      {showModal && <AsklyModal onClose={() => setShowModal(false)} />}
    </>
  )
}
