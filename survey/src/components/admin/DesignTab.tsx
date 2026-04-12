import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { getSurveyById, updateSurveyConfig } from '../../lib/supabase'
import type { Survey, SurveyDesign } from '../../lib/supabase'
import { SavedIcon } from './shared'

/* ── Design presets ── */
interface DesignPreset {
  id:     string
  name:   string
  design: Required<Omit<SurveyDesign, 'logo_url' | 'btn_label' | 'preset'>>
}

export const DESIGN_PRESETS: DesignPreset[] = [
  { id: 'indigo',  name: 'Indigo',  design: { accent: '#5b73f9', accent2: '#9b6dff', bg: '#07070d', orb1: '#5b73f9', orb2: '#9b6dff', text: '#eaeaf8', text2: '#8a8aaa' } },
  { id: 'aurora',  name: 'Aurora',  design: { accent: '#00c9a7', accent2: '#00a8e8', bg: '#05080d', orb1: '#00c9a7', orb2: '#0070c0', text: '#e0f7f4', text2: '#7ab8b2' } },
  { id: 'sunset',  name: 'Sunset',  design: { accent: '#f97316', accent2: '#ef4444', bg: '#0d0705', orb1: '#f97316', orb2: '#dc2626', text: '#fdf0e8', text2: '#b08070' } },
  { id: 'rose',    name: 'Rose',    design: { accent: '#ec4899', accent2: '#f43f5e', bg: '#0d0508', orb1: '#ec4899', orb2: '#e11d48', text: '#fde8f0', text2: '#b07090' } },
  { id: 'emerald', name: 'Emerald', design: { accent: '#10b981', accent2: '#34d399', bg: '#040d09', orb1: '#059669', orb2: '#34d399', text: '#e0f5ee', text2: '#6aab90' } },
  { id: 'gold',    name: 'Gold',    design: { accent: '#f59e0b', accent2: '#fbbf24', bg: '#0d0a03', orb1: '#d97706', orb2: '#fbbf24', text: '#fdf6e0', text2: '#b09a50' } },
  { id: 'cyber',   name: 'Cyber',   design: { accent: '#06b6d4', accent2: '#3b82f6', bg: '#020d0f', orb1: '#0891b2', orb2: '#2563eb', text: '#e0f7fb', text2: '#60a0b0' } },
  { id: 'violet',  name: 'Violet',  design: { accent: '#7c3aed', accent2: '#c026d3', bg: '#07030d', orb1: '#6d28d9', orb2: '#a21caf', text: '#f0e8fd', text2: '#9070b0' } },
]

const DEFAULT_DESIGN: Required<Omit<SurveyDesign, 'logo_url' | 'btn_label' | 'preset'>> = DESIGN_PRESETS[0].design

function resolveDesign(d?: SurveyDesign): SurveyDesign {
  return { ...DEFAULT_DESIGN, logo_url: '', btn_label: '', preset: 'indigo', ...d }
}

/* ── Props ── */
interface Props {
  surveyId: number
  onSurveyUpdate: (s: Survey) => void
}

