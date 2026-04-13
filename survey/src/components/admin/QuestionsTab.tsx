import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence, easeOut } from 'framer-motion'
import { getSurveyById, updateSurveyConfig } from '../../lib/supabase'
import type { Survey, SurveyQuestion, SurveyConfigData } from '../../lib/supabase'

interface ConfirmState {
  open: boolean
  title: string
  message: string
  resolve: ((ok: boolean) => void) | null
}

function useConfirm() {
  const [state, setState] = useState<ConfirmState>({ open: false, title: '', message: '', resolve: null })

  const confirm = useCallback((title: string, message: string): Promise<boolean> => {
    return new Promise(resolve => {
      setState({ open: true, title, message, resolve })
    })
  }, [])

  const handleClose = useCallback((ok: boolean) => {
    setState(s => { s.resolve?.(ok); return { ...s, open: false, resolve: null } })
  }, [])

  const dialog = state.open ? (
    <div className="confirm-overlay" onClick={() => handleClose(false)}>
      <motion.div
        className="confirm-dialog"
        initial={{ opacity: 0, scale: 0.95, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 8 }}
        transition={{ duration: 0.15 }}
        onClick={e => e.stopPropagation()}
      >
        <p className="confirm-title">{state.title}</p>
        {state.message && <p className="confirm-msg">{state.message}</p>}
        <div className="confirm-actions">
          <button className="confirm-btn-cancel" onClick={() => handleClose(false)}>Отмена</button>
          <button className="confirm-btn-delete" onClick={() => handleClose(true)}>Удалить</button>
        </div>
      </motion.div>
    </div>
  ) : null

  return { confirm, dialog }
}

interface Props {
  surveyId: number
  onSurveyUpdate: (survey: Survey) => void
}

function newQuestion(): SurveyQuestion {
  return {
    id: `q_${Date.now()}`,
    type: 'checkbox',
    title: '',
    subtitle: '',
    options: [''],
  }
}

