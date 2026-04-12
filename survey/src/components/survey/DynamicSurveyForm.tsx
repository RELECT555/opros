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
    if (q.hasOther) answers[q.id + '__other'] = ''
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

function scaleColor(ratio: number): string {
  // 0 → #5b73f9, 0.6 → #9b6dff, 1 → #c084fc
  if (ratio < 0.6) {
    const t = ratio / 0.6
    const r = Math.round(91 + (155 - 91) * t)
    const g = Math.round(115 + (109 - 115) * t)
    const b = Math.round(249 + (255 - 249) * t)
    return `rgb(${r},${g},${b})`
  } else {
    const t = (ratio - 0.6) / 0.4
    const r = Math.round(155 + (192 - 155) * t)
    const g = Math.round(109 + (132 - 109) * t)
    const b = Math.round(255 + (252 - 255) * t)
    return `rgb(${r},${g},${b})`
  }
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

  function isAnswered(q: SurveyQuestion): boolean {
    if (q.type === 'checkbox') return (form.answers[q.id] as string[]).length > 0
    return !!(form.answers[q.id])
  }

  const steps = [
    ...questions.map((q) => ({
      label: q.title,
      done: isAnswered(q),
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
        const otherText = (form.answers[q.id + '__other'] ?? '') as string
        const isDone = isAnswered(q)

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
                {q.hasOther && (() => {
                  const sel = (answer as string[]).includes('__other__')
                  return (
                    <>
                      <motion.button
                        className={`chip ${sel ? 'chip--on' : ''}`}
                        onClick={() => setForm({
                          ...form,
                          answers: { ...form.answers, [q.id]: toggle(answer as string[], '__other__') },
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
                        Другое
                      </motion.button>
                      <AnimatePresence>
                        {sel && (
                          <motion.div
                            className="other-input-wrap"
                            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.2 }}
                          >
                            <input
                              className="other-input"
                              type="text"
                              placeholder="Укажите свой вариант..."
                              value={otherText}
                              onChange={e => setForm({ ...form, answers: { ...form.answers, [q.id + '__other']: e.target.value } })}
                            />
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </>
                  )
                })()}
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
                {q.hasOther && (() => {
                  const sel = answer === '__other__'
                  return (
                    <>
                      <motion.button
                        className={`radio-btn ${sel ? 'radio-btn--on' : ''}`}
                        onClick={() => setForm({ ...form, answers: { ...form.answers, [q.id]: '__other__' } })}
                        whileTap={{ scale: 0.985 }}
                      >
                        <span className="radio-circle">
                          <AnimatePresence>
                            {sel && (
                              <motion.span key="dot" className="radio-circle-dot"
                                initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
                                transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                              />
                            )}
                          </AnimatePresence>
                        </span>
                        <span className="radio-idx">{String(q.options.length + 1).padStart(2, '0')}</span>
                        <span className="radio-label">Другое</span>
                        <span className="radio-arrow">
                          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                            <path d="M3 7h8M8 4l3 3-3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </span>
                      </motion.button>
                      <AnimatePresence>
                        {sel && (
                          <motion.div
                            className="other-input-wrap"
                            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.2 }}
                          >
                            <input
                              className="other-input"
                              type="text"
                              placeholder="Укажите свой вариант..."
                              value={otherText}
                              onChange={e => setForm({ ...form, answers: { ...form.answers, [q.id + '__other']: e.target.value } })}
                            />
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </>
                  )
                })()}
              </div>
            )}

            {q.type === 'text' && (
              <div className="text-answer-wrap">
                <textarea
                  className="text-answer"
                  placeholder="Введите ваш ответ..."
                  rows={3}
                  value={answer as string}
                  onChange={e => setForm({ ...form, answers: { ...form.answers, [q.id]: e.target.value } })}
                />
              </div>
            )}

            {q.type === 'scale' && (() => {
              const min = q.scaleMin ?? 1
              const max = q.scaleMax ?? 10
              const ticks = Array.from({ length: max - min + 1 }, (_, i) => i + min)
              const selected = answer ? Number(answer) : null
              const fillPct = selected !== null
                ? ((selected - min) / (max - min)) * 100
                : 0
              return (
                <div className="scale-wrap">
                  {/* Track */}
                  <div className="scale-track-wrap">
                    <div className="scale-track">
                      <motion.div
                        className="scale-track-fill"
                        animate={{ width: selected !== null ? `${fillPct}%` : '0%' }}
                        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                      />
                      {/* Thumb */}
                      {selected !== null && (
                        <motion.div
                          className="scale-thumb"
                          animate={{ left: `${fillPct}%` }}
                          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                          style={{ background: scaleColor((selected - min) / (max - min)) }}
                        >
                          <span className="scale-thumb-val">{selected}</span>
                        </motion.div>
                      )}
                    </div>
                    {/* Click zones */}
                    <div className="scale-ticks-overlay">
                      {ticks.map(n => (
                        <button
                          key={n}
                          className="scale-tick-zone"
                          onClick={() => setForm({ ...form, answers: { ...form.answers, [q.id]: String(n) } })}
                          aria-label={String(n)}
                        />
                      ))}
                    </div>
                  </div>
                  {/* Numbers */}
                  <div className="scale-numbers">
                    {ticks.map(n => {
                      const isOn = selected === n
                      const isPast = selected !== null && n <= selected
                      return (
                        <button
                          key={n}
                          className={`scale-num ${isOn ? 'scale-num--on' : ''} ${isPast && !isOn ? 'scale-num--past' : ''}`}
                          style={isOn ? { color: scaleColor((n - min) / (max - min)) } : {}}
                          onClick={() => setForm({ ...form, answers: { ...form.answers, [q.id]: String(n) } })}
                        >
                          {isOn ? <span>{n}</span> : n}
                        </button>
                      )
                    })}
                  </div>
                  <div className="scale-labels">
                    <span>Низко</span>
                    <span>Высоко</span>
                  </div>
                </div>
              )
            })()}
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
