import { AnimatePresence, motion } from 'framer-motion'
import type { SurveyQuestion } from '../../../lib/supabase'
import { questionMediaHasContent } from '../../../lib/questionMedia'
import { QuestionMediaBlock } from '../QuestionMediaBlock'
import type { DynamicFormData, DynamicSetForm } from './types'
import { scaleColor, slideVariants, toggle } from './utils'

interface QuestionCardProps {
  q: SurveyQuestion
  idx: number
  form: DynamicFormData
  setForm: DynamicSetForm
  dir: number
  liveEdit?: boolean
  onLiveEditClick?: () => void
}

export function QuestionCard({
  q,
  idx,
  form,
  setForm,
  dir,
  liveEdit,
  onLiveEditClick,
}: QuestionCardProps) {
  const answer = form.answers[q.id]
  const otherText = (form.answers[q.id + '__other'] ?? '') as string
  const isDone = q.type === 'checkbox'
    ? (answer as string[]).length > 0
    : !!answer

  return (
    <motion.div
      custom={dir}
      variants={slideVariants}
      initial="enter"
      animate="center"
      exit="exit"
      className={`card qcard ${isDone ? 'card--done' : ''}${liveEdit ? ' qcard--live-edit' : ''}`}
    >
      <div className={`qcard-stripe ${isDone ? 'qcard-stripe--done' : ''}`} />
      <div className="qcard-bg-num" aria-hidden="true">{String(idx + 1).padStart(2, '0')}</div>

      {liveEdit && onLiveEditClick && (
        <button type="button" className="qcard-live-edit" onClick={onLiveEditClick}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
          Изменить вопрос
        </button>
      )}

      <div className="qcard-head">
        <div className="qcard-step">
          <span className={`qcard-step-pill ${isDone ? 'qcard-step-pill--done' : ''}`}>
            <AnimatePresence mode="wait">
              {isDone ? (
                <motion.span key="done" className="qcard-step-pill-inner" initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
                  <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
                    <path d="M1.5 4.5l2 2 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  Готово
                </motion.span>
              ) : (
                <motion.span key="num" className="qcard-step-pill-inner" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  Вопрос {idx + 1}
                </motion.span>
              )}
            </AnimatePresence>
          </span>
        </div>
        <h3 className="qcard-title">{q.title}</h3>
        {q.subtitle && <p className="qcard-sub">{q.subtitle}</p>}
      </div>

      {questionMediaHasContent(q.media) && (
        <div className="qcard-media-slot">
          <QuestionMediaBlock media={q.media} />
        </div>
      )}

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
                          <motion.svg key="check" width="8" height="8" viewBox="0 0 8 8" fill="none" initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.5 }} transition={{ duration: 0.15 }}>
                            <path d="M1 4l2 2 4-3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
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
                  <motion.div className="other-input-wrap" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.2 }}>
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
            </div>
          )
        }

        return (
          <div className="chips chips--grid">
            {q.options.map(opt => {
              const sel = (answer as string[]).includes(opt)
              return (
                <motion.button key={opt} className={`chip ${sel ? 'chip--on' : ''}`} onClick={() => setForm({ ...form, answers: { ...form.answers, [q.id]: toggle(answer as string[], opt) } })} whileTap={{ scale: 0.94 }}>
                  <span className="chip-ctrl">
                    <AnimatePresence>
                      {sel && (
                        <motion.svg key="check" width="8" height="8" viewBox="0 0 8 8" fill="none" initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.5 }} transition={{ duration: 0.15 }}>
                          <path d="M1 4l2 2 4-3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
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
                  <motion.button className={`chip ${sel ? 'chip--on' : ''}`} onClick={() => setForm({ ...form, answers: { ...form.answers, [q.id]: toggle(answer as string[], '__other__') } })} whileTap={{ scale: 0.94 }}>
                    <span className="chip-ctrl">
                      <AnimatePresence>
                        {sel && (
                          <motion.svg key="check" width="8" height="8" viewBox="0 0 8 8" fill="none" initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.5 }} transition={{ duration: 0.15 }}>
                            <path d="M1 4l2 2 4-3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                          </motion.svg>
                        )}
                      </AnimatePresence>
                    </span>
                    Другое
                  </motion.button>
                  <AnimatePresence>
                    {sel && (
                      <motion.div className="other-input-wrap" style={{ gridColumn: '1 / -1' }} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.2 }}>
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
        )
      })()}

      {q.type === 'radio' && q.optionsLayout !== 'list' && (
        <div className="chips chips--grid">
          {q.options.map((opt) => (
            <motion.button key={opt} className={`chip ${answer === opt ? 'chip--on' : ''}`} onClick={() => setForm({ ...form, answers: { ...form.answers, [q.id]: opt } })} whileTap={{ scale: 0.94 }}>
              <span className="chip-ctrl">
                <AnimatePresence>
                  {answer === opt && (
                    <motion.span key="dot" style={{ width: 6, height: 6, borderRadius: '50%', background: 'currentColor', display: 'block' }} initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} transition={{ type: 'spring', stiffness: 500, damping: 25 }} />
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
            <motion.button key={opt} className={`radio-btn ${answer === opt ? 'radio-btn--on' : ''}`} onClick={() => setForm({ ...form, answers: { ...form.answers, [q.id]: opt } })} whileTap={{ scale: 0.985 }}>
              <span className="radio-circle">
                <AnimatePresence>
                  {answer === opt && (
                    <motion.span key="dot" className="radio-circle-dot" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} transition={{ type: 'spring', stiffness: 500, damping: 25 }} />
                  )}
                </AnimatePresence>
              </span>
              <span className="radio-idx">{String(i + 1).padStart(2, '0')}</span>
              <span className="radio-label">{opt}</span>
              <span className="radio-arrow">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M3 7h8M8 4l3 3-3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
            </motion.button>
          ))}
          {q.hasOther && (() => {
            const sel = answer === '__other__'
            return (
              <>
                <motion.button className={`radio-btn ${sel ? 'radio-btn--on' : ''}`} onClick={() => setForm({ ...form, answers: { ...form.answers, [q.id]: '__other__' } })} whileTap={{ scale: 0.985 }}>
                  <span className="radio-circle">
                    <AnimatePresence>
                      {sel && (
                        <motion.span key="dot" className="radio-circle-dot" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} transition={{ type: 'spring', stiffness: 500, damping: 25 }} />
                      )}
                    </AnimatePresence>
                  </span>
                  <span className="radio-idx">{String(q.options.length + 1).padStart(2, '0')}</span>
                  <span className="radio-label">Другое</span>
                  <span className="radio-arrow">
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <path d="M3 7h8M8 4l3 3-3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                </motion.button>
                <AnimatePresence>
                  {sel && (
                    <motion.div className="other-input-wrap" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.2 }}>
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
                <motion.div className="scale-track-fill" animate={{ width: selected !== null ? `${fillPct}%` : '0%' }} transition={{ type: 'spring', stiffness: 300, damping: 30 }} />
                {selected !== null && (
                  <motion.div className="scale-thumb" animate={{ left: `${fillPct}%` }} transition={{ type: 'spring', stiffness: 300, damping: 30 }} style={{ background: scaleColor((selected - min) / (max - min)) }}>
                    <span className="scale-thumb-val">{selected}</span>
                  </motion.div>
                )}
              </div>
              <div className="scale-ticks-overlay">
                {ticks.map(n => (
                  <button key={n} className="scale-tick-zone" onClick={() => setForm({ ...form, answers: { ...form.answers, [q.id]: String(n) } })} aria-label={String(n)} />
                ))}
              </div>
            </div>
            <div className="scale-numbers">
              {ticks.map(n => {
                const isOn = selected === n
                const isPast = selected !== null && n <= selected
                return (
                  <button key={n} className={`scale-num ${isOn ? 'scale-num--on' : ''} ${isPast && !isOn ? 'scale-num--past' : ''}`} style={isOn ? { color: scaleColor((n - min) / (max - min)) } : {}} onClick={() => setForm({ ...form, answers: { ...form.answers, [q.id]: String(n) } })}>
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
