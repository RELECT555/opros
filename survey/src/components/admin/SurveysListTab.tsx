import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence, easeOut } from 'framer-motion'
import { SurveyCreateIntro } from '../../features/surveys/SurveyCreateIntro'
import { SurveyCreateForm } from '../../features/surveys/SurveyCreateForm'
import { SurveyAccessDialog } from '../../features/surveys/SurveyAccessDialog'
import { SurveyEditDialog } from '../../features/surveys/SurveyEditDialog'
import { SurveyDeleteDialog } from '../../features/surveys/SurveyDeleteDialog'
import {
  getSurveys,
  createSurvey,
  updateSurveyConfig,
  updateSurveyMeta,
  deleteSurvey,
  grantSurveyAccess,
} from '../../lib/api-client'
import type { Survey, SurveyConfigData } from '../../lib/api-client'
import { createDefaultCanvasSurveyConfig } from '../../lib/surveyCanvas'
import { SurveysListSkeleton } from './AdminSkeletons'
import { SURVEY_STICKER_PRESETS, SURVEY_STICKER_MAX_LEN, getSurveyStickerIcon } from '../../lib/surveyStickers'

interface Props {
  onSelect: (survey: Survey, options?: { openTab?: 'builder' }) => void
  onListChange?: (surveys: Survey[]) => void
  /** Глобальный админ: выдача доступа к опросу по email */
  canGrantAccess?: boolean
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

const EMPTY_CONFIG: SurveyConfigData = {
  welcome_title: '',
  welcome_sub: '',
  questions: [],
}

const SURVEY_CREATE_INTRO_STORAGE = 'askly_survey_create_intro_hide'

function isSurveyCreateIntroHidden(): boolean {
  try {
    return localStorage.getItem(SURVEY_CREATE_INTRO_STORAGE) === '1'
  } catch {
    return false
  }
}

export function SurveysListTab({ onSelect, onListChange, canGrantAccess = false }: Props) {
  const [surveys, setSurveys] = useState<Survey[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [creating, setCreating] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newSlug, setNewSlug] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [slugManual, setSlugManual] = useState(false)
  const [createMode, setCreateMode] = useState<'classic' | 'canvas'>('classic')
  const [showCreateIntro, setShowCreateIntro] = useState(false)
  const [introDontShowAgain, setIntroDontShowAgain] = useState(false)
  const [stickerPickerFor, setStickerPickerFor] = useState<number | null>(null)
  const [stickerSavingFor, setStickerSavingFor] = useState<number | null>(null)
  const stickerPickerRef = useRef<HTMLDivElement | null>(null)
  const [accessModal, setAccessModal] = useState<{ surveyId: number; surveyTitle: string } | null>(null)
  const [accessEmail, setAccessEmail] = useState('')
  const [accessBusy, setAccessBusy] = useState(false)
  const [accessResult, setAccessResult] = useState<string | null>(null)
  const [editModal, setEditModal] = useState<Survey | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editSlug, setEditSlug] = useState('')
  const [editDesc, setEditDesc] = useState('')
  const [editActive, setEditActive] = useState(true)
  const [editSlugManual, setEditSlugManual] = useState(false)
  const [editBusy, setEditBusy] = useState(false)
  const [editErr, setEditErr] = useState('')
  const [deleteModal, setDeleteModal] = useState<Survey | null>(null)
  const [deleteBusy, setDeleteBusy] = useState(false)
  const [deleteErr, setDeleteErr] = useState('')

  useEffect(() => {
    if (!loading) onListChange?.(surveys)
  }, [surveys, loading, onListChange])

