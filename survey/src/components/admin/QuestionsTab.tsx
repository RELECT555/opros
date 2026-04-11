import { useState, useEffect } from 'react'
import { motion, AnimatePresence, easeOut } from 'framer-motion'
import { loadConfig, loadConfigRemote, saveConfigRemote, DEFAULTS } from '../../config'
import type { SurveyConfig } from '../../config'
import { SavedIcon } from './shared'

export function QuestionsTab() {
  const [cfg, setCfg] = useState<SurveyConfig>(loadConfig)
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [dirty, setDirty] = useState(false)

  useEffect(() => {
    loadConfigRemote().then(remote => {
      setCfg(remote)
      setDirty(false)
    })
  }, [])

  function update(fn: (c: SurveyConfig) => SurveyConfig) {
    setCfg(fn)
    setDirty(true)
    setSaved(false)
  }

  async function save() {
    setSaving(true)
    setSaveError('')
    try {
      await saveConfigRemote(cfg)
      setSaved(true)
      setDirty(false)
      setTimeout(() => setSaved(false), 2500)
    } catch (e: unknown) {
      setSaveError(e instanceof Error ? e.message : 'Ошибка сохранения')
    } finally {
      setSaving(false)
    }
  }

  async function reset() {
    if (!confirm('Сбросить все вопросы до исходных?')) return
    setCfg(DEFAULTS)
    setDirty(true)
    setSaved(false)
    await saveConfigRemote(DEFAULTS)
    setDirty(false)
  }

  /* Q1 helpers */
  const q1 = {
    setTitle: (v: string) => update(c => ({ ...c, q1: { ...c.q1, title: v } })),
    setSub:   (v: string) => update(c => ({ ...c, q1: { ...c.q1, sub: v } })),
    setOpt:   (i: number, v: string) => update(c => ({ ...c, q1: { ...c.q1, options: c.q1.options.map((o, j) => j === i ? v : o) } })),
    addOpt:   () => update(c => ({ ...c, q1: { ...c.q1, options: [...c.q1.options, ''] } })),
    remOpt:   (i: number) => update(c => ({ ...c, q1: { ...c.q1, options: c.q1.options.filter((_, j) => j !== i) } })),
  }
  const q2 = {
    setTitle: (v: string) => update(c => ({ ...c, q2: { ...c.q2, title: v } })),
    setSub:   (v: string) => update(c => ({ ...c, q2: { ...c.q2, sub: v } })),
    setOpt:   (i: number, v: string) => update(c => ({ ...c, q2: { ...c.q2, options: c.q2.options.map((o, j) => j === i ? v : o) } })),
    addOpt:   () => update(c => ({ ...c, q2: { ...c.q2, options: [...c.q2.options, ''] } })),
    remOpt:   (i: number) => update(c => ({ ...c, q2: { ...c.q2, options: c.q2.options.filter((_, j) => j !== i) } })),
  }
  const q3 = {
    setTitle: (v: string) => update(c => ({ ...c, q3: { ...c.q3, title: v } })),
    setSub:   (v: string) => update(c => ({ ...c, q3: { ...c.q3, sub: v } })),
    setOpt:   (i: number, v: string) => update(c => ({ ...c, q3: { ...c.q3, options: c.q3.options.map((o, j) => j === i ? { ...o, label: v } : o) } })),
    addOpt:   () => update(c => ({ ...c, q3: { ...c.q3, options: [...c.q3.options, { value: `opt${Date.now()}`, label: '' }] } })),
    remOpt:   (i: number) => update(c => ({ ...c, q3: { ...c.q3, options: c.q3.options.filter((_, j) => j !== i) } })),
  }

  return (
    <div className="adm-tab-content qed-root">
      {/* Header */}
      <div className="adm-section-head">
        <div className="adm-section-title-row">
          <h2 className="adm-section-title">Редактор вопросов</h2>
          {dirty && <span className="qed-unsaved-dot" title="Есть несохранённые изменения" />}
        </div>
        <button className="adm-btn-ghost" onClick={reset}>Сбросить</button>
      </div>

      <p className="adm-hint">Изменения применятся к опросу при следующей загрузке страницы пользователем.</p>
      {saveError && <p className="adm-err-banner">{saveError}</p>}

      {/* Questions */}
      <div className="qed-list">
        <QuestionCard
          num="01"
          type="checkbox"
          title={cfg.q1.title}
          sub={cfg.q1.sub}
          options={cfg.q1.options}
          onTitle={q1.setTitle}
          onSub={q1.setSub}
          onOpt={q1.setOpt}
          onAddOpt={q1.addOpt}
          onRemOpt={q1.remOpt}
        />
        <QuestionCard
          num="02"
          type="checkbox"
          title={cfg.q2.title}
          sub={cfg.q2.sub}
          options={cfg.q2.options}
          onTitle={q2.setTitle}
          onSub={q2.setSub}
          onOpt={q2.setOpt}
          onAddOpt={q2.addOpt}
          onRemOpt={q2.remOpt}
        />
        <QuestionCard
          num="03"
          type="radio"
          title={cfg.q3.title}
          sub={cfg.q3.sub}
          options={cfg.q3.options.map(o => o.label)}
          onTitle={q3.setTitle}
          onSub={q3.setSub}
          onOpt={q3.setOpt}
          onAddOpt={q3.addOpt}
          onRemOpt={q3.remOpt}
        />
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

/* ── QuestionCard ─────────────────────────────────────────── */

interface QuestionCardProps {
  num: string
  type: 'checkbox' | 'radio'
  title: string
  sub: string
  options: string[]
  onTitle: (v: string) => void
  onSub: (v: string) => void
  onOpt: (i: number, v: string) => void
  onAddOpt: () => void
  onRemOpt: (i: number) => void
}

function QuestionCard({ num, type, title, sub, options, onTitle, onSub, onOpt, onAddOpt, onRemOpt }: QuestionCardProps) {
  return (
    <div className="qed-card adm-card">
      {/* Left panel */}
      <div className="qed-card-left">
        <div className="qed-num-badge">{num}</div>
        <div className="qed-meta">
          <span className={`qed-type-badge qed-type-badge--${type}`}>
            {type === 'checkbox' ? <CheckboxIcon /> : <RadioIcon />}
            {type === 'checkbox' ? 'Чекбоксы' : 'Радио'}
          </span>
          <span className="qed-opt-count">{options.length} вариантов</span>
        </div>
        <div className="qed-preview">
          <p className="qed-preview-title">{title || <span className="qed-preview-empty">Заголовок...</span>}</p>
          {sub && <p className="qed-preview-sub">{sub}</p>}
          <div className="qed-preview-opts">
            {options.slice(0, 3).map((o, i) => (
              <div key={i} className="qed-preview-opt">
                <span className={`qed-preview-ctrl qed-preview-ctrl--${type}`} />
                <span>{o || '—'}</span>
              </div>
            ))}
            {options.length > 3 && (
              <div className="qed-preview-more">+{options.length - 3} ещё</div>
            )}
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div className="qed-card-right">
        <div className="qed-divider-v" />
        <div className="qed-fields">
          <QField label="Заголовок вопроса" value={title} onChange={onTitle} />
          <QField label="Подзаголовок" value={sub} onChange={onSub} />

          <div className="qed-options-head">
            <span className="qed-options-label">Варианты ответа</span>
          </div>

          <div className="qed-options-list">
            <AnimatePresence initial={false}>
              {options.map((opt, i) => (
                <motion.div
                  key={i}
                  className="qed-opt-row"
                  initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                  animate={{ opacity: 1, height: 'auto', marginBottom: 6 }}
                  exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                  transition={{ duration: 0.18 }}
                >
                  <span className="qed-opt-handle">⠿</span>
                  <span className="qed-opt-index">{i + 1}</span>
                  <input
                    className="qed-opt-input"
                    type="text"
                    value={opt}
                    onChange={e => onOpt(i, e.target.value)}
                    placeholder="Текст варианта..."
                  />
                  <button
                    className="qed-opt-remove"
                    onClick={() => onRemOpt(i)}
                    title="Удалить"
                  >
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <path d="M1.5 1.5l9 9M10.5 1.5l-9 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>

            <button className="qed-add-opt" onClick={onAddOpt}>
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                <path d="M6.5 2v9M2 6.5h9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              Добавить вариант
            </button>
          </div>
        </div>
      </div>
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
