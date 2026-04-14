import { useState } from 'react'
import { motion, AnimatePresence, easeOut } from 'framer-motion'
import type { SurveyQuestion } from '../../lib/supabase'
import { LiveQuestionEditorModal } from './LiveQuestionEditorModal'
import { ContactsCard } from './dynamic-form/ContactsCard'
import { QuestionCard } from './dynamic-form/QuestionCard'
import type { DynamicFormData, DynamicFormStatus } from './dynamic-form/types'
import { emptyDynamicFormData } from './dynamic-form/types'
import { isContactsDone } from './dynamic-form/utils'

export type { DynamicFormData }

// eslint-disable-next-line react-refresh/only-export-components
export function emptyFormData(questions: SurveyQuestion[]): DynamicFormData {
  return emptyDynamicFormData(questions)
}

interface Props {
  questions: SurveyQuestion[]
  form: DynamicFormData
  setForm: (f: DynamicFormData) => void
  status: DynamicFormStatus
  canSubmit: boolean
  consent: boolean
  setConsent: (v: boolean) => void
  handleSubmit: () => void
  errorMsg: string
  token?: string
  liveEdit?: boolean
  onLiveQuestionSave?: (q: SurveyQuestion, index: number) => Promise<void>
}

export function DynamicSurveyForm({
  questions,
  form,
  setForm,
  status,
  canSubmit,
  consent,
  setConsent,
  handleSubmit,
  errorMsg,
  token,
  liveEdit,
  onLiveQuestionSave,
}: Props) {
  const totalSteps = questions.length + 1
  const [step, setStep] = useState(0)
  const [dir, setDir] = useState(1)
  const [viewMode, setViewMode] = useState<'stepped' | 'all'>('stepped')
  const [liveModal, setLiveModal] = useState<{ q: SurveyQuestion; idx: number } | null>(null)

  function goNext() {
    if (step < totalSteps - 1) {
      setDir(1)
      setStep(s => s + 1)
    }
  }

  function goPrev() {
    if (step > 0) {
      setDir(-1)
      setStep(s => s - 1)
    }
  }

  function isAnswered(q: SurveyQuestion): boolean {
    if (q.type === 'checkbox') return (form.answers[q.id] as string[]).length > 0
    return !!form.answers[q.id]
  }

  const contactsDone = isContactsDone(form)
  const isLastStep = step === totalSteps - 1
  const canGoNext = step < questions.length ? isAnswered(questions[step]) : contactsDone
  const steps = [...questions.map(q => ({ done: isAnswered(q) })), { done: contactsDone }]

  const consentCard = (
    <motion.label className={`consent-card consent-card--inline ${consent ? 'consent-card--on' : ''}`} whileTap={{ scale: 0.99 }}>
      <input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} className="consent-checkbox-hidden" />
      <span className="consent-box">
        <AnimatePresence>
          {consent && (
            <motion.svg key="check" width="12" height="12" viewBox="0 0 12 12" fill="none" initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.5 }} transition={{ duration: 0.18 }}>
              <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </motion.svg>
          )}
        </AnimatePresence>
      </span>
      <span className="consent-body">
        <span className="consent-title">Согласие на обработку данных</span>
        <span className="consent-sub">Нажимая «Отправить», вы соглашаетесь с политикой конфиденциальности</span>
      </span>
    </motion.label>
  )

  const submitButtonEl = (
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
            <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </>
      ) : !consent ? 'Подтвердите согласие' : 'Заполните контакты'}
    </motion.button>
  )

  return (
    <div className={`survey survey--stepped${viewMode === 'all' ? ' survey--all' : ''}`}>
      <motion.div className="sf-topbar" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, ease: easeOut }}>
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
                      <motion.svg key="check" width="9" height="9" viewBox="0 0 9 9" fill="none" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} transition={{ type: 'spring', stiffness: 400, damping: 20 }}>
                        <path d="M1.5 4.5l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
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
                    <motion.div className="sf-step-line-fill" animate={{ width: s.done ? '100%' : '0%' }} transition={{ duration: 0.4, ease: easeOut }} />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {viewMode === 'all' && <div className="sf-all-counter">{steps.filter(s => s.done).length}/{totalSteps} заполнено</div>}

        <div className="sf-view-toggle">
          <button className={`sf-view-btn ${viewMode === 'stepped' ? 'sf-view-btn--on' : ''}`} onClick={() => setViewMode('stepped')} title="По одному">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <rect x="1" y="3" width="12" height="8" rx="2" stroke="currentColor" strokeWidth="1.3" />
            </svg>
            По одному
          </button>
          <button className={`sf-view-btn ${viewMode === 'all' ? 'sf-view-btn--on' : ''}`} onClick={() => setViewMode('all')} title="Все сразу">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <rect x="1" y="1" width="12" height="4" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
              <rect x="1" y="6.5" width="12" height="4" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
              <rect x="1" y="12" width="12" height="1" rx="0.5" fill="currentColor" opacity="0.3" />
            </svg>
            Все сразу
          </button>
        </div>
      </motion.div>

      {viewMode === 'stepped' && (
        <>
          <div className="sf-card-wrap">
            <AnimatePresence mode="wait" custom={dir}>
              {step < questions.length ? (
                <QuestionCard
                  key={questions[step].id}
                  q={questions[step]}
                  idx={step}
                  form={form}
                  setForm={setForm}
                  dir={dir}
                  liveEdit={!!liveEdit && !!onLiveQuestionSave}
                  onLiveEditClick={() => setLiveModal({ q: questions[step], idx: step })}
                />
              ) : (
                <ContactsCard key="contacts" form={form} setForm={setForm} questionsCount={questions.length} token={token} dir={dir} />
              )}
            </AnimatePresence>
          </div>

          <motion.div className={`sf-nav${isLastStep ? ' sf-nav--final' : ''}`} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.15, ease: easeOut }}>
            {isLastStep ? (
              <>
                <div className="sf-nav-final-consent">
                  {consentCard}
                  {status === 'error' && <p className="err-msg">{errorMsg}</p>}
                </div>
                {submitButtonEl}
                <button type="button" className="sf-nav-btn sf-nav-btn--back" onClick={goPrev} disabled={step === 0}>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  Назад
                </button>
              </>
            ) : (
              <>
                <button type="button" className="sf-nav-btn sf-nav-btn--back" onClick={goPrev} disabled={step === 0}>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  Назад
                </button>
                <button type="button" className={`sf-nav-btn sf-nav-btn--next ${canGoNext ? 'sf-nav-btn--active' : ''}`} onClick={goNext} disabled={!canGoNext}>
                  Далее
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              </>
            )}
          </motion.div>
        </>
      )}

      {viewMode === 'all' && (
        <motion.div className="sf-all-list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3, ease: easeOut }}>
          {questions.map((q, idx) => (
            <QuestionCard
              key={q.id}
              q={q}
              idx={idx}
              form={form}
              setForm={setForm}
              dir={0}
              liveEdit={!!liveEdit && !!onLiveQuestionSave}
              onLiveEditClick={() => setLiveModal({ q, idx })}
            />
          ))}
          <ContactsCard form={form} setForm={setForm} questionsCount={questions.length} token={token} dir={0} />
          <div className="sf-nav-submit-wrap">
            {consentCard}
            {status === 'error' && <p className="err-msg">{errorMsg}</p>}
            {submitButtonEl}
          </div>
        </motion.div>
      )}

      {liveModal && onLiveQuestionSave && (
        <LiveQuestionEditorModal
          open
          question={liveModal.q}
          questionIndex={liveModal.idx}
          onClose={() => setLiveModal(null)}
          onSave={nq => onLiveQuestionSave(nq, liveModal.idx)}
        />
      )}
    </div>
  )
}