export function DesignTab({ surveyId, onSurveyUpdate }: Props) {
  const [design, setDesign] = useState<SurveyDesign | null>(null)
  const [loading, setLoading]   = useState(true)
  const [saving, setSaving]     = useState(false)
  const [saved, setSaved]       = useState(false)
  const [err, setErr]           = useState<string | null>(null)

  /* Load on mount */
  useState(() => {
    getSurveyById(surveyId).then(s => {
      if (s) setDesign(resolveDesign(s.config.design))
      setLoading(false)
    }).catch(e => { setErr(e.message); setLoading(false) })
  })

  function set<K extends keyof SurveyDesign>(key: K, val: SurveyDesign[K]) {
    setDesign(d => ({ ...resolveDesign(d ?? undefined), [key]: val, preset: key === 'preset' ? val as string : 'custom' }))
  }

  function applyPreset(p: DesignPreset) {
    setDesign(d => ({ ...resolveDesign(d ?? undefined), ...p.design, preset: p.id }))
  }

  async function save() {
    if (!design) return
    setSaving(true)
    setErr(null)
    try {
      const survey = await getSurveyById(surveyId)
      if (!survey) throw new Error('Опросник не найден')
      const newConfig = { ...survey.config, design }
      await updateSurveyConfig(surveyId, newConfig)
      const updated = await getSurveyById(surveyId)
      if (updated) onSurveyUpdate(updated)
      setSaved(true)
      setTimeout(() => setSaved(false), 2200)
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Ошибка сохранения')
    } finally {
      setSaving(false)
    }
  }

  const d = design ?? resolveDesign()

  if (loading) return (
    <div className="dsg-loading">
      <span className="adm-spinner" style={{ width: 20, height: 20, borderWidth: 2 }} />
    </div>
  )

  return (
    <div className="dsg-root">
      {/* Header */}
      <div className="dsg-header">
        <div className="dsg-header-icon"><BrushIcon /></div>
        <div>
          <h2 className="dsg-header-title">Дизайн опросника</h2>
          <p className="dsg-header-sub">Настройки применяются к публичной странице</p>
        </div>
        <button
          className={`adm-btn-primary adm-btn-save ${saved ? 'adm-btn-saved' : ''}`}
          onClick={save}
          disabled={saving}
          style={{ marginLeft: 'auto' }}
        >
          {saving ? <><span className="adm-spinner" /> Сохранение...</>
           : saved  ? <><SavedIcon /> Сохранено</>
           : 'Сохранить'}
        </button>
      </div>

      {err && <div className="adm-err-banner">{err}</div>}

      <div className="dsg-layout">
        {/* Left: controls */}
        <div className="dsg-controls">

          {/* Presets */}
          <div className="dsg-block">
            <div className="dsg-block-label">Пресеты</div>
            <div className="dsg-presets">
              {DESIGN_PRESETS.map(p => (
                <button
                  key={p.id}
                  className={`dsg-preset ${d.preset === p.id ? 'dsg-preset--active' : ''}`}
                  onClick={() => applyPreset(p)}
                >
                  <span
                    className="dsg-preset-swatch"
                    style={{ background: `linear-gradient(135deg, ${p.design.accent} 0%, ${p.design.accent2} 100%)` }}
                  />
                  {p.name}
                  {d.preset === p.id && <span className="dsg-preset-check"><CheckIcon /></span>}
                </button>
              ))}
            </div>
          </div>

          {/* Colors */}
          <div className="dsg-block">
            <div className="dsg-block-label">Цвета</div>
            <div className="dsg-color-grid">
              <ColorSwatch label="Акцент"   value={d.accent  ?? DEFAULT_DESIGN.accent}  onChange={v => set('accent',  v)} />
              <ColorSwatch label="Акцент 2" value={d.accent2 ?? DEFAULT_DESIGN.accent2} onChange={v => set('accent2', v)} />
              <ColorSwatch label="Фон"      value={d.bg      ?? DEFAULT_DESIGN.bg}      onChange={v => set('bg',      v)} />
              <ColorSwatch label="Орб 1"    value={d.orb1    ?? DEFAULT_DESIGN.orb1}    onChange={v => set('orb1',    v)} />
              <ColorSwatch label="Орб 2"    value={d.orb2    ?? DEFAULT_DESIGN.orb2}    onChange={v => set('orb2',    v)} />
              <ColorSwatch label="Текст"    value={d.text    ?? DEFAULT_DESIGN.text}    onChange={v => set('text',    v)} />
              <ColorSwatch label="Текст 2"  value={d.text2   ?? DEFAULT_DESIGN.text2}   onChange={v => set('text2',   v)} />
            </div>
          </div>

          {/* Content */}
          <div className="dsg-block">
            <div className="dsg-block-label">Контент</div>

            <div className="dsg-field">
              <label className="dsg-field-label" htmlFor="dsg-logo">Логотип (URL)</label>
              <input
                id="dsg-logo"
                className="dsg-input"
                type="url"
                placeholder="https://example.com/logo.png"
                value={d.logo_url ?? ''}
                onChange={e => set('logo_url', e.target.value)}
                spellCheck={false}
              />
              <AnimatePresence>
                {d.logo_url && (
                  <motion.img
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    src={d.logo_url}
                    alt="логотип"
                    className="dsg-logo-preview"
                    onError={e => (e.currentTarget.style.display = 'none')}
                    onLoad={e => (e.currentTarget.style.display = 'block')}
                  />
                )}
              </AnimatePresence>
            </div>

            <div className="dsg-field">
              <label className="dsg-field-label" htmlFor="dsg-btn">Текст кнопки «Начать»</label>
              <input
                id="dsg-btn"
                className="dsg-input"
                type="text"
                placeholder="Начать опрос"
                value={d.btn_label ?? ''}
                onChange={e => set('btn_label', e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Right: live preview */}
        <div className="dsg-preview-wrap">
          <div className="dsg-preview-label">Предпросмотр</div>
          <SurveyPreview design={d} />
        </div>
      </div>
    </div>
  )
}

/* ── Live mini-preview of the survey page ── */
function SurveyPreview({ design: d }: { design: SurveyDesign }) {
  const accent   = d.accent  ?? DEFAULT_DESIGN.accent
  const accent2  = d.accent2 ?? DEFAULT_DESIGN.accent2
  const bg       = d.bg      ?? DEFAULT_DESIGN.bg
  const orb1     = d.orb1    ?? DEFAULT_DESIGN.orb1
  const orb2     = d.orb2    ?? DEFAULT_DESIGN.orb2
  const text     = d.text    ?? DEFAULT_DESIGN.text
  const text2    = d.text2   ?? DEFAULT_DESIGN.text2
  const btnLabel = d.btn_label?.trim() || 'Начать опрос'

  return (
    <div className="dsg-preview" style={{ background: bg }}>
      {/* Orbs */}
      <div className="dsg-preview-orb dsg-preview-orb--1"
        style={{ background: `radial-gradient(circle, ${orb1} 0%, transparent 70%)` }} />
      <div className="dsg-preview-orb dsg-preview-orb--2"
        style={{ background: `radial-gradient(circle, ${orb2} 0%, transparent 70%)` }} />

      {/* Content */}
      <div className="dsg-preview-inner">
        {/* Logo */}
        {d.logo_url && (
          <img src={d.logo_url} alt="" className="dsg-preview-logo"
            onError={e => (e.currentTarget.style.display = 'none')} />
        )}

        {/* Badge */}
        <div className="dsg-preview-badge" style={{ borderColor: `${accent}55`, color: accent }}>
          <span className="dsg-preview-badge-dot" style={{ background: accent }} />
          Бесплатная консультация
        </div>

        {/* Title */}
        <div className="dsg-preview-title" style={{ color: text }}>Помогите нам стать<br/>лучше для вас</div>
        <div className="dsg-preview-sub" style={{ color: text2 }}>Пройдите короткий опрос — и мы свяжемся с вами</div>

        {/* CTA */}
        <button
          className="dsg-preview-cta"
          style={{ background: `linear-gradient(135deg, ${accent} 0%, ${accent2} 100%)` }}
        >
          {btnLabel}
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
            <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>

        {/* Hints */}
        <div className="dsg-preview-hints" style={{ color: text2, opacity: 0.6 }}>
          <span>2 минуты</span>
          <span className="dsg-preview-dot" />
          <span>данные в безопасности</span>
        </div>
      </div>
    </div>
  )
}

/* ── ColorSwatch ── */
function ColorSwatch({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const ref = useRef<HTMLInputElement>(null)
  return (
    <div className="dsg-color-swatch">
      <button
        className="dsg-swatch-btn"
        style={{ background: value }}
        onClick={() => ref.current?.click()}
        title={label}
      />
      <input ref={ref} type="color" value={value}
        onChange={e => onChange(e.target.value)} className="dsg-color-hidden" tabIndex={-1} />
      <span className="dsg-swatch-label">{label}</span>
    </div>
  )
}

/* ── Icons ── */
function BrushIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path d="M12 20h9M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"
        stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}
function CheckIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
      <path d="M1.5 5l2.5 2.5 4.5-4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}
