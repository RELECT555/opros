import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence, easeOut } from 'framer-motion'
import { getSurveys, createSurvey, updateSurveyConfig } from '../../lib/supabase'
import type { Survey, SurveyConfigData } from '../../lib/supabase'
import { SurveysListSkeleton } from './AdminSkeletons'
import { SURVEY_STICKER_PRESETS, SURVEY_STICKER_MAX_LEN, getSurveyStickerIcon } from '../../lib/surveyStickers'

interface Props {
  onSelect: (survey: Survey) => void
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

const EMPTY_CONFIG: SurveyConfigData = {
  welcome_title: '',
  welcome_sub: '',
  questions: [],
}

export function SurveysListTab({ onSelect }: Props) {
  const [surveys, setSurveys] = useState<Survey[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [creating, setCreating] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newSlug, setNewSlug] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [slugManual, setSlugManual] = useState(false)
  const [stickerPickerFor, setStickerPickerFor] = useState<number | null>(null)
  const [stickerSavingFor, setStickerSavingFor] = useState<number | null>(null)
  const stickerPickerRef = useRef<HTMLDivElement | null>(null)

  function load() {
    setLoading(true)
    getSurveys()
      .then(setSurveys)
      .catch(e => setError(e.message ?? 'Ошибка загрузки'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  useEffect(() => {
    if (stickerPickerFor === null) return
    function onPointerDown(event: MouseEvent) {
      if (!stickerPickerRef.current) return
      if (stickerPickerRef.current.contains(event.target as Node)) return
      setStickerPickerFor(null)
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setStickerPickerFor(null)
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [stickerPickerFor])

  function handleTitleChange(v: string) {
    setNewTitle(v)
    if (!slugManual) {
      setNewSlug(
        v.toLowerCase()
          .replace(/[а-яёА-ЯЁ]/g, ch => TRANSLIT[ch] ?? ch)
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '')
      )
    }
  }

  async function handleCreate() {
    if (!newTitle.trim() || !newSlug.trim()) return
    setCreating(true)
    try {
      const s = await createSurvey({
        slug: newSlug.trim(),
        title: newTitle.trim(),
        description: newDesc.trim() || undefined,
        config: EMPTY_CONFIG,
      })
      setSurveys(prev => [...prev, s])
      setShowForm(false)
      setNewTitle('')
      setNewSlug('')
      setNewDesc('')
      setSlugManual(false)
      onSelect(s)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Ошибка создания')
    } finally {
      setCreating(false)
    }
  }

  function surveySticker(survey: Survey): string {
    return survey.config.sticker?.trim() ?? ''
  }

  async function handleStickerPick(survey: Survey, sticker: string) {
    const trimmed = sticker.trim().slice(0, SURVEY_STICKER_MAX_LEN)
    const nextConfig: SurveyConfigData = { ...survey.config }
    if (trimmed) nextConfig.sticker = trimmed
    else delete nextConfig.sticker

    setStickerSavingFor(survey.id)
    try {
      await updateSurveyConfig(survey.id, nextConfig)
      setSurveys(prev => prev.map(s => (
        s.id === survey.id ? { ...s, config: nextConfig } : s
      )))
      setStickerPickerFor(null)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Не удалось обновить стикер')
    } finally {
      setStickerSavingFor(null)
    }
  }

  if (loading) {
    return <SurveysListSkeleton />
  }

  return (
    <div className="adm-tab-content">
      <div className="qed-header">
        <div className="qed-header-row">
          <div className="qed-header-left">
            <div className="qed-header-icon">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <rect x="1.5" y="1.5" width="5.5" height="5.5" rx="1.5" stroke="currentColor" strokeWidth="1.4"/>
                <rect x="9" y="1.5" width="5.5" height="5.5" rx="1.5" stroke="currentColor" strokeWidth="1.4"/>
                <rect x="1.5" y="9" width="5.5" height="5.5" rx="1.5" stroke="currentColor" strokeWidth="1.4"/>
                <rect x="9" y="9" width="5.5" height="5.5" rx="1.5" stroke="currentColor" strokeWidth="1.4"/>
              </svg>
            </div>
            <div>
              <h2 className="qed-header-title">Опросники</h2>
              <p className="qed-header-sub">{surveys.length} {surveys.length === 1 ? 'опросник' : surveys.length < 5 ? 'опросника' : 'опросников'}</p>
            </div>
          </div>
          <button className="qed-add-btn" onClick={() => setShowForm(v => !v)}>
            {showForm ? 'Отмена' : (
              <>
                <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                  <path d="M6.5 2v9M2 6.5h9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
                Новый опросник
              </>
            )}
          </button>
        </div>
      </div>

      {error && <p className="adm-err-banner">{error}</p>}

      {/* Create form */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            className="surveys-create-form"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2, ease: easeOut }}
          >
            <div className="surveys-create-header">
              <div className="surveys-create-header-icon">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M7 1.5v11M1.5 7h11" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
                </svg>
              </div>
              <h3 className="surveys-create-title">Новый опросник</h3>
            </div>
            <div className="surveys-create-fields">
              <div className="surveys-create-field">
                <label className="surveys-create-label">Название</label>
                <input
                  className="surveys-create-input"
                  type="text"
                  placeholder="Например: Обратная связь 2025"
                  value={newTitle}
                  onChange={e => handleTitleChange(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="surveys-create-field">
                <label className="surveys-create-label">URL-slug <span className="surveys-create-hint-text">латиница, цифры, дефисы</span></label>
                <div className="surveys-slug-wrap">
                  <span className="surveys-slug-prefix">/s/</span>
                  <input
                    className="surveys-create-input surveys-slug-input"
                    type="text"
                    placeholder="feedback-2025"
                    value={newSlug}
                    onChange={e => { setNewSlug(e.target.value); setSlugManual(true) }}
                  />
                </div>
              </div>
              <div className="surveys-create-field">
                <label className="surveys-create-label">Описание <span className="surveys-create-hint-text">необязательно</span></label>
                <input
                  className="surveys-create-input"
                  type="text"
                  placeholder="Короткое описание опросника"
                  value={newDesc}
                  onChange={e => setNewDesc(e.target.value)}
                />
              </div>
            </div>
            <div className="surveys-create-footer">
              <p className="surveys-create-footnote">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.2"/>
                  <path d="M6 5.5v3M6 4h.01" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                </svg>
                После создания добавьте вопросы во вкладке «Вопросы»
              </p>
              <button
                className="surveys-create-btn"
                onClick={handleCreate}
                disabled={creating || !newTitle.trim() || !newSlug.trim()}
              >
                {creating ? <span className="adm-spinner adm-spinner--sm" /> : (
                  <>
                    <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                      <path d="M6.5 2v9M2 6.5h9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                    Создать
                  </>
                )}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Survey cards */}
      {surveys.length === 0 ? (
        <div className="adm-empty surveys-empty">
          <div className="surveys-empty-icon">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <rect x="4" y="4" width="11" height="11" rx="2.5" stroke="currentColor" strokeWidth="1.5"/>
              <rect x="17" y="4" width="11" height="11" rx="2.5" stroke="currentColor" strokeWidth="1.5"/>
              <rect x="4" y="17" width="11" height="11" rx="2.5" stroke="currentColor" strokeWidth="1.5"/>
              <rect x="17" y="17" width="11" height="11" rx="2.5" stroke="currentColor" strokeWidth="1.5"/>
            </svg>
          </div>
          <p>Нет опросников</p>
          <span>Создайте первый — нажмите «Новый опросник»</span>
        </div>
      ) : (
        <div className="surveys-grid">
          {surveys.map((survey, idx) => (
            <motion.div
              key={survey.id}
              className="surveys-card"
              onClick={() => onSelect(survey)}
              role="button"
              tabIndex={0}
              onKeyDown={e => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  onSelect(survey)
                }
              }}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: idx * 0.06, ease: easeOut }}
              whileHover={{ y: -5, scale: 1.015, transition: { type: 'spring', stiffness: 380, damping: 28 } }}
              whileTap={{ scale: 0.975, transition: { type: 'spring', stiffness: 500, damping: 30 } }}
              style={{ originY: 1 }}
            >
              <span className="surveys-card-glow" aria-hidden="true" />

              <div className="surveys-card-top">
                <span className={`surveys-card-status ${survey.is_active ? 'surveys-card-status--active' : 'surveys-card-status--inactive'}`}>
                  <span className="surveys-card-status-dot" />
                  {survey.is_active ? 'Активен' : 'Неактивен'}
                </span>
                <span className="surveys-card-date">{formatDate(survey.created_at)}</span>
              </div>

              <div className="surveys-card-main">
                <div className="surveys-card-icon-wrap">
                  <button
                    type="button"
                    className={`surveys-card-icon surveys-card-icon-btn ${stickerPickerFor === survey.id ? 'surveys-card-icon--open' : ''}`}
                    onClick={e => {
                      e.stopPropagation()
                      setStickerPickerFor(prev => (prev === survey.id ? null : survey.id))
                    }}
                    disabled={stickerSavingFor === survey.id}
                    aria-label="Выбрать стикер опросника"
                  >
                    {getSurveyStickerIcon(surveySticker(survey)) ? (
                      <SurveyStickerGlyph value={surveySticker(survey)} className="surveys-card-icon-glyph" />
                    ) : surveySticker(survey) ? (
                      <span className="surveys-card-icon-emoji">{surveySticker(survey)}</span>
                    ) : (
                      <svg width="20" height="20" viewBox="0 0 18 18" fill="none" aria-hidden="true">
                        <path d="M3 5h12M3 9h8M3 13h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                      </svg>
                    )}
                  </button>
                  <AnimatePresence>
                    {stickerPickerFor === survey.id && (
                      <motion.div
                        ref={stickerPickerRef}
                        className="surveys-sticker-picker"
                        initial={{ opacity: 0, y: 8, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 4, scale: 0.98 }}
                        transition={{ duration: 0.14, ease: easeOut }}
                        onClick={e => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          className={`surveys-sticker-option ${!surveySticker(survey) ? 'surveys-sticker-option--active' : ''}`}
                          onClick={() => handleStickerPick(survey, '')}
                        >
                          <svg width="16" height="16" viewBox="0 0 18 18" fill="none" aria-hidden>
                            <path d="M3 5h12M3 9h8M3 13h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                          </svg>
                        </button>
                        {SURVEY_STICKER_PRESETS.map(em => (
                          <button
                            key={em}
                            type="button"
                            className={`surveys-sticker-option ${surveySticker(survey) === em ? 'surveys-sticker-option--active' : ''}`}
                            onClick={() => handleStickerPick(survey, em)}
                          >
                            <SurveyStickerGlyph value={em} className="surveys-sticker-option-glyph" />
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                <div className="surveys-card-copy">
                  <h3 className="surveys-card-title">{survey.title}</h3>
                  {survey.description
                    ? <p className="surveys-card-desc">{survey.description}</p>
                    : <p className="surveys-card-desc surveys-card-desc--empty">Без описания</p>
                  }
                </div>
              </div>

              <div className="surveys-card-footer">
                <span className="surveys-card-slug">/s/{survey.slug}</span>
                <span className="surveys-card-questions">
                  {survey.config.questions?.length ?? 0} вопр.
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ── Транслитерация для авто-slug ── */
const TRANSLIT: Record<string, string> = {
  а:'a',б:'b',в:'v',г:'g',д:'d',е:'e',ё:'yo',ж:'zh',з:'z',и:'i',й:'j',
  к:'k',л:'l',м:'m',н:'n',о:'o',п:'p',р:'r',с:'s',т:'t',у:'u',ф:'f',
  х:'kh',ц:'ts',ч:'ch',ш:'sh',щ:'shch',ъ:'',ы:'y',ь:'',э:'e',ю:'yu',я:'ya',
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
