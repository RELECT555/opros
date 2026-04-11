import { motion, AnimatePresence, easeOut } from 'framer-motion'
import type { Dispatch, SetStateAction } from 'react'
import type { SurveyConfig } from '../../config'

export interface FormData {
  crm_purpose: string[]
  crm_used_before: string[]
  current_crm: string
  name: string
  phone: string
  email: string
  comment: string
}

const stagger = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.05 } },
}
const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: easeOut } },
}

function toggle(arr: string[], val: string) {
  return arr.includes(val) ? arr.filter(v => v !== val) : [...arr, val]
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

function DoneChip() {
  return (
    <motion.span className="qcard-done" initial={{ opacity:0, scale:0.7 }} animate={{ opacity:1, scale:1 }} exit={{ opacity:0 }}>
      <svg width="9" height="9" viewBox="0 0 12 12" fill="none">
        <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
      Готово
    </motion.span>
  )
}

interface SurveyFormProps {
  form: FormData
  setForm: Dispatch<SetStateAction<FormData>>
  cfg: SurveyConfig
  status: 'idle' | 'loading' | 'done' | 'error'
  canSubmit: boolean
  consent: boolean
  setConsent: Dispatch<SetStateAction<boolean>>
  answeredSections: number
  handleSubmit: () => void
  errorMsg: string
  token?: string
}

export function SurveyForm({
  form, setForm, cfg, status, canSubmit, consent, setConsent,
  answeredSections, handleSubmit, errorMsg, token,
}: SurveyFormProps) {
  const CRM_PURPOSE    = cfg.q1.options
  const CRM_LIST       = cfg.q2.options
  const CURRENT_STATUS = cfg.q3.options

  const validPhone = /^[\d\s\+\-\(\)]{7,}$/.test(form.phone.trim())

  return (
    <motion.div
      key="form"
      variants={stagger}
      initial="hidden"
      animate="visible"
      className="survey"
    >
      {/* Header */}
      <motion.div variants={fadeUp} className="card header-card">
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
            <AnimatePresence>{form.crm_purpose.length > 0 && <DoneChip />}</AnimatePresence>
          </div>
          <h3 className="qcard-title">{cfg.q1.title}</h3>
          <p className="qcard-sub">{cfg.q1.sub}</p>
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
            <AnimatePresence>{form.crm_used_before.length > 0 && <DoneChip />}</AnimatePresence>
          </div>
          <h3 className="qcard-title">{cfg.q2.title}</h3>
          <p className="qcard-sub">{cfg.q2.sub}</p>
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
            <AnimatePresence>{form.current_crm && <DoneChip />}</AnimatePresence>
          </div>
          <h3 className="qcard-title">{cfg.q3.title}</h3>
          <p className="qcard-sub">{cfg.q3.sub}</p>
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
            <AnimatePresence>{form.name.trim() && validPhone && <DoneChip />}</AnimatePresence>
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
          {!token && (
            <div className="field">
              <label htmlFor="email">Email <span className="optional">(необязательно)</span></label>
              <input
                id="email"
                type="email"
                placeholder="ivan@company.ru"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              />
            </div>
          )}
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
  )
}
