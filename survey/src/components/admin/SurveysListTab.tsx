import { useState, useEffect } from 'react'
import { motion, AnimatePresence, easeOut } from 'framer-motion'
import { getSurveys, createSurvey } from '../../lib/supabase'
import type { Survey, SurveyConfigData } from '../../lib/supabase'

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

  function load() {
    setLoading(true)
    getSurveys()
      .then(setSurveys)
      .catch(e => setError(e.message ?? 'Ошибка загрузки'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

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

  if (loading) {
    return (
      <div className="adm-tab-content">
        <div className="adm-loading-rows">
          {[1, 2, 3].map(i => <div key={i} className="adm-skeleton" style={{ opacity: 1 - i * 0.25 }} />)}
        </div>
      </div>
    )
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
            <motion.button
              key={survey.id}
              className="surveys-card"
              onClick={() => onSelect(survey)}
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
                <div className="surveys-card-icon" aria-hidden="true">
                  <svg width="20" height="20" viewBox="0 0 18 18" fill="none">
                    <path d="M3 5h12M3 9h8M3 13h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
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
            </motion.button>
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
