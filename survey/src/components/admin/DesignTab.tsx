import { useState, useEffect, useRef, useCallback, type CSSProperties } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  getSurveyById,
  updateSurveyConfig,
  uploadSurveyLogo,
} from '../../lib/api-client'
import type { Survey, SurveyConfigData, SurveyDesign } from '../../lib/supabase'
import {
  SURVEY_STICKER_PRESETS,
  SURVEY_STICKER_MAX_LEN,
  getSurveyStickerIcon,
} from '../../lib/surveyStickers'
import {
  mergeSurveyDesign,
  surveyDesignContrastHints,
  previewOrbMultiplier,
} from '../../lib/surveyDesign'
import type { SurveyCtaStyle, SurveyOrbIntensity, SurveyRadiusPreset, SurveyTypeScale } from '../../lib/surveyDesign'
import { SavedIcon } from './AdminFormParts'
import { DesignTabSkeleton } from './AdminSkeletons'

type PresetColors = Pick<
  SurveyDesign,
  'accent' | 'accent2' | 'bg' | 'orb1' | 'orb2' | 'text' | 'text2'
>

interface DesignPreset {
  id: string
  name: string
  design: PresetColors
}

// eslint-disable-next-line react-refresh/only-export-components
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

const THEME_KEYS = new Set<keyof SurveyDesign>([
  'accent', 'accent2', 'bg', 'orb1', 'orb2', 'text', 'text2',
  'type_scale', 'cta_style', 'radius', 'orb_intensity',
])

interface Props {
  surveyId: number
  onSurveyUpdate: (s: Survey) => void
}

type PreviewTab = 'welcome' | 'question' | 'contacts' | 'success'

