import { useState, useEffect, memo } from 'react'
import { motion, AnimatePresence, easeOut } from 'framer-motion'
import { saveSurveyResponse, markTokenOpened } from './lib/supabase'
import { SparklesCore } from './components/ui/sparkles'
import { DottedSurface } from './components/ui/dotted-surface'
import { SpiralAnimation } from './components/ui/spiral-animation'
import { loadConfig, loadConfigRemote } from './config'
import './App.css'

/* ── Types ──────────────────────────────────────────────────── */
interface FormData {
  crm_purpose: string[]
  crm_used_before: string[]
  current_crm: string
  name: string
  phone: string
  comment: string
}

const EMPTY: FormData = {
  crm_purpose: [],
  crm_used_before: [],
  current_crm: '',
  name: '',
  phone: '',
  comment: '',
}

/* ── Anim variants ──────────────────────────────────────────── */
const stagger = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.05 } },
}
const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: easeOut } },
}

/* ── Helpers ────────────────────────────────────────────────── */
function toggle(arr: string[], val: string) {
  return arr.includes(val) ? arr.filter(v => v !== val) : [...arr, val]
}

/* ── Sparkles только для survey/done экранов ── */
const GlobalSparkles = memo(() => (
  <div className="global-sparkles" aria-hidden="true">
    <SparklesCore
      id="global-sparkles"
      background="transparent"
      minSize={0.3}
      maxSize={1.1}
      particleDensity={60}
      className="w-full h-full"
      particleColor="#FFFFFF"
      speed={0.8}
    />
  </div>
))

