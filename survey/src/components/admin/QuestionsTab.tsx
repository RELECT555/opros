import { useState, useEffect } from 'react'
import { motion, easeOut } from 'framer-motion'
import { loadConfig, loadConfigRemote, saveConfigRemote, DEFAULTS } from '../../config'
import type { SurveyConfig } from '../../config'
import { QTitleField, OptionRow, AddOptionBtn, SavedIcon } from './shared'

export function QuestionsTab() {
  const [cfg, setCfg] = useState<SurveyConfig>(loadConfig)
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')

  useEffect(() => {
    loadConfigRemote().then(setCfg)
  }, [])

  async function save() {
    setSaving(true)
    setSaveError('')
    try {
      await saveConfigRemote(cfg)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (e: unknown) {
      setSaveError(e instanceof Error ? e.message : 'Ошибка сохранения')
    } finally {
      setSaving(false)
    }
  }

  async function reset() {
    if (!confirm('Сбросить все вопросы до исходных?')) return
    setCfg(DEFAULTS)
    await saveConfigRemote(DEFAULTS)
  }

  /* Q1 helpers */
  function setQ1Option(i: number, val: string) {
    setCfg(c => ({ ...c, q1: { ...c.q1, options: c.q1.options.map((o, j) => j === i ? val : o) } }))
  }
  function addQ1Option() {
    setCfg(c => ({ ...c, q1: { ...c.q1, options: [...c.q1.options, ''] } }))
  }
  function removeQ1Option(i: number) {
    setCfg(c => ({ ...c, q1: { ...c.q1, options: c.q1.options.filter((_, j) => j !== i) } }))
  }

  /* Q2 helpers */
  function setQ2Option(i: number, val: string) {
    setCfg(c => ({ ...c, q2: { ...c.q2, options: c.q2.options.map((o, j) => j === i ? val : o) } }))
  }
  function addQ2Option() {
    setCfg(c => ({ ...c, q2: { ...c.q2, options: [...c.q2.options, ''] } }))
  }
  function removeQ2Option(i: number) {
    setCfg(c => ({ ...c, q2: { ...c.q2, options: c.q2.options.filter((_, j) => j !== i) } }))
  }

  /* Q3 helpers */
  function setQ3Label(i: number, label: string) {
    setCfg(c => ({ ...c, q3: { ...c.q3, options: c.q3.options.map((o, j) => j === i ? { ...o, label } : o) } }))
  }
  function addQ3Option() {
    setCfg(c => ({ ...c, q3: { ...c.q3, options: [...c.q3.options, { value: `opt${Date.now()}`, label: '' }] } }))
  }
  function removeQ3Option(i: number) {
    setCfg(c => ({ ...c, q3: { ...c.q3, options: c.q3.options.filter((_, j) => j !== i) } }))
  }

  return (
    <div className="adm-tab-content">
      <div className="adm-section-head">
        <div className="adm-section-title-row">
          <h2 className="adm-section-title">Редактор вопросов</h2>
        </div>
        <div className="adm-head-actions">
          <button className="adm-btn-ghost" onClick={reset}>Сбросить</button>
          <motion.button
            className={`adm-btn-primary adm-btn-save ${saved ? 'adm-btn-saved' : ''}`}
            onClick={save}
            whileTap={{ scale: 0.97 }}
            disabled={saving}
          >
            {saving ? <span className="adm-spinner" /> : saved ? (
              <><SavedIcon /> Сохранено</>
            ) : 'Сохранить'}
          </motion.button>
        </div>
      </div>

      <p className="adm-hint">Изменения применятся к опросу при следующей загрузке страницы пользователем.</p>
      {saveError && <p className="adm-err-banner">{saveError}</p>}

      {/* Q1 */}
      <div className="adm-card adm-q-card">
        <div className="adm-q-num">01</div>
        <QTitleField
          label="Заголовок вопроса"
          value={cfg.q1.title}
          onChange={v => setCfg(c => ({ ...c, q1: { ...c.q1, title: v } }))}
        />
        <QTitleField
          label="Подзаголовок"
          value={cfg.q1.sub}
          onChange={v => setCfg(c => ({ ...c, q1: { ...c.q1, sub: v } }))}
        />
        <div className="adm-q-options-label">Варианты ответа <span>(чекбоксы)</span></div>
        <div className="adm-options-list">
          {cfg.q1.options.map((opt, i) => (
            <OptionRow key={i} value={opt} onChange={v => setQ1Option(i, v)} onRemove={() => removeQ1Option(i)} />
          ))}
          <AddOptionBtn onClick={addQ1Option} />
        </div>
      </div>

      {/* Q2 */}
      <div className="adm-card adm-q-card">
        <div className="adm-q-num">02</div>
        <QTitleField
          label="Заголовок вопроса"
          value={cfg.q2.title}
          onChange={v => setCfg(c => ({ ...c, q2: { ...c.q2, title: v } }))}
        />
        <QTitleField
          label="Подзаголовок"
          value={cfg.q2.sub}
          onChange={v => setCfg(c => ({ ...c, q2: { ...c.q2, sub: v } }))}
        />
        <div className="adm-q-options-label">Варианты ответа <span>(чекбоксы)</span></div>
        <div className="adm-options-list">
          {cfg.q2.options.map((opt, i) => (
            <OptionRow key={i} value={opt} onChange={v => setQ2Option(i, v)} onRemove={() => removeQ2Option(i)} />
          ))}
          <AddOptionBtn onClick={addQ2Option} />
        </div>
      </div>

      {/* Q3 */}
      <div className="adm-card adm-q-card">
        <div className="adm-q-num">03</div>
        <QTitleField
          label="Заголовок вопроса"
          value={cfg.q3.title}
          onChange={v => setCfg(c => ({ ...c, q3: { ...c.q3, title: v } }))}
        />
        <QTitleField
          label="Подзаголовок"
          value={cfg.q3.sub}
          onChange={v => setCfg(c => ({ ...c, q3: { ...c.q3, sub: v } }))}
        />
        <div className="adm-q-options-label">Варианты ответа <span>(радио-кнопки)</span></div>
        <div className="adm-options-list">
          {cfg.q3.options.map((opt, i) => (
            <OptionRow key={opt.value} value={opt.label} onChange={v => setQ3Label(i, v)} onRemove={() => removeQ3Option(i)} />
          ))}
          <AddOptionBtn onClick={addQ3Option} />
        </div>
      </div>
    </div>
  )
}
