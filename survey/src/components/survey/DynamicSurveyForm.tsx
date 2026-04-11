import { useState } from 'react'
import { motion, AnimatePresence, easeOut } from 'framer-motion'
import type { SurveyQuestion } from '../../lib/supabase'

export interface DynamicFormData {
  answers: Record<string, string | string[]>
  name: string
  phone: string
  email: string
  comment: string
}

export function emptyFormData(questions: SurveyQuestion[]): DynamicFormData {
  const answers: Record<string, string | string[]> = {}
  for (const q of questions) {
    answers[q.id] = q.type === 'checkbox' ? [] : ''
  }
  return { answers, name: '', phone: '', email: '', comment: '' }
}

const stagger = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
}
const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: easeOut } },
}

function toggle(arr: string[], val: string) {
  return arr.includes(val) ? arr.filter(v => v !== val) : [...arr, val]
}

interface Props {
  questions: SurveyQuestion[]
  form: DynamicFormData
  setForm: (f: DynamicFormData) => void
  status: 'idle' | 'loading' | 'done' | 'error'
  canSubmit: boolean
  consent: boolean
  setConsent: (v: boolean) => void
  answeredSections: number
  handleSubmit: () => void
  errorMsg: string
  token?: string
}

export function DynamicSurveyForm({
  questions, form, setForm, status, canSubmit, consent, setConsent,
  answeredSections, handleSubmit, errorMsg, token,
}: Props) {
  const totalSections = questions.length + 1 // вопросы + контакты

  const steps = [
    ...questions.map((q, i) => ({
      label: q.title,
      done: q.type === 'checkbox'
        ? (form.answers[q.id] as string[]).length > 0
        : !!form.answers[q.id],
    })),
    {
      label: 'Контакты',
      done: form.name.trim().length > 0 && /^[\d\s\+\-\(\)]{7,}$/.test(form.phone.trim()),
    },
  ]

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
            <p className="eyebrow">Опрос</p>
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
              <span className="hcard-counter-of">/{totalSections}</span>
            </div>
          </div>
          <h1 className="header-title">Ответьте на несколько вопросов</h1>
          <p className="lead">Мы свяжемся с вами после получения ответов.</p>

          <div className="sf-steps">
            {steps.map((s, i) => (
              <div key={i} className="sf-step">
                <div className={`sf-step-dot ${s.done ? 'sf-step-dot--done' : i === answeredSections ? 'sf-step-dot--active' : ''}`}>
                  <AnimatePresence mode="wait">
                    {s.done ? (
                      <motion.svg key="check" width="9" height="9" viewBox="0 0 9 9" fill="none"
                        initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                      >
                        <path d="M1.5 4.5l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </motion.svg>
                    ) : (
                      <motion.span key="num" className="sf-step-num"
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                      >{i + 1}</motion.span>
                    )}
                  </AnimatePresence>
                </div>
                {i < steps.length - 1 && (
                  <div className="sf-step-line">
                    <motion.div
                      className="sf-step-line-fill"
                      animate={{ width: s.done ? '100%' : '0%' }}
                      transition={{ duration: 0.4, ease: easeOut }}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Dynamic questions */}
      {questions.map((q, idx) => {
        const answer = form.answers[q.id]
        const isDone = q.type === 'checkbox'
          ? (answer as string[]).length > 0
          : !!answer

        return (
          <motion.div
            key={q.id}
            variants={fadeUp}
            className={`card qcard ${isDone ? 'card--done' : ''}`}
          >
            <div className={`qcard-stripe ${isDone ? 'qcard-stripe--done' : ''}`} />
            <div className="qcard-bg-num" aria-hidden="true">{String(idx + 1).padStart(2, '0')}</div>
            <div className="qcard-head">
              <div className="qcard-step">
                <span className={`qcard-step-pill ${isDone ? 'qcard-step-pill--done' : ''}`}>
                  <AnimatePresence mode="wait">
                    {isDone ? (
                      <motion.span key="done" className="qcard-step-pill-inner"
                        initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                      >
                        <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
                          <path d="M1.5 4.5l2 2 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        Готово
                      </motion.span>
                    ) : (
                      <motion.span key="num" className="qcard-step-pill-inner"
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                      >Вопрос {idx + 1}</motion.span>
                    )}
                  </AnimatePresence>
                </span>
              </div>
              <h3 className="qcard-title">{q.title}</h3>
              {q.subtitle && <p className="qcard-sub">{q.subtitle}</p>}
            </div>

            {q.type === 'checkbox' && (
              <div className="chips">
                {q.options.map(opt => {
                  const sel = (answer as string[]).includes(opt)
                  return (
                    <motion.button
                      key={opt}
                      className={`chip ${sel ? 'chip--on' : ''}`}
                      onClick={() => setForm({
                        ...form,
                        answers: { ...form.answers, [q.id]: toggle(answer as string[], opt) },
                      })}
                      whileTap={{ scale: 0.94 }}
                    >
                      <span className="chip-ctrl">
                        <AnimatePresence>
                          {sel && (
                            <motion.svg key="check" width="8" height="8" viewBox="0 0 8 8" fill="none"
                              initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.5 }}
                              transition={{ duration: 0.15 }}
                            >
                              <path d="M1 4l2 2 4-3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                            </motion.svg>
                          )}
                        </AnimatePresence>
                      </span>
                      {opt}
                    </motion.button>
                  )
                })}
              </div>
            )}

            {q.type === 'radio' && (
              <div className="radio-list">
                {q.options.map((opt, i) => (
                  <motion.button
                    key={opt}
                    className={`radio-btn ${answer === opt ? 'radio-btn--on' : ''}`}
                    onClick={() => setForm({
                      ...form,
                      answers: { ...form.answers, [q.id]: opt },
                    })}
                    whileTap={{ scale: 0.985 }}
                  >
                    <span className="radio-circle">
                      <AnimatePresence>
                        {answer === opt && (
                          <motion.span key="dot" className="radio-circle-dot"
                            initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
                            transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                          />
                        )}
                      </AnimatePresence>
                    </span>
                    <span className="radio-idx">{String(i + 1).padStart(2, '0')}</span>
                    <span className="radio-label">{opt}</span>
                    <span className="radio-arrow">
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                        <path d="M3 7h8M8 4l3 3-3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </span>
                  </motion.button>
                ))}
              </div>
            )}
          </motion.div>
        )
      })}

      {/* Contacts */}
      <motion.div
        variants={fadeUp}
        className={`card qcard ${form.name.trim() && /^[\d\s\+\-\(\)]{7,}$/.test(form.phone.trim()) ? 'card--done' : ''}`}
      >
        <div className={`qcard-stripe ${form.name.trim() && /^[\d\s\+\-\(\)]{7,}$/.test(form.phone.trim()) ? 'qcard-stripe--done' : ''}`} />
        <div className="qcard-bg-num" aria-hidden="true">{String(questions.length + 1).padStart(2, '0')}</div>
        <div className="qcard-head">
          <div className="qcard-step">
            <span className={`qcard-step-pill ${form.name.trim() && /^[\d\s\+\-\(\)]{7,}$/.test(form.phone.trim()) ? 'qcard-step-pill--done' : ''}`}>
              <AnimatePresence mode="wait">
                {form.name.trim() && /^[\d\s\+\-\(\)]{7,}$/.test(form.phone.trim()) ? (
                  <motion.span key="done" className="qcard-step-pill-inner"
                    initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                  >
                    <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
                      <path d="M1.5 4.5l2 2 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    Готово
                  </motion.span>
                ) : (
                  <motion.span key="num" className="qcard-step-pill-inner"
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  >Контакты</motion.span>
                )}
              </AnimatePresence>
            </span>
          </div>
          <h3 className="qcard-title">Оставьте контакты</h3>
          <p className="qcard-sub">Перезвоним в удобное время</p>
        </div>
        <div className="fields">
          <div className="field">
            <label htmlFor="dyn-name">Ваше имя</label>
            <div className="field-wrap">
              <span className="field-icon">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <circle cx="7" cy="4.5" r="2.5" stroke="currentColor" strokeWidth="1.3"/>
                  <path d="M2 12c0-2.2 2.2-4 5-4s5 1.8 5 4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                </svg>
              </span>
              <input id="dyn-name" type="text" placeholder="Иван Петров"
                value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            </div>
          </div>
          <div className="field">
            <label htmlFor="dyn-phone">Телефон</label>
            <div className="field-wrap">
              <span className="field-icon">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M4.5 2h5a1 1 0 011 1v8a1 1 0 01-1 1h-5a1 1 0 01-1-1V3a1 1 0 011-1z" stroke="currentColor" strokeWidth="1.3"/>
                  <circle cx="7" cy="10" r="0.6" fill="currentColor"/>
                </svg>
              </span>
              <input id="dyn-phone" type="tel" placeholder="+7 999 000 00 00"
                value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
            </div>
          </div>
          {!token && (
            <div className="field field--full">
              <label htmlFor="dyn-email">Email <span className="optional">(необязательно)</span></label>
              <div className="field-wrap">
                <span className="field-icon">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <rect x="1.5" y="3" width="11" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.3"/>
                    <path d="M1.5 5l5.5 3.5L12.5 5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                  </svg>
                </span>
                <input id="dyn-email" type="email" placeholder="ivan@company.ru"
                  value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
              </div>
            </div>
          )}
          <div className="field field--full">
            <label htmlFor="dyn-comment">Комментарий <span className="optional">(необязательно)</span></label>
            <textarea id="dyn-comment" placeholder="Опишите задачу или вопрос..."
              value={form.comment} onChange={e => setForm({ ...form, comment: e.target.value })} rows={3} />
          </div>
        </div>
      </motion.div>

      {/* Consent */}
      <motion.div variants={fadeUp}>
        <motion.label className={`consent-card ${consent ? 'consent-card--on' : ''}`} whileTap={{ scale: 0.99 }}>
          <input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} className="consent-checkbox-hidden" />
          <span className="consent-box">
            <AnimatePresence>
              {consent && (
                <motion.svg key="check" width="12" height="12" viewBox="0 0 12 12" fill="none"
                  initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.5 }}
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
        {status === 'error' && <p className="err-msg">{errorMsg}</p>}
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
            <>Отправить заявку
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </>
          ) : !consent ? (
            'Подтвердите согласие'
          ) : (
            `Осталось заполнить: ${totalSections - answeredSections}`
          )}
        </motion.button>
      </motion.div>
    </motion.div>
  )
}