/* ── Component ──────────────────────────────────────────────── */
export default function App() {
  const [form, setForm] = useState<FormData>(EMPTY)
  const [screen, setScreen] = useState<'welcome' | 'survey'>('welcome')
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [consent, setConsent] = useState(false)
  const [cfg, setCfg] = useState(loadConfig)
  const [token] = useState(() => new URLSearchParams(window.location.search).get('t') ?? undefined)

  useEffect(() => {
    loadConfigRemote().then(setCfg)
    if (token) markTokenOpened(token)
  }, [])

  const CRM_PURPOSE    = cfg.q1.options
  const CRM_LIST       = cfg.q2.options
  const CURRENT_STATUS = cfg.q3.options
  const Q1_TITLE = cfg.q1.title
  const Q1_SUB   = cfg.q1.sub
  const Q2_TITLE = cfg.q2.title
  const Q2_SUB   = cfg.q2.sub
  const Q3_TITLE = cfg.q3.title
  const Q3_SUB   = cfg.q3.sub

  const validPhone = /^[\d\s\+\-\(\)]{7,}$/.test(form.phone.trim())
  const canSubmit =
    form.crm_purpose.length > 0 &&
    form.crm_used_before.length > 0 &&
    form.current_crm !== '' &&
    form.name.trim().length > 0 &&
    validPhone &&
    consent

  const answeredSections = [
    form.crm_purpose.length > 0,
    form.crm_used_before.length > 0,
    form.current_crm !== '',
    form.name.trim().length > 0 && validPhone,
  ].filter(Boolean).length

  async function handleSubmit() {
    if (!canSubmit) return
    setStatus('loading')
    try {
      await saveSurveyResponse({
        crm_purpose: form.crm_purpose,
        crm_used_before: form.crm_used_before,
        current_crm: form.current_crm,
        name: form.name.trim(),
        phone: form.phone.trim(),
        comment: form.comment.trim(),
        token,
      })
      setStatus('done')
    } catch (e: unknown) {
      setErrorMsg(e instanceof Error ? e.message : 'Ошибка отправки')
      setStatus('error')
    }
  }

  return (
    <div className="root">
      <div className="bg-scene">
        <div className="bg-orb bg-orb--1" />
        <div className="bg-orb bg-orb--2" />
        <div className="bg-orb bg-orb--3" />
        <div className="bg-grid" />
      </div>

      {/* DottedSurface только на welcome, sparkles на остальных */}
      {screen === 'welcome'
        ? <DottedSurface className="fixed inset-0 z-0" />
        : <GlobalSparkles />
      }

      <AnimatePresence mode="wait">
        {screen === 'welcome' ? (
          <motion.div
            key="welcome"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.45, ease: easeOut }}
            className="welcome-wrap"
          >
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
              Помогите нам<br />стать лучше<br />
              <span className="welcome-heading__accent">для вас</span>
            </motion.h1>

            {/* Sub */}
            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.24, ease: easeOut }}
              className="welcome-sub"
            >
              Пройдите короткий опрос из 4 вопросов —<br />и мы подберём лучшее CRM-решение для вас.
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
                onClick={() => setScreen('survey')}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
              >
                Начать опрос
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
        ) : status === 'done' ? (
          <motion.div
            key="done"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
            className="success-spiral-wrap"
          >
            {/* Spiral background */}
            <div className="success-spiral-bg">
              <SpiralAnimation />
            </div>

            {/* Overlay content */}
            <div className="success-spiral-content">
              <motion.div
                className="success-card"
                initial={{ opacity: 0, scale: 0.92, y: 24 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.5, ease: easeOut }}
              >
                {/* Glow behind checkmark */}
                <div className="success-card__glow" />

                {/* Checkmark */}
                <motion.div
                  className="success-card__icon"
                  initial={{ scale: 0.4, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.45, delay: 0.1, type: 'spring', stiffness: 280, damping: 22 }}
                >
                  <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
                    <motion.circle
                      cx="32" cy="32" r="28"
                      stroke="#22c55e" strokeWidth="1.5" fill="none"
                      strokeLinecap="round"
                      initial={{ pathLength: 0, opacity: 0 }}
                      animate={{ pathLength: 1, opacity: 1 }}
                      transition={{ duration: 0.5, delay: 0.15, ease: easeOut }}
                    />
                    <motion.path
                      d="M20 32l9 9 15-16"
                      stroke="#22c55e" strokeWidth="2.5" fill="none"
                      strokeLinecap="round" strokeLinejoin="round"
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ duration: 0.35, delay: 0.5, ease: easeOut }}
                    />
                  </svg>
                </motion.div>

                {/* Divider */}
                <motion.div
                  className="success-card__divider"
                  initial={{ scaleX: 0, opacity: 0 }}
                  animate={{ scaleX: 1, opacity: 1 }}
                  transition={{ duration: 0.4, delay: 0.3, ease: easeOut }}
                />

                {/* Text */}
                <motion.div
                  className="success-card__body"
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.25, ease: easeOut }}
                >
                  <h2 className="success-card__title">Заявка отправлена</h2>
                  <p className="success-card__sub">
                    Наш специалист свяжется с вами<br />в ближайшее время
                  </p>
                </motion.div>

                {/* Button */}
                <motion.button
                  className="success-card__btn"
                  onClick={() => { setForm(EMPTY); setStatus('idle'); setScreen('welcome') }}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, delay: 0.45, ease: easeOut }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                >
                  Отправить ещё одну заявку
                </motion.button>
              </motion.div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="form"
            variants={stagger}
            initial="hidden"
            animate="visible"
            className="survey"
          >
            {/* Header */}
            <motion.div variants={fadeUp} className="card header-card">
              {/* decorative glow spots */}
              <div className="hcard-glow hcard-glow--1" aria-hidden="true" />
              <div className="hcard-glow hcard-glow--2" aria-hidden="true" />

              <div className="hcard-body">
                <div className="hcard-top">
                  <p className="eyebrow">CRM-консультация</p>
                  <div className="hcard-counter">
                    <motion.span
                      className="hcard-counter-num"
                      key={answeredSections}
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      {answeredSections}
                    </motion.span>
                    <span className="hcard-counter-of">/4</span>
                  </div>
                </div>
                <h1 className="header-title">Подберём решение для вашего бизнеса</h1>
                <p className="lead">Ответьте на 4 вопроса — перезвоним и проконсультируем бесплатно.</p>
                <div className="header-progress">
                  <div className="prog-track">
                    <motion.div
                      className="prog-fill"
                      animate={{ width: `${(answeredSections / 4) * 100}%` }}
                      transition={{ duration: 0.4, ease: easeOut }}
                    />
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Q1 — Purpose */}
            <motion.div variants={fadeUp} className={`card qcard ${form.crm_purpose.length > 0 ? 'card--done' : ''}`}>
              <div className="qcard-bg-num" aria-hidden="true">01</div>
              <div className="qcard-head">
                <div className="qcard-step">
                  <AnimatePresence>{form.crm_purpose.length > 0 && (
                    <motion.span className="qcard-done" initial={{ opacity:0, scale:0.7 }} animate={{ opacity:1, scale:1 }} exit={{ opacity:0 }}>
                      <svg width="9" height="9" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      Готово
                    </motion.span>
                  )}</AnimatePresence>
                </div>
                <h3 className="qcard-title">{Q1_TITLE}</h3>
                <p className="qcard-sub">{Q1_SUB}</p>
              </div>
              <div className="chips">
                {CRM_PURPOSE.map(item => {
                  const sel = form.crm_purpose.includes(item)
                  return (
                    <motion.button
                      key={item}
                      className={`chip ${sel ? 'chip--on' : ''}`}
                      onClick={() => setForm(f => ({ ...f, crm_purpose: toggle(f.crm_purpose, item) }))}
                      whileTap={{ scale: 0.95 }}
                    >
                      {sel && <CheckIcon />}
                      {item}
                    </motion.button>
                  )
                })}
              </div>
            </motion.div>

            {/* Q2 — Used before */}
            <motion.div variants={fadeUp} className={`card qcard ${form.crm_used_before.length > 0 ? 'card--done' : ''}`}>
              <div className="qcard-bg-num" aria-hidden="true">02</div>
              <div className="qcard-head">
                <div className="qcard-step">
                  <AnimatePresence>{form.crm_used_before.length > 0 && (
                    <motion.span className="qcard-done" initial={{ opacity:0, scale:0.7 }} animate={{ opacity:1, scale:1 }} exit={{ opacity:0 }}>
                      <svg width="9" height="9" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      Готово
                    </motion.span>
                  )}</AnimatePresence>
                </div>
                <h3 className="qcard-title">{Q2_TITLE}</h3>
                <p className="qcard-sub">{Q2_SUB}</p>
              </div>
              <div className="chips chips--grid">
                {CRM_LIST.map(item => {
                  const sel = form.crm_used_before.includes(item)
                  return (
                    <motion.button
                      key={item}
                      className={`chip ${sel ? 'chip--on' : ''}`}
                      onClick={() => setForm(f => ({ ...f, crm_used_before: toggle(f.crm_used_before, item) }))}
                      whileTap={{ scale: 0.95 }}
                    >
                      {sel && <CheckIcon />}
                      {item}
                    </motion.button>
                  )
                })}
              </div>
            </motion.div>

            {/* Q3 — Current status */}
            <motion.div variants={fadeUp} className={`card qcard ${form.current_crm ? 'card--done' : ''}`}>
              <div className="qcard-bg-num" aria-hidden="true">03</div>
              <div className="qcard-head">
                <div className="qcard-step">
                  <AnimatePresence>{form.current_crm && (
                    <motion.span className="qcard-done" initial={{ opacity:0, scale:0.7 }} animate={{ opacity:1, scale:1 }} exit={{ opacity:0 }}>
                      <svg width="9" height="9" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      Готово
                    </motion.span>
                  )}</AnimatePresence>
                </div>
                <h3 className="qcard-title">{Q3_TITLE}</h3>
                <p className="qcard-sub">{Q3_SUB}</p>
              </div>
              <div className="radio-list">
                {CURRENT_STATUS.map((opt, i) => (
                  <motion.button
                    key={opt.value}
                    className={`radio-btn ${form.current_crm === opt.value ? 'radio-btn--on' : ''}`}
                    onClick={() => setForm(f => ({ ...f, current_crm: opt.value }))}
                    whileTap={{ scale: 0.98 }}
                  >
                    <span className="radio-idx">{String(i + 1).padStart(2, '0')}</span>
                    <span className="radio-label">{opt.label}</span>
                    <span className="radio-arrow">→</span>
                  </motion.button>
                ))}
              </div>
            </motion.div>

            {/* Q4 — Contacts */}
            <motion.div variants={fadeUp} className={`card qcard ${form.name.trim() && validPhone ? 'card--done' : ''}`}>
              <div className="qcard-bg-num" aria-hidden="true">04</div>
              <div className="qcard-head">
                <div className="qcard-step">
                  <AnimatePresence>{form.name.trim() && validPhone && (
                    <motion.span className="qcard-done" initial={{ opacity:0, scale:0.7 }} animate={{ opacity:1, scale:1 }} exit={{ opacity:0 }}>
                      <svg width="9" height="9" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      Готово
                    </motion.span>
                  )}</AnimatePresence>
                </div>
                <h3 className="qcard-title">Оставьте контакты</h3>
                <p className="qcard-sub">Перезвоним в удобное время</p>
              </div>
              <div className="fields">
                <div className="field">
                  <label htmlFor="name">Ваше имя</label>
                  <input
                    id="name"
                    type="text"
                    placeholder="Иван Петров"
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  />
                </div>
                <div className="field">
                  <label htmlFor="phone">Телефон</label>
                  <input
                    id="phone"
                    type="tel"
                    placeholder="+7 999 000 00 00"
                    value={form.phone}
                    onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                  />
                </div>
                <div className="field field--full">
                  <label htmlFor="comment">Комментарий <span className="optional">(необязательно)</span></label>
                  <textarea
                    id="comment"
                    placeholder="Опишите задачу или вопрос..."
                    value={form.comment}
                    onChange={e => setForm(f => ({ ...f, comment: e.target.value }))}
                    rows={3}
                  />
                </div>
              </div>
            </motion.div>

            {/* Consent */}
            <motion.div variants={fadeUp}>
              <motion.label
                className={`consent-card ${consent ? 'consent-card--on' : ''}`}
                whileTap={{ scale: 0.99 }}
              >
                <input
                  type="checkbox"
                  checked={consent}
                  onChange={e => setConsent(e.target.checked)}
                  className="consent-checkbox-hidden"
                />
                <span className="consent-box">
                  <AnimatePresence>
                    {consent && (
                      <motion.svg
                        key="check"
                        width="12" height="12" viewBox="0 0 12 12" fill="none"
                        initial={{ opacity: 0, scale: 0.5 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.5 }}
                        transition={{ duration: 0.18 }}
                      >
                        <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </motion.svg>
                    )}
                  </AnimatePresence>
                </span>
                <span className="consent-body">
                  <span className="consent-title">Согласие на обработку данных</span>
                  <span className="consent-sub">Нажимая «Отправить», вы соглашаетесь с политикой конфиденциальности и даёте согласие на обработку персональных данных</span>
                </span>
              </motion.label>
            </motion.div>

            {/* Submit */}
            <motion.div variants={fadeUp} className="footer">
              {status === 'error' && (
                <p className="err-msg">{errorMsg}</p>
              )}
              <motion.button
                className={`btn-submit ${canSubmit ? 'btn-submit--on' : ''}`}
                disabled={!canSubmit || status === 'loading'}
                onClick={handleSubmit}
                whileHover={canSubmit ? { scale: 1.01 } : {}}
                whileTap={canSubmit ? { scale: 0.99 } : {}}
              >
                {status === 'loading' ? (
                  <span className="spinner" />
                ) : canSubmit ? (
                  'Отправить заявку →'
                ) : !consent ? (
                  'Подтвердите согласие'
                ) : (
                  `Осталось заполнить: ${4 - answeredSections}`
                )}
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function CheckIcon() {
  return (
    <span className="chip-check" style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      width: 16, height: 16, minWidth: 16, borderRadius: '50%',
      border: '1px solid rgba(255,255,255,0.15)', flexShrink: 0,
    }}>
      <svg width="9" height="9" viewBox="0 0 12 12" fill="none">
        <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </span>
  )
}

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
