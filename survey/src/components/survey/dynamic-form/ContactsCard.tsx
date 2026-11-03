import { AnimatePresence, motion } from 'framer-motion'
import type { ResolvedContactsBlock } from '../../../lib/contactsBlock'
import { contactsStepComplete } from '../../../lib/contactsBlock'
import type { DynamicFormData, DynamicSetForm } from './types'
import { slideVariants } from './utils'

interface ContactsCardProps {
  block: ResolvedContactsBlock
  form: DynamicFormData
  setForm: DynamicSetForm
  questionsCount: number
  token?: string
  dir: number
}

export function ContactsCard({ block, form, setForm, questionsCount, token, dir }: ContactsCardProps) {
  const done = contactsStepComplete(form, block)
  const { fields } = block
  const showEmail = fields.email.enabled && (!token || !block.hideEmailWhenToken || !form.email.trim())

  const rowHalf =
    fields.name.enabled && fields.phone.enabled
      ? 'field'
      : fields.name.enabled || fields.phone.enabled
        ? 'field field--full'
        : 'field'

  return (
    <motion.div
      custom={dir}
      variants={slideVariants}
      initial="enter"
      animate="center"
      exit="exit"
      className={`card qcard ${done ? 'card--done' : ''}`}
    >
      <div className={`qcard-stripe ${done ? 'qcard-stripe--done' : ''}`} />
      <div className="qcard-bg-num" aria-hidden="true">{String(questionsCount + 1).padStart(2, '0')}</div>

      <div className="qcard-head">
        <div className="qcard-step">
          <span className={`qcard-step-pill ${done ? 'qcard-step-pill--done' : ''}`}>
            <AnimatePresence mode="wait">
              {done ? (
                <motion.span key="done" className="qcard-step-pill-inner" initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
                  <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
                    <path d="M1.5 4.5l2 2 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  {block.stepPillDoneLabel}
                </motion.span>
              ) : (
                <motion.span key="num" className="qcard-step-pill-inner" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  {block.stepPillLabel}
                </motion.span>
              )}
            </AnimatePresence>
          </span>
        </div>
        <h3 className="qcard-title">{block.title}</h3>
        <p className="qcard-sub">{block.subtitle}</p>
      </div>

      <div className="fields">
        {fields.name.enabled && (
          <div className={fields.phone.enabled ? rowHalf : 'field field--full'}>
            <label htmlFor="dyn-name">{fields.name.label}</label>
            <div className="field-wrap">
              <span className="field-icon">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <circle cx="7" cy="4.5" r="2.5" stroke="currentColor" strokeWidth="1.3" />
                  <path d="M2 12c0-2.2 2.2-4 5-4s5 1.8 5 4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                </svg>
              </span>
              <input id="dyn-name" required={fields.name.required} maxLength={200} type="text" placeholder={fields.name.placeholder} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            </div>
          </div>
        )}
        {fields.phone.enabled && (
          <div className={fields.name.enabled ? rowHalf : 'field field--full'}>
            <label htmlFor="dyn-phone">{fields.phone.label}</label>
            <div className="field-wrap">
              <span className="field-icon">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M4.5 2h5a1 1 0 011 1v8a1 1 0 01-1 1h-5a1 1 0 01-1-1V3a1 1 0 011-1z" stroke="currentColor" strokeWidth="1.3" />
                  <circle cx="7" cy="10" r="0.6" fill="currentColor" />
                </svg>
              </span>
              <input id="dyn-phone" required={fields.phone.required} maxLength={30} type="tel" placeholder={fields.phone.placeholder} value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
            </div>
          </div>
        )}
        {showEmail && (
          <div className="field field--full">
            <label htmlFor="dyn-email">
              {fields.email.label}
              {!fields.email.required && fields.email.showOptionalHint ? (
                <span className="optional"> (необязательно)</span>
              ) : null}
            </label>
            <div className="field-wrap">
              <span className="field-icon">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <rect x="1.5" y="3" width="11" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
                  <path d="M1.5 5l5.5 3.5L12.5 5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                </svg>
              </span>
              <input id="dyn-email" required={fields.email.required} maxLength={200} type="email" placeholder={fields.email.placeholder} value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
            </div>
          </div>
        )}
        {fields.comment.enabled && (
          <div className="field field--full">
            <label htmlFor="dyn-comment">
              {fields.comment.label}
              {!fields.comment.required && fields.comment.showOptionalHint ? (
                <span className="optional"> (необязательно)</span>
              ) : null}
            </label>
            <textarea id="dyn-comment" required={fields.comment.required} maxLength={2000} placeholder={fields.comment.placeholder} value={form.comment} onChange={e => setForm({ ...form, comment: e.target.value })} rows={3} />
          </div>
        )}
      </div>
    </motion.div>
  )
}