export function DesignTab({ surveyId, onSurveyUpdate }: Props) {
  const [design, setDesign] = useState<SurveyDesign | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [revertPresetId, setRevertPresetId] = useState('indigo')
  const [previewTab, setPreviewTab] = useState<PreviewTab>('welcome')
  const [uploadBusy, setUploadBusy] = useState(false)
  const [sticker, setSticker] = useState('')

  const patchDesign = useCallback((updates: Partial<SurveyDesign>) => {
    setDesign(d => {
      const cur = mergeSurveyDesign(d ?? undefined)
      const next = { ...cur, ...updates }
      const touchesTheme = Object.keys(updates).some(k => THEME_KEYS.has(k as keyof SurveyDesign))
      if (touchesTheme) next.preset = 'custom'
      return next
    })
  }, [])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setErr(null)
    getSurveyById(surveyId)
      .then(s => {
        if (cancelled || !s) return
        setDesign(mergeSurveyDesign(s.config.design))
        setSticker(s.config.sticker?.trim() ?? '')
        const p = s.config.design?.preset
        setRevertPresetId(p && p !== 'custom' ? p : 'indigo')
      })
      .catch(e => {
        if (!cancelled) setErr(e instanceof Error ? e.message : 'Ошибка загрузки')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [surveyId])

  function applyPreset(p: DesignPreset) {
    setDesign(d => ({
      ...mergeSurveyDesign(d ?? undefined),
      ...p.design,
      preset: p.id,
    }))
    setRevertPresetId(p.id)
  }

  function revertToChosenPreset() {
    const p = DESIGN_PRESETS.find(x => x.id === revertPresetId)
    if (p) applyPreset(p)
  }

  async function save() {
    if (!design) return
    setSaving(true)
    setErr(null)
    try {
      const survey = await getSurveyById(surveyId)
      if (!survey) throw new Error('Опросник не найден')
      const trimmed = sticker.trim().slice(0, SURVEY_STICKER_MAX_LEN)
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { sticker: _prev, ...rest } = survey.config
      const newConfig: SurveyConfigData = { ...rest, design }
      if (trimmed) newConfig.sticker = trimmed
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

  async function onLogoFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setUploadBusy(true)
    setErr(null)
    try {
      const url = await uploadSurveyLogo(surveyId, file)
      patchDesign({ logo_url: url })
    } catch (ex: unknown) {
      setErr(ex instanceof Error ? ex.message : 'Не удалось загрузить файл')
    } finally {
      setUploadBusy(false)
    }
  }

  const d = mergeSurveyDesign(design ?? undefined)
  const contrast = surveyDesignContrastHints(d)
  const isCustom = d.preset === 'custom'
  const orbMul = previewOrbMultiplier(d)

  if (loading) {
    return <DesignTabSkeleton />
  }

  return (
    <div className="dsg-root">
      <div className="dsg-header">
        <div className="dsg-header-icon"><BrushIcon /></div>
        <div>
          <h2 className="dsg-header-title">Дизайн опросника</h2>
          <p className="dsg-header-sub">Настройки применяются к публичной странице</p>
        </div>
        <button
          type="button"
          className={`adm-btn-primary adm-btn-save ${saved ? 'adm-btn-saved' : ''}`}
          onClick={save}
          disabled={saving}
          style={{ marginLeft: 'auto' }}
        >
          {saving ? <><span className="adm-spinner" /> Сохранение...</>
            : saved ? <><SavedIcon /> Сохранено</>
              : 'Сохранить'}
        </button>
      </div>

      {err && <div className="adm-err-banner">{err}</div>}

      <div className="dsg-layout">
        <div className="dsg-controls">
          <div className="dsg-controls-inner">
            {isCustom && (
              <div className="dsg-custom-banner">
                <span className="dsg-custom-badge">Своя тема</span>
                <span className="dsg-custom-hint">Цвета отличаются от выбранного пресета</span>
                <div className="dsg-revert-row">
                  <label className="dsg-revert-label" htmlFor="dsg-revert-preset">Вернуть к пресету</label>
                  <select
                    id="dsg-revert-preset"
                    className="dsg-select"
                    value={revertPresetId}
                    onChange={e => setRevertPresetId(e.target.value)}
                  >
                    {DESIGN_PRESETS.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                  <button type="button" className="dsg-revert-btn" onClick={revertToChosenPreset}>
                    Сбросить
                  </button>
                </div>
              </div>
            )}

            <div className="dsg-block">
              <div className="dsg-block-label">Пресеты</div>
              <div className="dsg-presets">
                {DESIGN_PRESETS.map(p => (
                  <button
                    key={p.id}
                    type="button"
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

            <div className="dsg-block">
              <div className="dsg-block-label">Цвета</div>
              <div className="dsg-color-grid">
                <ColorSwatch label="Акцент" value={d.accent} onChange={v => patchDesign({ accent: v })} />
                <ColorSwatch label="Акцент 2" value={d.accent2} onChange={v => patchDesign({ accent2: v })} />
                <ColorSwatch label="Фон" value={d.bg} onChange={v => patchDesign({ bg: v })} />
                <ColorSwatch label="Орб 1" value={d.orb1} onChange={v => patchDesign({ orb1: v })} />
                <ColorSwatch label="Орб 2" value={d.orb2} onChange={v => patchDesign({ orb2: v })} />
                <ColorSwatch label="Текст" value={d.text} onChange={v => patchDesign({ text: v })} />
                <ColorSwatch label="Текст 2" value={d.text2} onChange={v => patchDesign({ text2: v })} />
              </div>
            </div>

            <div className="dsg-compact-grid">
              <div className="dsg-block">
                <div className="dsg-block-label">Типографика</div>
                <Segmented
                  value={d.type_scale}
                  options={[
                    { id: 'compact', label: 'Компакт' },
                    { id: 'normal', label: 'Обычно' },
                    { id: 'large', label: 'Крупно' },
                  ]}
                  onChange={v => patchDesign({ type_scale: v as SurveyTypeScale })}
                />
              </div>

              <div className="dsg-block">
                <div className="dsg-block-label">Кнопка (стиль)</div>
                <Segmented
                  value={d.cta_style}
                  options={[
                    { id: 'gradient', label: 'Градиент' },
                    { id: 'solid', label: 'Заливка' },
                    { id: 'outline', label: 'Контур' },
                  ]}
                  onChange={v => patchDesign({ cta_style: v as SurveyCtaStyle })}
                />
              </div>

              <div className="dsg-block">
                <div className="dsg-block-label">Скругление</div>
                <Segmented
                  value={d.radius}
                  options={[
                    { id: 'sm', label: 'Меньше' },
                    { id: 'md', label: 'Средне' },
                    { id: 'lg', label: 'Больше' },
                  ]}
                  onChange={v => patchDesign({ radius: v as SurveyRadiusPreset })}
                />
              </div>

              <div className="dsg-block">
                <div className="dsg-block-label">Светимость орбов</div>
                <Segmented
                  value={d.orb_intensity}
                  options={[
                    { id: 'off', label: 'Выкл.' },
                    { id: 'low', label: 'Слабо' },
                    { id: 'medium', label: 'Средне' },
                    { id: 'high', label: 'Сильно' },
                  ]}
                  onChange={v => patchDesign({ orb_intensity: v as SurveyOrbIntensity })}
                />
              </div>
            </div>

          </div>
        </div>

        <div className="dsg-preview-wrap">
          <div className="dsg-preview-sticky">
            <div className="dsg-preview-label">Предпросмотр</div>
            <div className="dsg-preview-tabs" role="tablist">
              {([
                ['welcome', 'Приветствие'],
                ['question', 'Вопрос'],
                ['contacts', 'Контакты'],
                ['success', 'Успех'],
              ] as const).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={previewTab === id}
                  className={`dsg-preview-tab ${previewTab === id ? 'dsg-preview-tab--on' : ''}`}
                  onClick={() => setPreviewTab(id)}
                >
                  {label}
                </button>
              ))}
            </div>
            <SurveyPreview design={d} tab={previewTab} orbMul={orbMul} />
          </div>

          <div className="dsg-preview-controls">
            <div className="dsg-block">
              <div className="dsg-block-label">Контент</div>
              <div className="dsg-content-split">
                <div className="dsg-field">
                  <label className="dsg-field-label" htmlFor="dsg-logo">Логотип (URL)</label>
                  <input
                    id="dsg-logo"
                    className="dsg-input"
                    type="text"
                    inputMode="url"
                    autoComplete="off"
                    placeholder="https://example.com/logo.png"
                    value={d.logo_url ?? ''}
                    onChange={e => patchDesign({ logo_url: e.target.value })}
                    spellCheck={false}
                  />
                  <p className="dsg-field-hint">PNG/WebP/SVG до 2 МБ. Или загрузите файл — попадёт в Supabase Storage (bucket survey-logos).</p>
                  <div className="dsg-upload-row">
                    <input
                      id="dsg-logo-file"
                      type="file"
                      accept="image/*"
                      className="dsg-file-input"
                      onChange={onLogoFile}
                      disabled={uploadBusy}
                    />
                    <label htmlFor="dsg-logo-file" className="dsg-upload-label">
                      {uploadBusy ? 'Загрузка…' : 'Загрузить файл'}
                    </label>
                  </div>
                  <AnimatePresence>
                    {d.logo_url && (
                      <motion.img
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        src={d.logo_url}
                        alt="логотип"
                        className="dsg-logo-preview"
                        onError={e => { e.currentTarget.style.display = 'none' }}
                        onLoad={e => { e.currentTarget.style.display = 'block' }}
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
                    onChange={e => patchDesign({ btn_label: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <div className="dsg-block">
              <div className="dsg-block-label">Стикер в списке опросников</div>
              <p className="dsg-sticker-hint">Отображается на карточке в разделе «Опросники»</p>
              <div className="dsg-sticker-grid">
                <button
                  type="button"
                  className={`dsg-sticker-cell dsg-sticker-cell--default ${!sticker ? 'dsg-sticker-cell--active' : ''}`}
                  onClick={() => setSticker('')}
                  title="Иконка списка по умолчанию"
                >
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
                    <path d="M3 5h12M3 9h8M3 13h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                </button>
                {SURVEY_STICKER_PRESETS.map(em => (
                  <button
                    key={em}
                    type="button"
                    className={`dsg-sticker-cell ${sticker === em ? 'dsg-sticker-cell--active' : ''}`}
                    onClick={() => setSticker(em)}
                  >
                    <SurveyStickerGlyph value={em} className="dsg-sticker-glyph" />
                  </button>
                ))}
              </div>
              <div className="dsg-field dsg-field--sticker-custom">
                <label className="dsg-field-label" htmlFor="dsg-sticker-custom">Свой значок / текст</label>
                <input
                  id="dsg-sticker-custom"
                  className="dsg-input"
                  type="text"
                  inputMode="text"
                  maxLength={SURVEY_STICKER_MAX_LEN}
                  placeholder="Вставьте символ или выберите выше"
                  value={sticker}
                  onChange={e => setSticker(e.target.value.slice(0, SURVEY_STICKER_MAX_LEN))}
                />
              </div>
            </div>

            <div className="dsg-block">
              <div className="dsg-block-label">Тексты welcome</div>
              <div className="dsg-fields-grid">
                <div className="dsg-field dsg-field--span-2">
                  <label className="dsg-field-label" htmlFor="dsg-badge">Бейдж (пусто = скрыть)</label>
                  <input
                    id="dsg-badge"
                    className="dsg-input"
                    type="text"
                    placeholder="Бесплатная консультация"
                    value={d.welcome_badge}
                    onChange={e => setDesign(dd => ({
                      ...mergeSurveyDesign(dd ?? undefined),
                      welcome_badge: e.target.value,
                    }))}
                  />
                </div>
                <div className="dsg-field">
                  <label className="dsg-field-label" htmlFor="dsg-h1">Подсказка слева (иконка времени)</label>
                  <input
                    id="dsg-h1"
                    className="dsg-input"
                    type="text"
                    placeholder="2 минуты"
                    value={d.welcome_hint_1}
                    onChange={e => setDesign(dd => ({
                      ...mergeSurveyDesign(dd ?? undefined),
                      welcome_hint_1: e.target.value,
                    }))}
                  />
                </div>
                <div className="dsg-field">
                  <label className="dsg-field-label" htmlFor="dsg-h2">Подсказка справа (иконка замка)</label>
                  <input
                    id="dsg-h2"
                    className="dsg-input"
                    type="text"
                    placeholder="данные в безопасности"
                    value={d.welcome_hint_2}
                    onChange={e => setDesign(dd => ({
                      ...mergeSurveyDesign(dd ?? undefined),
                      welcome_hint_2: e.target.value,
                    }))}
                  />
                </div>
              </div>
            </div>

            {contrast.length > 0 && (
              <div className="dsg-a11y-block">
                <div className="dsg-block-label">Доступность</div>
                <ul className="dsg-a11y-list">
                  {contrast.map((line, i) => (
                    <li key={i}>{line}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function Segmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T
  options: { id: T; label: string }[]
  onChange: (v: T) => void
}) {
  return (
    <div className="dsg-segmented">
      {options.map(o => (
        <button
          key={o.id}
          type="button"
          className={`dsg-seg-btn ${value === o.id ? 'dsg-seg-btn--on' : ''}`}
          onClick={() => onChange(o.id)}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

function SurveyPreview({
  design: m,
  tab,
  orbMul,
}: {
  design: ReturnType<typeof mergeSurveyDesign>
  tab: PreviewTab
  orbMul: number
}) {
  const accent = m.accent
  const accent2 = m.accent2
  const bg = m.bg
  const orb1 = m.orb1
  const orb2 = m.orb2
  const text = m.text
  const text2 = m.text2
  const btnLabel = m.btn_label?.trim() || 'Начать опрос'
  const r = m.radius === 'sm' ? 10 : m.radius === 'lg' ? 20 : 14

  const ctaStyle: CSSProperties =
    m.cta_style === 'solid'
      ? { background: accent, color: '#fff', border: 'none' }
      : m.cta_style === 'outline'
        ? { background: 'transparent', color: accent, border: `2px solid ${accent}` }
        : { background: `linear-gradient(135deg, ${accent} 0%, ${accent2} 100%)`, color: '#fff', border: 'none' }

  const showBadge = m.welcome_badge.length > 0

  return (
    <div className="dsg-preview" style={{ background: bg }}>
      <div
        className="dsg-preview-orb dsg-preview-orb--1"
        style={{
          background: `radial-gradient(circle, ${orb1} 0%, transparent 70%)`,
          opacity: orbMul,
        }}
      />
      <div
        className="dsg-preview-orb dsg-preview-orb--2"
        style={{
          background: `radial-gradient(circle, ${orb2} 0%, transparent 70%)`,
          opacity: orbMul,
        }}
      />

      <div className="dsg-preview-inner">
        {tab === 'welcome' && (
          <>
            {m.logo_url && (
              <img src={m.logo_url} alt="" className="dsg-preview-logo" onError={e => { e.currentTarget.style.display = 'none' }} />
            )}
            {showBadge && (
              <div className="dsg-preview-badge" style={{ borderColor: `${accent}55`, color: accent }}>
                <span className="dsg-preview-badge-dot" style={{ background: accent }} />
                {m.welcome_badge}
              </div>
            )}
            <div className="dsg-preview-title" style={{ color: text }}>Помогите нам стать лучше для вас</div>
            <div className="dsg-preview-sub" style={{ color: text2 }}>Пройдите короткий опрос — и мы свяжемся с вами</div>
            <button type="button" className="dsg-preview-cta" style={{ ...ctaStyle, borderRadius: Math.min(999, r * 2 + 8) }}>
              {btnLabel}
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            {(m.welcome_hint_1 || m.welcome_hint_2) && (
              <div className="dsg-preview-hints" style={{ color: text2 }}>
                {m.welcome_hint_1 && <span>{m.welcome_hint_1}</span>}
                {m.welcome_hint_1 && m.welcome_hint_2 && <span className="dsg-preview-dot" />}
                {m.welcome_hint_2 && <span>{m.welcome_hint_2}</span>}
              </div>
            )}
          </>
        )}

        {tab === 'question' && (
          <div className="dsg-mock-card" style={{ borderRadius: r, borderColor: `${text}18`, color: text }}>
            <div className="dsg-mock-pill" style={{ color: text2 }}>Вопрос 1 из 3</div>
            <div className="dsg-mock-q" style={{ color: text }}>Какой вариант вам ближе?</div>
            <div className="dsg-mock-chips">
              <span className="dsg-mock-chip" style={{ borderRadius: r, borderColor: `${accent}55`, background: `${accent}18` }}>Вариант А</span>
              <span className="dsg-mock-chip" style={{ borderRadius: r, border: `1px solid ${text}22`, color: text2 }}>Вариант Б</span>
              <span className="dsg-mock-chip" style={{ borderRadius: r, border: `1px solid ${text}22`, color: text2 }}>Вариант В</span>
            </div>
            <div className="dsg-mock-nav">
              <span className="dsg-mock-back" style={{ color: text2 }}>Назад</span>
              <span className="dsg-mock-next" style={{ ...ctaStyle, borderRadius: r, padding: '8px 16px', fontSize: 12 }}>Далее</span>
            </div>
          </div>
        )}

        {tab === 'contacts' && (
          <div className="dsg-mock-card dsg-mock-card--narrow" style={{ borderRadius: r, borderColor: `${text}18`, color: text }}>
            <div className="dsg-mock-q" style={{ color: text }}>Контакты</div>
            <div className="dsg-mock-field" style={{ borderRadius: r, border: `1px solid ${text}20`, color: text2 }}>Имя</div>
            <div className="dsg-mock-field" style={{ borderRadius: r, border: `1px solid ${text}20`, color: text2 }}>Телефон</div>
            <div className="dsg-mock-consent" style={{ borderRadius: r, border: `1px solid ${accent}40`, color: text2 }}>
              Согласие на обработку данных
            </div>
            <button type="button" className="dsg-preview-cta" style={{ ...ctaStyle, borderRadius: r, width: '100%', justifyContent: 'center' }}>
              Отправить
            </button>
          </div>
        )}

        {tab === 'success' && (
          <div className="dsg-mock-success" style={{ borderRadius: r + 8, border: `1px solid ${text}14`, background: `${bg}ee` }}>
            <div className="dsg-mock-success-icon" aria-hidden>
              <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
                <circle cx="20" cy="20" r="18" stroke="#22c55e" strokeWidth="1.5" opacity="0.85" />
                <path d="M12 20l6 6 10-12" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div className="dsg-mock-success-title" style={{ color: text }}>Заявка отправлена</div>
            <p className="dsg-mock-success-sub" style={{ color: text2 }}>Мы свяжемся с вами в ближайшее время</p>
            <button
              type="button"
              className="dsg-mock-ghost-btn"
              style={{ borderRadius: r, border: `1px solid ${text}22`, color: text2 }}
            >
              На главную опроса
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function ColorSwatch({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const pickRef = useRef<HTMLInputElement>(null)
  const normalized = value.startsWith('#') ? value : `#${value}`
  const [hexDraft, setHexDraft] = useState(normalized)
  const [prevNormalized, setPrevNormalized] = useState(normalized)
  if (prevNormalized !== normalized) {
    setPrevNormalized(normalized)
    setHexDraft(normalized)
  }

  async function copyHex() {
    try {
      await navigator.clipboard.writeText(normalized)
    } catch { /* ignore */ }
  }

  return (
    <div className="dsg-color-swatch">
      <span className="dsg-swatch-label">{label}</span>
      <button
        type="button"
        className="dsg-swatch-btn"
        style={{ background: value }}
        onClick={() => pickRef.current?.click()}
        title={label}
      />
      <input
        ref={pickRef}
        type="color"
        value={normalized.length === 7 ? normalized : '#000000'}
        onChange={e => onChange(e.target.value)}
        className="dsg-color-hidden"
        tabIndex={-1}
      />
      <div className="dsg-hex-row">
        <input
          type="text"
          className="dsg-hex-input"
          maxLength={7}
          value={hexDraft}
          onChange={e => setHexDraft(e.target.value)}
          onBlur={() => {
            const t = hexDraft.trim()
            if (/^#[0-9a-fA-F]{6}$/.test(t)) onChange(t)
            else setHexDraft(normalized)
          }}
          aria-label={`${label} HEX`}
        />
        <button type="button" className="dsg-copy-hex" onClick={copyHex}>Копировать</button>
      </div>
    </div>
  )
}

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

function SurveyStickerGlyph({ value, className }: { value: string; className?: string }) {
  const icon = getSurveyStickerIcon(value)
  if (!icon) return <span className={className}>{value}</span>
  return (
    <svg className={className} viewBox={icon.viewBox} fill="none" aria-hidden="true">
      {icon.paths.map((path, idx) => (
        <path
          key={idx}
          d={path.d}
          fill={path.fill ?? 'none'}
          stroke={path.stroke ?? 'currentColor'}
          strokeWidth={path.strokeWidth ?? 1.4}
          strokeLinecap={path.strokeLinecap ?? 'round'}
          strokeLinejoin={path.strokeLinejoin ?? 'round'}
        />
      ))}
    </svg>
  )
}
