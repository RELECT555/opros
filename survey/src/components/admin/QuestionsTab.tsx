import { useState, useEffect } from 'react'
import { motion, AnimatePresence, easeOut } from 'framer-motion'
import { getSurveyById, updateSurveyConfig } from '../../lib/supabase'
import type { Survey, SurveyQuestion, SurveyConfigData } from '../../lib/supabase'
import { SavedIcon } from './shared'

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
  const [survey, setSurvey] = useState<Survey | null>(null)
  const [config, setConfig] = useState<SurveyConfigData>({ questions: [] })
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [dirty, setDirty] = useState(false)
  const [loading, setLoading] = useState(true)

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

  function removeQuestion(idx: number) {
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

  function removeOption(qIdx: number, oIdx: number) {
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
      <div className="adm-section-head">
        <div className="adm-section-title-row">
          <h2 className="adm-section-title">Редактор вопросов</h2>
          {dirty && <span className="qed-unsaved-dot" title="Есть несохранённые изменения" />}
        </div>
        <button className="adm-btn-primary" onClick={addQuestion}>
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
            <path d="M6.5 2v9M2 6.5h9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          Добавить вопрос
        </button>
      </div>

      {/* Welcome settings */}
      <div className="adm-card qed-welcome-card">
        <p className="qed-section-label">Экран приветствия</p>
        <div className="qed-fields">
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

      <p className="adm-hint">Изменения применятся при следующей загрузке опроса пользователем.</p>
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
                    {q.type === 'checkbox' ? <CheckboxIcon /> : <RadioIcon />}
                    {q.type === 'checkbox' ? 'Чекбоксы' : 'Радио'}
                  </span>
                  <span className="qed-opt-count">{q.options.length} вариантов</span>
                </div>
                <div className="qed-preview">
                  <p className="qed-preview-title">{q.title || <span className="qed-preview-empty">Заголовок...</span>}</p>
                  {q.subtitle && <p className="qed-preview-sub">{q.subtitle}</p>}
                  <div className="qed-preview-opts">
                    {q.options.slice(0, 3).map((o, i) => (
                      <div key={i} className="qed-preview-opt">
                        <span className={`qed-preview-ctrl qed-preview-ctrl--${q.type}`} />
                        <span>{o || '—'}</span>
                      </div>
                    ))}
                    {q.options.length > 3 && (
                      <div className="qed-preview-more">+{q.options.length - 3} ещё</div>
                    )}
                  </div>
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
                    </div>
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
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Floating save bar */}
      <AnimatePresence>
        {(dirty || saved) && (
          <motion.div
            className="qed-save-bar"
            initial={{ y: 32, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 32, opacity: 0 }}
            transition={{ duration: 0.22, ease: easeOut }}
          >
            <span className="qed-save-bar-hint">
              {saved ? 'Изменения сохранены' : 'Есть несохранённые изменения'}
            </span>
            <motion.button
              className={`adm-btn-primary adm-btn-save ${saved ? 'adm-btn-saved' : ''}`}
              onClick={save}
              whileTap={{ scale: 0.97 }}
              disabled={saving}
            >
              {saving ? <span className="adm-spinner" /> : saved
                ? <><SavedIcon /> Сохранено</>
                : 'Сохранить'}
            </motion.button>
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
