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
    if (q.hasOther) answers[q.id + '__other'] = ''
  }
  return { answers, name: '', phone: '', email: '', comment: '' }
}

const slideVariants = {
  enter: (dir: number) => ({
    opacity: 0,
    x: dir > 0 ? 48 : -48,
  }),
  center: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.32, ease: easeOut },
  },
  exit: (dir: number) => ({
    opacity: 0,
    x: dir > 0 ? -48 : 48,
    transition: { duration: 0.22, ease: easeOut },
  }),
}

function toggle(arr: string[], val: string) {
  return arr.includes(val) ? arr.filter(v => v !== val) : [...arr, val]
}

function scaleColor(ratio: number): string {
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
  handleSubmit: () => void
  errorMsg: string
  token?: string
}

export function DynamicSurveyForm({
  questions, form, setForm, status, canSubmit, consent, setConsent,
  handleSubmit, errorMsg, token,
}: Props) {
  const totalSteps = questions.length + 1
  const [step, setStep] = useState(0)
  const [dir, setDir] = useState(1)
  const [viewMode, setViewMode] = useState<'stepped' | 'all'>('stepped')

  function goNext() {
    if (step < totalSteps - 1) { setDir(1); setStep(s => s + 1) }
  }
  function goPrev() {
    if (step > 0) { setDir(-1); setStep(s => s - 1) }
  }
  function isAnswered(q: SurveyQuestion): boolean {
    if (q.type === 'checkbox') return (form.answers[q.id] as string[]).length > 0
    return !!(form.answers[q.id])
  }

  const isContactsDone = form.name.trim().length > 0 && /^[\d\s\+\-\(\)]{7,}$/.test(form.phone.trim())
  const isLastStep = step === totalSteps - 1
  const canGoNext = step < questions.length ? isAnswered(questions[step]) : isContactsDone
  const steps = [...questions.map(q => ({ done: isAnswered(q) })), { done: isContactsDone }]

  const submitBlock = (
    <div className="sf-nav-submit-wrap">
      <motion.label
        className={`consent-card consent-card--inline ${consent ? 'consent-card--on' : ''}`}
        whileTap={{ scale: 0.99 }}
      >
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
          <span className="consent-sub">Нажимая «Отправить», вы соглашаетесь с политикой конфиденциальности</span>
        </span>
      </motion.label>
      {status === 'error' && <p className="err-msg">{errorMsg}</p>}
      <motion.button
        className={`btn-submit ${canSubmit ? 'btn-submit--on' : ''}`}
        disabled={!canSubmit || status === 'loading'}
        onClick={handleSubmit}
        whileHover={canSubmit ? { scale: 1.01 } : {}}
        whileTap={canSubmit ? { scale: 0.99 } : {}}
      >
        {status === 'loading' ? <span className="spinner" /> : canSubmit ? (
          <>Отправить заявку
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </>
        ) : !consent ? 'Подтвердите согласие' : 'Заполните контакты'}
      </motion.button>
    </div>
  )

  return (
    <div className={`survey survey--stepped${viewMode === 'all' ? ' survey--all' : ''}`}>

      {/* Top bar: progress + view toggle */}
      <motion.div
        className="sf-topbar"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: easeOut }}
      >
        {/* Progress dots — only in stepped mode */}
        {viewMode === 'stepped' && (
          <div className="sf-steps">
            {steps.map((s, i) => (
              <div key={i} className="sf-step">
                <button
                  className={`sf-step-dot ${s.done ? 'sf-step-dot--done' : i === step ? 'sf-step-dot--active' : ''}`}
                  onClick={() => { setDir(i > step ? 1 : -1); setStep(i) }}
                  title={i < questions.length ? `Вопрос ${i + 1}` : 'Контакты'}
                >
                  <AnimatePresence mode="wait">
                    {s.done ? (
                      <motion.svg key="check" width="9" height="9" viewBox="0 0 9 9" fill="none"
                        initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                      >
                        <path d="M1.5 4.5l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </motion.svg>
                    ) : (
                      <motion.span key="num" className="sf-step-num" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                        {i + 1}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </button>
                {i < steps.length - 1 && (
                  <div className="sf-step-line">
                    <motion.div className="sf-step-line-fill"
                      animate={{ width: s.done ? '100%' : '0%' }}
                      transition={{ duration: 0.4, ease: easeOut }}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {viewMode === 'all' && (
          <div className="sf-all-counter">
            {steps.filter(s => s.done).length}/{totalSteps} заполнено
          </div>
        )}

        {/* View mode toggle */}
        <div className="sf-view-toggle">
          <button
            className={`sf-view-btn ${viewMode === 'stepped' ? 'sf-view-btn--on' : ''}`}
            onClick={() => setViewMode('stepped')}
            title="По одному"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <rect x="1" y="3" width="12" height="8" rx="2" stroke="currentColor" strokeWidth="1.3"/>
            </svg>
            По одному
          </button>
          <button
            className={`sf-view-btn ${viewMode === 'all' ? 'sf-view-btn--on' : ''}`}
            onClick={() => setViewMode('all')}
            title="Все сразу"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <rect x="1" y="1" width="12" height="4" rx="1.5" stroke="currentColor" strokeWidth="1.3"/>
              <rect x="1" y="6.5" width="12" height="4" rx="1.5" stroke="currentColor" strokeWidth="1.3"/>
              <rect x="1" y="12" width="12" height="1" rx="0.5" fill="currentColor" opacity="0.3"/>
            </svg>
            Все сразу
          </button>
        </div>
      </motion.div>

      {/* ── STEPPED MODE ── */}
      {viewMode === 'stepped' && (
        <>
          <div className="sf-card-wrap">
            <AnimatePresence mode="wait" custom={dir}>
              {step < questions.length ? (
                <QuestionCard key={questions[step].id} q={questions[step]} idx={step} form={form} setForm={setForm} dir={dir} />
              ) : (
                <ContactsCard key="contacts" form={form} setForm={setForm} questionsCount={questions.length} token={token} dir={dir} />
              )}
            </AnimatePresence>
          </div>

          <motion.div className="sf-nav"
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.15, ease: easeOut }}
          >
            <button className="sf-nav-btn sf-nav-btn--back" onClick={goPrev} disabled={step === 0}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Назад
            </button>

            {isLastStep ? submitBlock : (
              <button
                className={`sf-nav-btn sf-nav-btn--next ${canGoNext ? 'sf-nav-btn--active' : ''}`}
                onClick={goNext} disabled={!canGoNext}
              >
                Далее
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            )}
          </motion.div>
        </>
      )}

      {/* ── ALL AT ONCE MODE ── */}
      {viewMode === 'all' && (
        <motion.div className="sf-all-list"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          transition={{ duration: 0.3, ease: easeOut }}
        >
          {questions.map((q, idx) => (
            <QuestionCard key={q.id} q={q} idx={idx} form={form} setForm={setForm} dir={0} />
          ))}
          <ContactsCard form={form} setForm={setForm} questionsCount={questions.length} token={token} dir={0} />
          {submitBlock}
        </motion.div>
      )}
    </div>
  )
}

/* ── Question card ─────────────────────────────────────────── */
function QuestionCard({ q, idx, form, setForm, dir }: {
  q: SurveyQuestion
  idx: number
  form: DynamicFormData
  setForm: (f: DynamicFormData) => void
  dir: number
}) {
  const answer = form.answers[q.id]
  const otherText = (form.answers[q.id + '__other'] ?? '') as string
  const isDone = q.type === 'checkbox'
    ? (answer as string[]).length > 0
    : !!(answer)

  return (
    <motion.div
      custom={dir}
      variants={slideVariants}
      initial="enter"
      animate="center"
      exit="exit"
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

      {q.type === 'checkbox' && (() => {
        const isList = q.optionsLayout === 'list'
        const allOpts = [...q.options, ...(q.hasOther ? ['__other__'] : [])]

        if (isList) {
          return (
            <div className="checkbox-list">
              {allOpts.map((opt, i) => {
                const sel = (answer as string[]).includes(opt)
                const label = opt === '__other__' ? 'Другое' : opt
                return (
                  <motion.button
                    key={opt}
                    className={`checkbox-row ${sel ? 'checkbox-row--on' : ''}`}
                    onClick={() => setForm({ ...form, answers: { ...form.answers, [q.id]: toggle(answer as string[], opt) } })}
                    whileTap={{ scale: 0.985 }}
                  >
                    <span className="checkbox-row-ctrl">
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
                    <span className="checkbox-row-idx">{String(i + 1).padStart(2, '0')}</span>
                    <span className="checkbox-row-label">{label}</span>
                  </motion.button>
                )
              })}
              <AnimatePresence>
                {(answer as string[]).includes('__other__') && q.hasOther && (
                  <motion.div
                    className="other-input-wrap"
                    initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <input className="other-input" type="text" placeholder="Укажите свой вариант..."
                      value={otherText} onChange={e => setForm({ ...form, answers: { ...form.answers, [q.id + '__other']: e.target.value } })} />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )
        }

        return (
          <div className="chips chips--grid">
            {q.options.map(opt => {
              const sel = (answer as string[]).includes(opt)
              return (
                <motion.button
                  key={opt}
                  className={`chip ${sel ? 'chip--on' : ''}`}
                  onClick={() => setForm({ ...form, answers: { ...form.answers, [q.id]: toggle(answer as string[], opt) } })}
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
                    onClick={() => setForm({ ...form, answers: { ...form.answers, [q.id]: toggle(answer as string[], '__other__') } })}
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
                      <motion.div className="other-input-wrap" style={{ gridColumn: '1 / -1' }}
                        initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <input className="other-input" type="text" placeholder="Укажите свой вариант..."
                          value={otherText} onChange={e => setForm({ ...form, answers: { ...form.answers, [q.id + '__other']: e.target.value } })} />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </>
              )
            })()}
          </div>
        )
      })()}

      {q.type === 'radio' && q.optionsLayout !== 'list' && (
        <div className="chips chips--grid">
          {q.options.map((opt) => (
            <motion.button
              key={opt}
              className={`chip ${answer === opt ? 'chip--on' : ''}`}
              onClick={() => setForm({ ...form, answers: { ...form.answers, [q.id]: opt } })}
              whileTap={{ scale: 0.94 }}
            >
              <span className="chip-ctrl">
                <AnimatePresence>
                  {answer === opt && (
                    <motion.span key="dot" style={{ width: 6, height: 6, borderRadius: '50%', background: 'currentColor', display: 'block' }}
                      initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                    />
                  )}
                </AnimatePresence>
              </span>
              {opt}
            </motion.button>
          ))}
        </div>
      )}

      {q.type === 'radio' && q.optionsLayout === 'list' && (
        <div className="radio-list">
          {q.options.map((opt, i) => (
            <motion.button
              key={opt}
              className={`radio-btn ${answer === opt ? 'radio-btn--on' : ''}`}
              onClick={() => setForm({ ...form, answers: { ...form.answers, [q.id]: opt } })}
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
                        value={(form.answers[q.id + '__other'] ?? '') as string}
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
        const fillPct = selected !== null ? ((selected - min) / (max - min)) * 100 : 0
        return (
          <div className="scale-wrap">
            <div className="scale-track-wrap">
              <div className="scale-track">
                <motion.div
                  className="scale-track-fill"
                  animate={{ width: selected !== null ? `${fillPct}%` : '0%' }}
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                />
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
}

/* ── Contacts card ─────────────────────────────────────────── */
function ContactsCard({ form, setForm, questionsCount, token, dir }: {
  form: DynamicFormData
  setForm: (f: DynamicFormData) => void
  questionsCount: number
  token?: string
  dir: number
}) {
  const isDone = form.name.trim().length > 0 && /^[\d\s\+\-\(\)]{7,}$/.test(form.phone.trim())

  return (
    <motion.div
      custom={dir}
      variants={slideVariants}
      initial="enter"
      animate="center"
      exit="exit"
      className={`card qcard ${isDone ? 'card--done' : ''}`}
    >
      <div className={`qcard-stripe ${isDone ? 'qcard-stripe--done' : ''}`} />
      <div className="qcard-bg-num" aria-hidden="true">{String(questionsCount + 1).padStart(2, '0')}</div>

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
  )
}