  useEffect(() => {
    let active = true
    getSurveys().then(rows => { if (active) setSurveys(rows) })
      .catch(e => { if (active) setError(e.message ?? 'Ошибка загрузки') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  useEffect(() => {
    if (!editModal && !deleteModal) return
    function onKey(event: KeyboardEvent) {
      if (event.key !== 'Escape' || editBusy || deleteBusy) return
      setEditModal(null)
      setDeleteModal(null)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [editModal, deleteModal, editBusy, deleteBusy])

  useEffect(() => {
    if (!showCreateIntro) return
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setShowCreateIntro(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [showCreateIntro])

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

  function handleEditTitleChange(v: string) {
    setEditTitle(v)
    if (!editSlugManual) {
      setEditSlug(
        v.toLowerCase()
          .replace(/[а-яёА-ЯЁ]/g, ch => TRANSLIT[ch] ?? ch)
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '')
      )
    }
  }

  async function handleEditSave() {
    if (!editModal) return
    const title = editTitle.trim()
    const slug = editSlug.trim()
    if (!title || !slug) {
      setEditErr('Укажите название и URL-slug')
      return
    }
    if (!/^[a-zA-Z0-9_-]{1,100}$/.test(slug)) {
      setEditErr('Slug: латиница, цифры, дефисы и подчёркивание')
      return
    }
    setEditBusy(true)
    setEditErr('')
    try {
      const updated = await updateSurveyMeta(editModal.id, {
        title,
        slug,
        description: editDesc.trim(),
        is_active: editActive,
      })
      setSurveys(prev => prev.map(s => (s.id === updated.id ? updated : s)))
      setEditModal(null)
    } catch (e: unknown) {
      setEditErr(e instanceof Error ? e.message : 'Не удалось сохранить')
    } finally {
      setEditBusy(false)
    }
  }

  async function handleDeleteConfirm() {
    if (!deleteModal) return
    setDeleteBusy(true)
    setDeleteErr('')
    try {
      await deleteSurvey(deleteModal.id)
      setSurveys(prev => prev.filter(s => s.id !== deleteModal.id))
      setDeleteModal(null)
    } catch (e: unknown) {
      setDeleteErr(e instanceof Error ? e.message : 'Не удалось удалить')
    } finally {
      setDeleteBusy(false)
    }
  }

  async function handleCreate() {
    if (!newTitle.trim() || !newSlug.trim()) return
    setCreating(true)
    try {
      const config: SurveyConfigData =
        createMode === 'canvas' ? createDefaultCanvasSurveyConfig() : EMPTY_CONFIG
      const s = await createSurvey({
        slug: newSlug.trim(),
        title: newTitle.trim(),
        description: newDesc.trim() || undefined,
        config,
      })
      setSurveys(prev => [...prev, s])
      setShowForm(false)
      setNewTitle('')
      setNewSlug('')
      setNewDesc('')
      setSlugManual(false)
      setCreateMode('classic')
      setIntroDontShowAgain(false)
      onSelect(s, s.config.editor_mode === 'canvas' ? { openTab: 'builder' } : undefined)
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
      const saved = await updateSurveyConfig(survey.id, nextConfig, survey.revision)
      setSurveys(prev => prev.map(s => (
        s.id === survey.id ? saved : s
      )))
      setStickerPickerFor(null)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Не удалось обновить стикер')
    } finally {
      setStickerSavingFor(null)
    }
  }

  function openCreateFlow() {
    if (isSurveyCreateIntroHidden()) {
      setShowForm(true)
      return
    }
    setCreateMode('classic')
    setShowCreateIntro(true)
  }

  function closeCreateFlow() {
    setShowForm(false)
    setShowCreateIntro(false)
  }

  function finishCreateIntro() {
    if (introDontShowAgain) {
      try {
        localStorage.setItem(SURVEY_CREATE_INTRO_STORAGE, '1')
      } catch {
        /* ignore */
      }
    }
    setShowCreateIntro(false)
    setShowForm(true)
  }

  const createFlowOpen = showForm || showCreateIntro

  if (loading) {
    return <SurveysListSkeleton />
  }

  return (
    <div className="adm-tab-content">
      <SurveyCreateIntro open={showCreateIntro}
        state={{ mode: createMode, dontShowAgain: introDontShowAgain }}
        actions={{ close: () => setShowCreateIntro(false), continue: finishCreateIntro,
          changeMode: setCreateMode, changeDontShowAgain: setIntroDontShowAgain }} />

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
          <button
            className="qed-add-btn"
            onClick={() => (createFlowOpen ? closeCreateFlow() : openCreateFlow())}
          >
            {createFlowOpen ? 'Отмена' : (
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

      <SurveyCreateForm open={showForm}
        state={{ title: newTitle, slug: newSlug, description: newDesc, mode: createMode, busy: creating }}
        actions={{ changeTitle: handleTitleChange, changeSlug: value => { setNewSlug(value); setSlugManual(true) },
          changeDescription: setNewDesc, changeMode: setCreateMode, create: handleCreate }} />

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
                <span className="surveys-card-date" title="Дата создания">
                  {formatDate(survey.created_at)}
                </span>
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
                <div className="surveys-card-footer-info">
                  <span className="surveys-card-slug">/s/{survey.slug}</span>
                  <span className="surveys-card-questions">
                    {survey.config.questions?.length ?? 0} вопр.
                  </span>
                </div>
                <div className="surveys-card-footer-actions" onClick={e => e.stopPropagation()}>
                  <div className="surveys-card-toolbar" role="group" aria-label="Действия с опросником">
                    <button
                      type="button"
                      className="surveys-card-action surveys-card-action--edit"
                      title="Редактировать"
                      aria-label="Редактировать опросник"
                      onClick={e => {
                        e.stopPropagation()
                        setEditTitle(survey.title)
                        setEditSlug(survey.slug)
                        setEditDesc(survey.description ?? '')
                        setEditActive(survey.is_active)
                        setEditSlugManual(true)
                        setEditErr('')
                        setEditModal(survey)
                      }}
                    >
                      <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden>
                        <path d="M9.7 3.3l3 3-8.2 8.2H1.5v-3L9.7 3.3z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
                        <path d="M8.5 4.5l3 3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                      </svg>
                      <span className="surveys-card-action-label">Изменить</span>
                    </button>
                    <span className="surveys-card-toolbar-sep" aria-hidden />
                    <button
                      type="button"
                      className="surveys-card-action surveys-card-action--delete"
                      title="Удалить навсегда"
                      aria-label="Удалить опросник"
                      onClick={e => {
                        e.stopPropagation()
                        setDeleteErr('')
                        setDeleteModal(survey)
                      }}
                    >
                      <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden>
                        <path d="M3.5 4.5h9M6.5 4.5V3.5a1 1 0 011-1h1a1 1 0 011 1v1M5 4.5v8a1 1 0 001 1h4a1 1 0 001-1v-8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M6.5 7.5v4M9.5 7.5v4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                      </svg>
                      <span className="surveys-card-action-label">Удалить</span>
                    </button>
                    {canGrantAccess && (
                      <>
                        <span className="surveys-card-toolbar-sep" aria-hidden />
                        <button
                          type="button"
                          className="surveys-card-action surveys-card-action--access"
                          title="Выдать доступ другому пользователю"
                          aria-label="Выдать доступ"
                          onClick={e => {
                            e.stopPropagation()
                            setAccessEmail('')
                            setAccessResult(null)
                            setAccessModal({ surveyId: survey.id, surveyTitle: survey.title })
                          }}
                        >
                          <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden>
                            <path d="M8 8a2.5 2.5 0 100-5 2.5 2.5 0 000 5zM2.5 14.5v-1A4.5 4.5 0 0111 13v1.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                            <path d="M12 6.5h3M13.5 5v3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                          </svg>
                          <span className="surveys-card-action-label">Доступ</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <SurveyAccessDialog open={accessModal !== null}
        state={{ surveyTitle: accessModal?.surveyTitle ?? '', email: accessEmail, busy: accessBusy, result: accessResult }}
        actions={{ close: () => { if (!accessBusy) setAccessModal(null) }, changeEmail: value => { setAccessEmail(value); setAccessResult(null) }, grant: handleGrantAccess }} />
      <SurveyEditDialog open={editModal !== null}
        state={{ title: editTitle, slug: editSlug, description: editDesc, active: editActive, busy: editBusy, error: editErr }}
        actions={{ close: () => { if (!editBusy) setEditModal(null) }, save: handleEditSave, changeTitle: handleEditTitleChange,
          changeSlug: value => { setEditSlug(value); setEditSlugManual(true) }, changeDescription: setEditDesc, changeActive: setEditActive }} />
      <SurveyDeleteDialog open={deleteModal !== null}
        state={{ title: deleteModal?.title ?? '', slug: deleteModal?.slug ?? '', busy: deleteBusy, error: deleteErr }}
        actions={{ close: () => { if (!deleteBusy) setDeleteModal(null) }, confirm: handleDeleteConfirm }} />
    </div>
  )

  async function handleGrantAccess() {
    if (!accessModal || !accessEmail.trim()) return
    setAccessBusy(true)
    setAccessResult(null)
    try {
      await grantSurveyAccess(accessModal.surveyId, accessEmail.trim())
      setAccessResult('✓ Доступ выдан')
      setAccessEmail('')
    } catch (err) {
      setAccessResult(err instanceof Error ? err.message : 'Ошибка')
    } finally {
      setAccessBusy(false)
    }
  }
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
