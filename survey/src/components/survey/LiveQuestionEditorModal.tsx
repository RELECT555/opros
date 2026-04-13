import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import type { SurveyQuestion, QuestionMediaKind } from '../../lib/supabase'
import {
  questionMediaHasContent,
  isSafeMediaUrl,
  toEmbedIframeSrc,
  isHostAllowedForIframeEmbed,
  shouldRenderVideoAsEmbed,
} from '../../lib/questionMedia'
import { QuestionMediaBlock } from './QuestionMediaBlock'

type Props = {
  open: boolean
  question: SurveyQuestion
  /** Индекс вопроса (номер на карточке в превью) */
  questionIndex: number
  onClose: () => void
  onSave: (q: SurveyQuestion) => Promise<void>
}

function cloneQuestion(q: SurveyQuestion): SurveyQuestion {
  return JSON.parse(JSON.stringify(q)) as SurveyQuestion
}

function mediaPreviewHint(q: SurveyQuestion): string | null {
  const m = q.media
  if (!m?.kind || !m.url?.trim()) return null
  const url = m.url.trim()
  if (!isSafeMediaUrl(url)) return 'Укажите корректный URL (http/https)'
  if (m.kind === 'video' && shouldRenderVideoAsEmbed(url)) {
    const src = toEmbedIframeSrc(url)
    if (!src || !isHostAllowedForIframeEmbed(src)) {
      return 'Видео по ссылке: YouTube, Vimeo или Rutube'
    }
  }
  if (m.kind === 'embed') {
    const src = toEmbedIframeSrc(url)
    if (!src || !isHostAllowedForIframeEmbed(src)) {
      return 'Встраивание: YouTube, Vimeo или Rutube'
    }
  }
  return null
}