export function QuestionsTab({ surveyId, onSurveyUpdate }: Props) {
  const [_survey, setSurvey] = useState<Survey | null>(null)
  const [config, setConfig] = useState<SurveyConfigData>({ questions: [] })
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [dirty, setDirty] = useState(false)
  const [loading, setLoading] = useState(true)
  const { confirm, dialog } = useConfirm()

  useEffect(() => {
    setLoading(true)
    getSurveyById(surveyId)
      .then(s => {
        if (!s) return
        setSurvey(s)
        setConfig(s.config)
        setDirty(false)
      })
      .finally(() => setLoading(false))
  }, [surveyId])

  function update(fn: (c: SurveyConfigData) => SurveyConfigData) {
    setConfig(fn)
    setDirty(true)
    setSaved(false)
  }

  async function save() {
    setSaving(true)
    setSaveError('')
    try {
      await updateSurveyConfig(surveyId, config)
      setSaved(true)
      setDirty(false)
      setTimeout(() => setSaved(false), 2500)
      // обновляем survey в родителе
      const updated = await getSurveyById(surveyId)
      if (updated) onSurveyUpdate(updated)
    } catch (e: unknown) {
      setSaveError(e instanceof Error ? e.message : 'Ошибка сохранения')
    } finally {
      setSaving(false)
    }
  }

  function addQuestion() {
    update(c => ({ ...c, questions: [...c.questions, newQuestion()] }))
  }

  async function removeQuestion(idx: number) {
    const ok = await confirm('Удалить вопрос?', 'Это действие нельзя отменить.')
    if (!ok) return
    update(c => ({ ...c, questions: c.questions.filter((_, i) => i !== idx) }))
  }

  function updateQuestion(idx: number, patch: Partial<SurveyQuestion>) {
    update(c => ({
      ...c,
      questions: c.questions.map((q, i) => i === idx ? { ...q, ...patch } : q),
    }))
  }

  function addOption(idx: number) {
    update(c => ({
      ...c,
      questions: c.questions.map((q, i) => i === idx
        ? { ...q, options: [...q.options, ''] }
        : q),
    }))
  }

  function updateOption(qIdx: number, oIdx: number, val: string) {
    update(c => ({
      ...c,
      questions: c.questions.map((q, i) => i === qIdx
        ? { ...q, options: q.options.map((o, j) => j === oIdx ? val : o) }
        : q),
    }))
  }

  async function removeOption(qIdx: number, oIdx: number) {
    const ok = await confirm('Удалить вариант?', '')
    if (!ok) return
    update(c => ({
      ...c,
      questions: c.questions.map((q, i) => i === qIdx
        ? { ...q, options: q.options.filter((_, j) => j !== oIdx) }
        : q),
    }))
  }

  function moveQuestion(idx: number, dir: -1 | 1) {
    update(c => {
      const qs = [...c.questions]
      const target = idx + dir
      if (target < 0 || target >= qs.length) return c;
      [qs[idx], qs[target]] = [qs[target], qs[idx]]
      return { ...c, questions: qs }
    })
  }

  if (loading) {
    return (
      <div className="adm-tab-content">
        <div className="adm-loading-rows">
          {[1,2,3].map(i => <div key={i} className="adm-skeleton" style={{ opacity: 1 - i * 0.25 }} />)}
        </div>
      </div>
    )
  }

  return (
    <div className="adm-tab-content qed-root">
      {/* Header */}
      <div className="qed-header">
        <div className="qed-header-left">
          <div className="qed-header-icon">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M11 2.5l2.5 2.5-8 8H3v-2.5l8-8z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
            </svg>
          </div>
          <div>
            <h2 className="qed-header-title">Редактор вопросов</h2>
            <p className="qed-header-sub">{config.questions.length} {config.questions.length === 1 ? 'вопрос' : config.questions.length < 5 ? 'вопроса' : 'вопросов'}</p>
          </div>
          {dirty && <span className="qed-unsaved-dot" title="Есть несохранённые изменения" />}
        </div>
        <button className="qed-add-btn" onClick={addQuestion}>
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
            <path d="M6.5 2v9M2 6.5h9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          Добавить вопрос
        </button>
      </div>

      {/* Welcome settings */}
      <div className="qed-welcome-card">
        <div className="qed-welcome-left">
          <div className="qed-welcome-icon">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M9 2C5.13 2 2 5.13 2 9s3.13 7 7 7 7-3.13 7-7-3.13-7-7-7zm0 3a2 2 0 1 1 0 4 2 2 0 0 1 0-4zm0 9.2a5.04 5.04 0 0 1-4.2-2.26C4.81 10.28 7.53 9.6 9 9.6c1.47 0 4.19.68 4.2 2.34A5.04 5.04 0 0 1 9 14.2z" fill="currentColor"/>
            </svg>
          </div>
          <div>
            <p className="qed-welcome-label">Экран приветствия</p>
            <p className="qed-welcome-desc">Первый экран, который видит пользователь</p>
          </div>
        </div>
        <div className="qed-welcome-fields">
          <div className="qed-field">
            <label className="qed-field-label">Заголовок</label>
            <input
              className="qed-field-input"
              type="text"
              placeholder="Помогите нам стать лучше для вас"
              value={config.welcome_title ?? ''}
              onChange={e => update(c => ({ ...c, welcome_title: e.target.value }))}
            />
          </div>
          <div className="qed-field">
            <label className="qed-field-label">Подзаголовок</label>
            <input
              className="qed-field-input"
              type="text"
              placeholder="Пройдите короткий опрос..."
              value={config.welcome_sub ?? ''}
              onChange={e => update(c => ({ ...c, welcome_sub: e.target.value }))}
            />
          </div>
        </div>
      </div>
      {saveError && <p className="adm-err-banner">{saveError}</p>}

      {/* Questions */}
      <div className="qed-list">
        {config.questions.length === 0 && (
          <div className="adm-empty">
            <p>Вопросов нет</p>
            <span>Нажмите «Добавить вопрос» чтобы начать</span>
          </div>
        )}

        <AnimatePresence initial={false}>
          {config.questions.map((q, idx) => (
            <motion.div
              key={q.id}
              className="qed-card adm-card"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2, ease: easeOut }}
            >
              {/* Left panel */}
              <div className="qed-card-left">
                <div className="qed-num-badge">{String(idx + 1).padStart(2, '0')}</div>
                <div className="qed-meta">
                  <span className={`qed-type-badge qed-type-badge--${q.type}`}>
                    {q.type === 'checkbox' && <><CheckboxIcon /> Чекбоксы</>}
                    {q.type === 'radio' && <><RadioIcon /> Радио</>}
                    {q.type === 'text' && <><TextIcon /> Текст</>}
                    {q.type === 'scale' && <><ScaleIcon /> Шкала</>}
                  </span>
                  {(q.type === 'checkbox' || q.type === 'radio') && (
                    <span className="qed-opt-count">{q.options.length} вариантов</span>
                  )}
                </div>
                <div className="qed-preview">
                  <p className="qed-preview-title">{q.title || <span className="qed-preview-empty">Заголовок...</span>}</p>
                  {q.subtitle && <p className="qed-preview-sub">{q.subtitle}</p>}
                  {(q.type === 'checkbox' || q.type === 'radio') && (
                    <div className="qed-preview-opts">
                      {q.options.slice(0, 3).map((o, i) => (
                        <div key={i} className="qed-preview-opt">
                          <span className={`qed-preview-ctrl qed-preview-ctrl--${q.type}`} />
                          <span>{o || '—'}</span>
                        </div>
                      ))}
                      {q.hasOther && q.options.length <= 3 && (
                        <div className="qed-preview-opt">
                          <span className={`qed-preview-ctrl qed-preview-ctrl--${q.type}`} />
                          <span className="qed-preview-empty">Другое...</span>
                        </div>
                      )}
                      {q.options.length > 3 && (
                        <div className="qed-preview-more">+{q.options.length - 3} ещё</div>
                      )}
                    </div>
                  )}
                  {q.type === 'text' && (
                    <div className="qed-preview-text-hint">
                      <span>Свободный ответ</span>
                    </div>
                  )}
                  {q.type === 'scale' && (
                    <div className="qed-preview-scale">
                      {Array.from({ length: (q.scaleMax ?? 10) - (q.scaleMin ?? 1) + 1 }, (_, i) => i + (q.scaleMin ?? 1)).map(n => (
                        <span key={n} className="qed-preview-scale-tick">{n}</span>
                      ))}
                    </div>
                  )}
                </div>
                {/* Move + Delete */}
                <div className="qed-card-actions">
                  <button className="qed-move-btn" onClick={() => moveQuestion(idx, -1)} disabled={idx === 0} title="Вверх">↑</button>
                  <button className="qed-move-btn" onClick={() => moveQuestion(idx, 1)} disabled={idx === config.questions.length - 1} title="Вниз">↓</button>
                  <button className="adm-btn-danger qed-del-btn" onClick={() => removeQuestion(idx)} title="Удалить вопрос">
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <path d="M1.5 1.5l9 9M10.5 1.5l-9 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                  </button>
                </div>
              </div>

              {/* Right panel */}
              <div className="qed-card-right">
                <div className="qed-divider-v" />
                <div className="qed-fields">
                  <QField label="Заголовок вопроса" value={q.title} onChange={v => updateQuestion(idx, { title: v })} />
                  <QField label="Подзаголовок" value={q.subtitle ?? ''} onChange={v => updateQuestion(idx, { subtitle: v })} />

                  {/* Type toggle */}
                  <div className="qed-field">
                    <label className="qed-field-label">Тип</label>
                    <div className="qed-type-toggle">
                      <button
                        className={`qed-type-btn ${q.type === 'checkbox' ? 'qed-type-btn--active' : ''}`}
                        onClick={() => updateQuestion(idx, { type: 'checkbox' })}
                      >
                        <CheckboxIcon /> Несколько
                      </button>
                      <button
                        className={`qed-type-btn ${q.type === 'radio' ? 'qed-type-btn--active' : ''}`}
                        onClick={() => updateQuestion(idx, { type: 'radio' })}
                      >
                        <RadioIcon /> Один
                      </button>
                      <button
                        className={`qed-type-btn ${q.type === 'text' ? 'qed-type-btn--active' : ''}`}
                        onClick={() => updateQuestion(idx, { type: 'text' })}
                      >
                        <TextIcon /> Текст
                      </button>
                      <button
                        className={`qed-type-btn ${q.type === 'scale' ? 'qed-type-btn--active' : ''}`}
                        onClick={() => updateQuestion(idx, { type: 'scale' })}
                      >
                        <ScaleIcon /> Шкала
                      </button>
                    </div>
                  </div>

                  {(q.type === 'checkbox' || q.type === 'radio') && (
                    <div className="qed-field">
                      <label className="qed-field-label">Расположение вариантов</label>
                      <div className="qed-type-toggle">
                        <button
                          className={`qed-type-btn ${!q.optionsLayout || q.optionsLayout === 'grid' ? 'qed-type-btn--active' : ''}`}
                          onClick={() => updateQuestion(idx, { optionsLayout: 'grid' })}
                          title="Варианты в виде кнопок-плиток"
                        >
                          <svg width="11" height="11" viewBox="0 0 11 11" fill="none"><rect x="0.5" y="0.5" width="4.5" height="4.5" rx="1" stroke="currentColor" strokeWidth="1.2"/><rect x="6" y="0.5" width="4.5" height="4.5" rx="1" stroke="currentColor" strokeWidth="1.2"/><rect x="0.5" y="6" width="4.5" height="4.5" rx="1" stroke="currentColor" strokeWidth="1.2"/><rect x="6" y="6" width="4.5" height="4.5" rx="1" stroke="currentColor" strokeWidth="1.2"/></svg>
                          Плитки
                        </button>
                        <button
                          className={`qed-type-btn ${q.optionsLayout === 'list' ? 'qed-type-btn--active' : ''}`}
                          onClick={() => updateQuestion(idx, { optionsLayout: 'list' })}
                          title="Варианты в один столбец"
                        >
                          <svg width="11" height="11" viewBox="0 0 11 11" fill="none"><path d="M1 2.5h9M1 5.5h9M1 8.5h9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>
                          Список
                        </button>
                      </div>
                    </div>
                  )}

                  {(q.type === 'checkbox' || q.type === 'radio') && (
                    <>
                      <div className="qed-field qed-field--inline">
                        <label className="qed-field-label">
                          <input
                            type="checkbox"
                            checked={!!q.hasOther}
                            onChange={e => updateQuestion(idx, { hasOther: e.target.checked })}
                            style={{ marginRight: 6 }}
                          />
                          Добавить вариант «Другое»
                        </label>
                      </div>

                      <div className="qed-options-head">
                        <span className="qed-options-label">Варианты ответа</span>
                      </div>

                      <div className="qed-options-list">
                        <AnimatePresence initial={false}>
                          {q.options.map((opt, oIdx) => (
                            <motion.div
                              key={oIdx}
                              className="qed-opt-row"
                              initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                              animate={{ opacity: 1, height: 'auto', marginBottom: 6 }}
                              exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                              transition={{ duration: 0.18 }}
                            >
                              <span className="qed-opt-handle">⠿</span>
                              <span className="qed-opt-index">{oIdx + 1}</span>
                              <input
                                className="qed-opt-input"
                                type="text"
                                value={opt}
                                onChange={e => updateOption(idx, oIdx, e.target.value)}
                                placeholder="Текст варианта..."
                              />
                              <button
                                className="qed-opt-remove"
                                onClick={() => removeOption(idx, oIdx)}
                                title="Удалить"
                              >
                                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                                  <path d="M1.5 1.5l9 9M10.5 1.5l-9 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                                </svg>
                              </button>
                            </motion.div>
                          ))}
                        </AnimatePresence>

                        <button className="qed-add-opt" onClick={() => addOption(idx)}>
                          <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                            <path d="M6.5 2v9M2 6.5h9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                          </svg>
                          Добавить вариант
                        </button>
                      </div>
                    </>
                  )}

                  {q.type === 'scale' && (
                    <div className="qed-fields" style={{ flexDirection: 'row', gap: 12, marginTop: 8 }}>
                      <div className="qed-field">
                        <label className="qed-field-label">Мин.</label>
                        <input
                          className="qed-field-input"
                          type="number"
                          value={q.scaleMin ?? 1}
                          onChange={e => updateQuestion(idx, { scaleMin: Number(e.target.value) })}
                          style={{ width: 70 }}
                        />
                      </div>
                      <div className="qed-field">
                        <label className="qed-field-label">Макс.</label>
                        <input
                          className="qed-field-input"
                          type="number"
                          value={q.scaleMax ?? 10}
                          onChange={e => updateQuestion(idx, { scaleMax: Number(e.target.value) })}
                          style={{ width: 70 }}
                        />
                      </div>
                    </div>
                  )}

                  {q.type === 'text' && (
                    <p className="adm-hint" style={{ marginTop: 8 }}>Пользователь увидит текстовое поле для свободного ответа.</p>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {dialog}

      {/* Floating save bar */}
      <AnimatePresence>
        {(dirty || saved) && (
          <motion.div
            className={`qed-save-bar ${saved ? 'qed-save-bar--saved' : ''}`}
            initial={{ y: 40, opacity: 0, scale: 0.97 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 40, opacity: 0, scale: 0.97 }}
            transition={{ duration: 0.22, ease: easeOut }}
          >
            <div className="qed-save-bar-left">
              {saved
                ? <span className="qed-save-bar-icon qed-save-bar-icon--ok">
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2.5 7l3.5 3.5 5.5-6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </span>
                : <span className="qed-save-bar-icon qed-save-bar-icon--warn">
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 2v5.5M7 10.5v.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>
                  </span>
              }
              <span className="qed-save-bar-hint">
                {saved ? 'Изменения сохранены' : 'Есть несохранённые изменения'}
              </span>
            </div>
            {!saved && (
              <motion.button
                className="qed-save-bar-btn"
                onClick={save}
                whileTap={{ scale: 0.96 }}
                disabled={saving}
              >
                {saving
                  ? <span className="adm-spinner" />
                  : <>
                      <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M2 9.5V11h1.5l5-5L7 4.5l-5 5ZM10.85 3.65a.5.5 0 0 0 0-.7l-1.8-1.8a.5.5 0 0 0-.7 0L7.5 2.5 10 5l.85-.85Z" fill="currentColor"/></svg>
                      Сохранить
                    </>
                }
              </motion.button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function QField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="qed-field">
      <label className="qed-field-label">{label}</label>
      <input
        className="qed-field-input"
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={label + '...'}
      />
    </div>
  )
}

function CheckboxIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
      <rect x="0.75" y="0.75" width="9.5" height="9.5" rx="2.25" stroke="currentColor" strokeWidth="1.3"/>
      <path d="M3 5.5l1.8 1.8L8 3.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

function RadioIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
      <circle cx="5.5" cy="5.5" r="4.75" stroke="currentColor" strokeWidth="1.3"/>
      <circle cx="5.5" cy="5.5" r="2.5" fill="currentColor"/>
    </svg>
  )
}

function TextIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
      <path d="M1.5 3h8M1.5 5.5h8M1.5 8h5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
    </svg>
  )
}

function ScaleIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
      <rect x="1" y="7" width="1.5" height="3" rx="0.5" fill="currentColor"/>
      <rect x="3.5" y="5" width="1.5" height="5" rx="0.5" fill="currentColor"/>
      <rect x="6" y="3" width="1.5" height="7" rx="0.5" fill="currentColor"/>
      <rect x="8.5" y="1" width="1.5" height="9" rx="0.5" fill="currentColor"/>
    </svg>
  )
}
