import { AnimatePresence, motion } from 'framer-motion'
import type { DynamicFormData, DynamicSetForm } from './types'
import { isContactsDone, slideVariants } from './utils'

interface ContactsCardProps {
  form: DynamicFormData
  setForm: DynamicSetForm
  questionsCount: number
  token?: string
  dir: number
}

export function ContactsCard({ form, setForm, questionsCount, token, dir }: ContactsCardProps) {
  const done = isContactsDone(form)

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
                  Готово
                </motion.span>
              ) : (
                <motion.span key="num" className="qcard-step-pill-inner" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  Контакты
                </motion.span>
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
                <circle cx="7" cy="4.5" r="2.5" stroke="currentColor" strokeWidth="1.3" />
                <path d="M2 12c0-2.2 2.2-4 5-4s5 1.8 5 4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
              </svg>
            </span>
            <input id="dyn-name" type="text" placeholder="Иван Петров" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
          </div>
        </div>
        <div className="field">
          <label htmlFor="dyn-phone">Телефон</label>
          <div className="field-wrap">
            <span className="field-icon">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M4.5 2h5a1 1 0 011 1v8a1 1 0 01-1 1h-5a1 1 0 01-1-1V3a1 1 0 011-1z" stroke="currentColor" strokeWidth="1.3" />
                <circle cx="7" cy="10" r="0.6" fill="currentColor" />
              </svg>
            </span>
            <input id="dyn-phone" type="tel" placeholder="+7 999 000 00 00" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
          </div>
        </div>
        {!token && (
          <div className="field field--full">
            <label htmlFor="dyn-email">Email <span className="optional">(необязательно)</span></label>
            <div className="field-wrap">
              <span className="field-icon">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <rect x="1.5" y="3" width="11" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
                  <path d="M1.5 5l5.5 3.5L12.5 5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                </svg>
              </span>
              <input id="dyn-email" type="email" placeholder="ivan@company.ru" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
            </div>
          </div>
        )}
        <div className="field field--full">
          <label htmlFor="dyn-comment">Комментарий <span className="optional">(необязательно)</span></label>
          <textarea id="dyn-comment" placeholder="Опишите задачу или вопрос..." value={form.comment} onChange={e => setForm({ ...form, comment: e.target.value })} rows={3} />
        </div>
      </div>
    </motion.div>
  )
}