function LiveQuestionDraftPreview({ q, index }: { q: SurveyQuestion; index: number }) {
  const opts = (q.type === 'checkbox' || q.type === 'radio')
    ? q.options.map(o => o.trim()).filter(Boolean)
    : []
  const mediaHint = mediaPreviewHint(q)
  const min = q.scaleMin ?? 1
  const max = q.scaleMax ?? 10
  const ticks = Array.from({ length: max - min + 1 }, (_, i) => i + min)

  return (
    <div className="card qcard lqe-preview-card">
      <div className="qcard-stripe" />
      <div className="qcard-bg-num" aria-hidden="true">{String(index + 1).padStart(2, '0')}</div>
      <div className="qcard-head">
        <div className="qcard-step">
          <span className="qcard-step-pill">
            <span className="qcard-step-pill-inner">Вопрос {index + 1}</span>
          </span>
        </div>
        <h3 className="qcard-title">{q.title.trim() || 'Заголовок вопроса'}</h3>
        {q.subtitle?.trim() ? <p className="qcard-sub">{q.subtitle}</p> : null}
      </div>

      {(questionMediaHasContent(q.media) && q.media) || mediaHint ? (
        <div className="qcard-media-slot">
          {questionMediaHasContent(q.media) && q.media ? <QuestionMediaBlock media={q.media} /> : null}
          {mediaHint ? <p className="lqe-preview-hint">{mediaHint}</p> : null}
        </div>
      ) : null}

      {q.type === 'checkbox' && (q.optionsLayout === 'list' ? (
        <div className="checkbox-list lqe-preview-interactive-off">
          {[...opts, ...(q.hasOther ? ['__other__'] : [])].map((opt, i) => {
            const label = opt === '__other__' ? 'Другое' : opt
            return (
              <div key={`${opt}-${i}`} className="checkbox-row">
                <span className="checkbox-row-ctrl" aria-hidden />
                <span className="checkbox-row-idx">{String(i + 1).padStart(2, '0')}</span>
                <span className="checkbox-row-label">{label}</span>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="chips chips--grid lqe-preview-interactive-off">
          {opts.map(opt => (
            <div key={opt} className="chip">
              <span className="chip-ctrl" aria-hidden />
              {opt}
            </div>
          ))}
          {q.hasOther ? (
            <div className="chip">
              <span className="chip-ctrl" aria-hidden />
              Другое
            </div>
          ) : null}
        </div>
      ))}

      {q.type === 'radio' && q.optionsLayout === 'list' && (
        <div className="radio-list lqe-preview-interactive-off">
          {opts.map((opt, i) => (
            <div key={opt} className="radio-btn">
              <span className="radio-circle" aria-hidden />
              <span className="radio-idx">{String(i + 1).padStart(2, '0')}</span>
              <span className="radio-label">{opt}</span>
              <span className="radio-arrow" aria-hidden>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M3 7h8M8 4l3 3-3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </span>
            </div>
          ))}
          {q.hasOther ? (
            <div className="radio-btn">
              <span className="radio-circle" aria-hidden />
              <span className="radio-idx">{String(opts.length + 1).padStart(2, '0')}</span>
              <span className="radio-label">Другое</span>
              <span className="radio-arrow" aria-hidden>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M3 7h8M8 4l3 3-3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </span>
            </div>
          ) : null}
        </div>
      )}

      {q.type === 'radio' && q.optionsLayout !== 'list' && (
        <div className="chips chips--grid lqe-preview-interactive-off">
          {opts.map(opt => (
            <div key={opt} className="chip">
              <span className="chip-ctrl" aria-hidden />
              {opt}
            </div>
          ))}
        </div>
      )}

      {q.type === 'text' && (
        <div className="text-answer-wrap">
          <textarea className="text-answer" placeholder="Введите ваш ответ…" rows={3} readOnly disabled />
        </div>
      )}

      {q.type === 'scale' && (
        <div className="scale-wrap lqe-preview-interactive-off">
          <div className="scale-numbers">
            {ticks.map(n => (
              <span key={n} className="scale-num">{n}</span>
            ))}
          </div>
          <div className="scale-labels">
            <span>Низко</span>
            <span>Высоко</span>
          </div>
        </div>
      )}
    </div>
  )
}

export function LiveQuestionEditorModal({ open, question, questionIndex, onClose, onSave }: Props) {
  const [draft, setDraft] = useState<SurveyQuestion>(() => cloneQuestion(question))
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  useEffect(() => {
    if (open) {
      setDraft(cloneQuestion(question))
      setErr('')
    }
  }, [open, question])

  async function handleSave() {
    setSaving(true)
    setErr('')
    try {
      const next: SurveyQuestion = {
        ...draft,
        id: question.id,
        title: draft.title.trim(),
        subtitle: draft.subtitle?.trim() || undefined,
        options:
          draft.type === 'checkbox' || draft.type === 'radio'
            ? draft.options.map(o => o.trim()).filter(Boolean).length
              ? draft.options.map(o => o.trim()).filter(Boolean)
              : ['']
            : draft.options,
      }
      if ((next.type === 'checkbox' || next.type === 'radio') && next.options.length === 0) {
        next.options = ['']
      }
      if (next.type === 'scale') {
        const a = Number(draft.scaleMin) || 1
        const b = Number(draft.scaleMax) || 10
        next.scaleMin = Math.min(a, b)
        next.scaleMax = Math.max(a, b)
      }
      if (!next.media?.url?.trim()) {
        next.media = undefined
      }
      await onSave(next)
      onClose()
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Не удалось сохранить')
    } finally {
      setSaving(false)
    }
  }

  function setMediaKind(kind: QuestionMediaKind | null) {
    if (kind === null) {
      setDraft(d => ({ ...d, media: undefined }))
      return
    }
    setDraft(d => ({
      ...d,
      media: { kind, url: d.media?.url ?? '', alt: d.media?.alt },
    }))
  }

  if (typeof document === 'undefined') return null

  const optionsText = (draft.type === 'checkbox' || draft.type === 'radio')
    ? draft.options.join('\n')
    : ''

  const panel = (
    <AnimatePresence>
      {open && (
        <motion.div
          className="lqe-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={e => { if (e.target === e.currentTarget) onClose() }}
          role="presentation"
        >
          <motion.div
            className="lqe-panel"
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            onClick={e => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="lqe-title"
          >
            <div className="lqe-head">
              <h2 id="lqe-title" className="lqe-title">Редактировать вопрос</h2>
              <button type="button" className="lqe-close" onClick={onClose} aria-label="Закрыть">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </button>
            </div>

            <div className="lqe-split">
              <div className="lqe-col lqe-col--form">
                <div className="lqe-body">
                  <label className="lqe-field">
                    <span className="lqe-label">Заголовок</span>
                    <input
                      className="lqe-input"
                      value={draft.title}
                      onChange={e => setDraft(d => ({ ...d, title: e.target.value }))}
                    />
                  </label>
                  <label className="lqe-field">
                    <span className="lqe-label">Подзаголовок</span>
                    <input
                      className="lqe-input"
                      value={draft.subtitle ?? ''}
                      onChange={e => setDraft(d => ({ ...d, subtitle: e.target.value }))}
                    />
                  </label>

                  <div className="lqe-field">
                    <span className="lqe-label">Медиа</span>
                    <div className="lqe-toggle-row">
                      <button type="button" className={`lqe-chip ${!draft.media ? 'lqe-chip--on' : ''}`} onClick={() => setMediaKind(null)}>Нет</button>
                      <button type="button" className={`lqe-chip ${draft.media?.kind === 'image' ? 'lqe-chip--on' : ''}`} onClick={() => setMediaKind('image')}>Картинка</button>
                      <button type="button" className={`lqe-chip ${draft.media?.kind === 'video' ? 'lqe-chip--on' : ''}`} onClick={() => setMediaKind('video')}>Видео</button>
                      <button type="button" className={`lqe-chip ${draft.media?.kind === 'embed' ? 'lqe-chip--on' : ''}`} onClick={() => setMediaKind('embed')}>Встраивание</button>
                    </div>
                    {draft.media && (
                      <>
                        <input
                          className="lqe-input lqe-input--mt"
                          type="url"
                          placeholder="https://…"
                          value={draft.media.url}
                          onChange={e => setDraft(d => ({ ...d, media: { ...d.media!, url: e.target.value } }))}
                        />
                        <input
                          className="lqe-input"
                          type="text"
                          placeholder={draft.media.kind === 'image' ? 'Описание (alt)' : 'Заголовок плеера'}
                          value={draft.media.alt ?? ''}
                          onChange={e => setDraft(d => ({ ...d, media: { ...d.media!, alt: e.target.value } }))}
                        />
                      </>
                    )}
                  </div>

                  <div className="lqe-field">
                    <span className="lqe-label">Тип</span>
                    <div className="lqe-toggle-row lqe-toggle-row--wrap">
                      <button
                        type="button"
                        className={`lqe-chip ${draft.type === 'checkbox' ? 'lqe-chip--on' : ''}`}
                        onClick={() => setDraft(d => ({ ...d, type: 'checkbox', options: d.options?.length ? d.options : [''] }))}
                      >Несколько</button>
                      <button
                        type="button"
                        className={`lqe-chip ${draft.type === 'radio' ? 'lqe-chip--on' : ''}`}
                        onClick={() => setDraft(d => ({ ...d, type: 'radio', options: d.options?.length ? d.options : [''] }))}
                      >Один</button>
                      <button
                        type="button"
                        className={`lqe-chip ${draft.type === 'text' ? 'lqe-chip--on' : ''}`}
                        onClick={() => setDraft(d => ({ ...d, type: 'text' }))}
                      >Текст</button>
                      <button
                        type="button"
                        className={`lqe-chip ${draft.type === 'scale' ? 'lqe-chip--on' : ''}`}
                        onClick={() => setDraft(d => ({ ...d, type: 'scale', scaleMin: d.scaleMin ?? 1, scaleMax: d.scaleMax ?? 10 }))}
                      >Шкала</button>
                    </div>
                  </div>

                  {(draft.type === 'checkbox' || draft.type === 'radio') && (
                    <>
                      <div className="lqe-field">
                        <span className="lqe-label">Варианты (каждый с новой строки)</span>
                        <textarea
                          className="lqe-textarea lqe-textarea--options"
                          rows={6}
                          value={optionsText}
                          onChange={e => setDraft(d => ({
                            ...d,
                            options: e.target.value.split('\n').map(s => s.trimEnd()),
                          }))}
                        />
                      </div>
                      <label className="lqe-check">
                        <input
                          type="checkbox"
                          checked={!!draft.hasOther}
                          onChange={e => setDraft(d => ({ ...d, hasOther: e.target.checked }))}
                        />
                        Вариант «Другое»
                      </label>
                      <div className="lqe-field">
                        <span className="lqe-label">Вид</span>
                        <div className="lqe-toggle-row">
                          <button
                            type="button"
                            className={`lqe-chip ${!draft.optionsLayout || draft.optionsLayout === 'grid' ? 'lqe-chip--on' : ''}`}
                            onClick={() => setDraft(d => ({ ...d, optionsLayout: 'grid' }))}
                          >Плитки</button>
                          <button
                            type="button"
                            className={`lqe-chip ${draft.optionsLayout === 'list' ? 'lqe-chip--on' : ''}`}
                            onClick={() => setDraft(d => ({ ...d, optionsLayout: 'list' }))}
                          >Список</button>
                        </div>
                      </div>
                    </>
                  )}

                  {draft.type === 'scale' && (
                    <div className="lqe-scale-row">
                      <label className="lqe-field lqe-field--inline">
                        <span className="lqe-label">От</span>
                        <input
                          className="lqe-input lqe-input--num"
                          type="number"
                          value={draft.scaleMin ?? 1}
                          onChange={e => setDraft(d => ({ ...d, scaleMin: Number(e.target.value) || 1 }))}
                        />
                      </label>
                      <label className="lqe-field lqe-field--inline">
                        <span className="lqe-label">До</span>
                        <input
                          className="lqe-input lqe-input--num"
                          type="number"
                          value={draft.scaleMax ?? 10}
                          onChange={e => setDraft(d => ({ ...d, scaleMax: Number(e.target.value) || 10 }))}
                        />
                      </label>
                    </div>
                  )}

                  {err && <p className="lqe-err">{err}</p>}
                </div>
              </div>

              <div className="lqe-col lqe-col--preview">
                <div className="lqe-preview-caption">Как видят респонденты</div>
                <div className="lqe-preview-scroll">
                  <LiveQuestionDraftPreview q={draft} index={questionIndex} />
                </div>
              </div>
            </div>

            <div className="lqe-foot">
              <button type="button" className="lqe-btn lqe-btn--ghost" onClick={onClose} disabled={saving}>Отмена</button>
              <button type="button" className="lqe-btn lqe-btn--primary" onClick={handleSave} disabled={saving || !draft.title.trim()}>
                {saving ? 'Сохранение…' : 'Сохранить'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )

  return createPortal(panel, document.body)
}
