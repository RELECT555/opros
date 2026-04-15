import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence, easeOut } from 'framer-motion'
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

export function SurveysListTab({ onSelect, canGrantAccess = false }: Props) {
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

  function load() {
    setLoading(true)
    getSurveys()
      .then(setSurveys)
      .catch(e => setError(e.message ?? 'Ошибка загрузки'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  useEffect(() => {
    if (!editModal) return
    setEditTitle(editModal.title)
    setEditSlug(editModal.slug)
    setEditDesc(editModal.description ?? '')
    setEditActive(editModal.is_active)
    setEditSlugManual(false)
    setEditErr('')
  }, [editModal])

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
    if (!showCreateIntro) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
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
      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {showCreateIntro && (
            <motion.div
              key="surveys-create-intro"
              className="surveys-onboard-root"
              role="presentation"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setShowCreateIntro(false)}
            >
              <motion.div
                role="dialog"
                aria-modal="true"
                aria-labelledby="surveys-onboard-title"
                className="surveys-onboard-dialog"
                initial={{ opacity: 0, y: 16, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 12, scale: 0.98 }}
                transition={{ duration: 0.28, ease: easeOut }}
                onClick={e => e.stopPropagation()}
              >
              <div className="surveys-onboard-head">
                <div className="surveys-onboard-head-text">
                  <h2 id="surveys-onboard-title" className="surveys-onboard-title">
                    Как вы хотите создать опрос?
                  </h2>
                  <p className="surveys-onboard-lead">
                    Нажмите на вариант ниже — покажем, чем они отличаются. Это только стартовая заготовка: дальше всё настраивается в админке.
                  </p>
                </div>
                <button
                  type="button"
                  className="surveys-onboard-close"
                  onClick={() => setShowCreateIntro(false)}
                  aria-label="Закрыть"
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
                    <path d="M3.5 3.5l7 7M10.5 3.5l-7 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                </button>
              </div>

              <div className="surveys-onboard-pick-grid">
                <button
                  type="button"
                  className={`surveys-onboard-pick ${createMode === 'classic' ? 'surveys-onboard-pick--on' : ''}`}
                  onClick={() => setCreateMode('classic')}
                >
                  <span className="surveys-onboard-pick-label">Классика — как по шаблону</span>
                  <span className="surveys-onboard-pick-hint">Список вопросов во вкладке «Вопросы»</span>
                  <span className="surveys-onboard-wire surveys-onboard-wire--classic" aria-hidden>
                    <span className="surveys-onboard-wire-row" />
                    <span className="surveys-onboard-wire-row" />
                    <span className="surveys-onboard-wire-row surveys-onboard-wire-row--short" />
                  </span>
                </button>
                <button
                  type="button"
                  className={`surveys-onboard-pick ${createMode === 'canvas' ? 'surveys-onboard-pick--on' : ''}`}
                  onClick={() => setCreateMode('canvas')}
                >
                  <span className="surveys-onboard-pick-label">С нуля — конструктор</span>
                  <span className="surveys-onboard-pick-hint">Страницы, блоки текста и ширина карточек</span>
                  <span className="surveys-onboard-wire surveys-onboard-wire--canvas" aria-hidden>
                    <span className="surveys-onboard-wire-page" />
                    <span className="surveys-onboard-wire-page surveys-onboard-wire-page--sm" />
                  </span>
                </button>
              </div>

              <div className="surveys-onboard-detail" key={createMode}>
                {createMode === 'classic' ? (
                  <>
                    <p className="surveys-onboard-detail-title">Классика</p>
                    <ul className="surveys-onboard-bullets">
                      <li>Пустой опрос и привычный список вопросов: тип, текст, варианты ответов.</li>
                      <li>Удобно, если нужен быстрый старт без визуальной сцены и отдельных «экранов».</li>
                      <li>Респондент видит вопросы в линейном потоке — как в типовом опроснике.</li>
                    </ul>
                  </>
                ) : (
                  <>
                    <p className="surveys-onboard-detail-title">Конструктор</p>
                    <ul className="surveys-onboard-bullets">
                      <li>Отдельная вкладка «Конструктор»: страница приветствия и шаги с блоками на canvas.</li>
                      <li>Можно расставить текст, кнопку «Начать», ширину карточек и порядок шагов.</li>
                      <li>После создания сразу откроется конструктор — добавьте блоки и вопросы.</li>
                    </ul>
                  </>
                )}
              </div>

              <div className="surveys-onboard-reassure">
                <span className="surveys-onboard-reassure-icon" aria-hidden>
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                    <path d="M9 16.5a7.5 7.5 0 100-15 7.5 7.5 0 000 15z" stroke="currentColor" strokeWidth="1.3"/>
                    <path d="M9 12.2V9M9 6.3h.01" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                  </svg>
                </span>
                <p>
                  Не переживайте из‑за выбора: это только то, с чего удобнее начать.
                  Конструктор не «ломает» остальные опросы — у каждого свой режим.
                  Если сомневаетесь, начните с классики: это спокойный и быстрый путь.
                </p>
              </div>

              <label className="surveys-onboard-skip-label">
                <input
                  type="checkbox"
                  checked={introDontShowAgain}
                  onChange={e => setIntroDontShowAgain(e.target.checked)}
                />
                <span>Больше не показывать это окно</span>
              </label>

              <div className="surveys-onboard-actions">
                <button type="button" className="surveys-onboard-btn-secondary" onClick={() => setShowCreateIntro(false)}>
                  Назад
                </button>
                <button type="button" className="surveys-onboard-btn-primary" onClick={finishCreateIntro}>
                  Понятно, ввести название и slug
                </button>
              </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}

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
              <div className="surveys-create-field">
                <span className="surveys-create-label">Как создать</span>
                <div className="surveys-create-mode-grid">
                  <button
                    type="button"
                    className={`surveys-create-mode-card ${createMode === 'classic' ? 'surveys-create-mode-card--on' : ''}`}
                    onClick={() => setCreateMode('classic')}
                  >
                    <span className="surveys-create-mode-title">Классика</span>
                    <span className="surveys-create-mode-desc">Пустой опрос и список вопросов во вкладке «Вопросы»</span>
                  </button>
                  <button
                    type="button"
                    className={`surveys-create-mode-card ${createMode === 'canvas' ? 'surveys-create-mode-card--on' : ''}`}
                    onClick={() => setCreateMode('canvas')}
                  >
                    <span className="surveys-create-mode-title">С нуля</span>
                    <span className="surveys-create-mode-desc">Страницы, блоки текста и ширина карточек в конструкторе</span>
                  </button>
                </div>
              </div>
            </div>
            <div className="surveys-create-footer">
              <p className="surveys-create-footnote">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.2"/>
                  <path d="M6 5.5v3M6 4h.01" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                </svg>
                {createMode === 'canvas'
                  ? 'Откроется вкладка «Конструктор» — добавьте блоки и вопросы'
                  : 'После создания добавьте вопросы во вкладке «Вопросы»'}
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

      {/* Access grant modal */}
      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {accessModal && (
            <motion.div
              key="access-modal-backdrop"
              className="surveys-onboard-root"
              role="presentation"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              onClick={() => { if (!accessBusy) setAccessModal(null) }}
            >
              <motion.div
                role="dialog"
                aria-modal="true"
                className="surveys-onboard-dialog"
                style={{ maxWidth: 420, gap: 16 }}
                initial={{ opacity: 0, y: 16, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 12, scale: 0.98 }}
                transition={{ duration: 0.22, ease: easeOut }}
                onClick={e => e.stopPropagation()}
              >
                <div className="surveys-onboard-head">
                  <div className="surveys-onboard-head-text">
                    <h2 className="surveys-onboard-title" style={{ fontSize: 16 }}>
                      Выдать доступ к «{accessModal.surveyTitle}»
                    </h2>
                  </div>
                  <button
                    type="button"
                    className="surveys-onboard-close"
                    onClick={() => setAccessModal(null)}
                    disabled={accessBusy}
                    aria-label="Закрыть"
                  >
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
                      <path d="M3.5 3.5l7 7M10.5 3.5l-7 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                  </button>
                </div>

                <div className="surveys-create-field" style={{ margin: 0 }}>
                  <label className="surveys-create-label">Email пользователя</label>
                  <input
                    className="surveys-create-input"
                    type="email"
                    placeholder="user@example.com"
                    value={accessEmail}
                    onChange={e => { setAccessEmail(e.target.value); setAccessResult(null) }}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && accessEmail.trim() && !accessBusy) {
                        handleGrantAccess()
                      }
                    }}
                    autoFocus
                    disabled={accessBusy}
                  />
                  <p className="surveys-create-hint-text" style={{ marginTop: 6, fontSize: 12, opacity: 0.6 }}>
                    Пользователь должен хотя бы раз войти через Google или Microsoft
                  </p>
                </div>

                {accessResult && (
                  <p style={{
                    fontSize: 13,
                    padding: '8px 12px',
                    borderRadius: 8,
                    background: accessResult.startsWith('✓') ? 'rgba(52,211,153,0.12)' : 'rgba(248,113,113,0.12)',
                    color: accessResult.startsWith('✓') ? '#34d399' : '#f87171',
                    margin: 0,
                  }}>
                    {accessResult}
                  </p>
                )}

                <div className="surveys-onboard-actions" style={{ marginTop: 4 }}>
                  <button
                    type="button"
                    className="surveys-onboard-btn-secondary"
                    onClick={() => setAccessModal(null)}
                    disabled={accessBusy}
                  >
                    Отмена
                  </button>
                  <button
                    type="button"
                    className="surveys-onboard-btn-primary"
                    onClick={handleGrantAccess}
                    disabled={accessBusy || !accessEmail.trim()}
                  >
                    {accessBusy ? <span className="adm-spinner adm-spinner--sm" /> : 'Выдать доступ'}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}

      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {editModal && (
            <motion.div
              key="edit-survey-modal"
              className="surveys-onboard-root"
              role="presentation"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              onClick={() => { if (!editBusy) setEditModal(null) }}
            >
              <motion.div
                role="dialog"
                aria-modal="true"
                aria-labelledby="surveys-edit-title"
                className="surveys-onboard-dialog"
                style={{ maxWidth: 440, gap: 14 }}
                initial={{ opacity: 0, y: 16, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 12, scale: 0.98 }}
                transition={{ duration: 0.22, ease: easeOut }}
                onClick={e => e.stopPropagation()}
              >
                <div className="surveys-onboard-head">
                  <div className="surveys-onboard-head-text">
                    <h2 id="surveys-edit-title" className="surveys-onboard-title" style={{ fontSize: 16 }}>
                      Редактировать опросник
                    </h2>
                  </div>
                  <button
                    type="button"
                    className="surveys-onboard-close"
                    onClick={() => setEditModal(null)}
                    disabled={editBusy}
                    aria-label="Закрыть"
                  >
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
                      <path d="M3.5 3.5l7 7M10.5 3.5l-7 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                  </button>
                </div>

                <div className="surveys-create-fields" style={{ gap: 12 }}>
                  <div className="surveys-create-field" style={{ margin: 0 }}>
                    <label className="surveys-create-label">Название</label>
                    <input
                      className="surveys-create-input"
                      type="text"
                      value={editTitle}
                      onChange={e => handleEditTitleChange(e.target.value)}
                      disabled={editBusy}
                    />
                  </div>
                  <div className="surveys-create-field" style={{ margin: 0 }}>
                    <label className="surveys-create-label">URL-slug</label>
                    <div className="surveys-slug-wrap">
                      <span className="surveys-slug-prefix">/s/</span>
                      <input
                        className="surveys-create-input surveys-slug-input"
                        type="text"
                        value={editSlug}
                        onChange={e => { setEditSlug(e.target.value); setEditSlugManual(true) }}
                        disabled={editBusy}
                      />
                    </div>
                  </div>
                  <div className="surveys-create-field" style={{ margin: 0 }}>
                    <label className="surveys-create-label">Описание</label>
                    <input
                      className="surveys-create-input"
                      type="text"
                      placeholder="Необязательно"
                      value={editDesc}
                      onChange={e => setEditDesc(e.target.value)}
                      disabled={editBusy}
                    />
                  </div>
                  <label className="surveys-edit-active-row">
                    <input
                      type="checkbox"
                      checked={editActive}
                      onChange={e => setEditActive(e.target.checked)}
                      disabled={editBusy}
                    />
                    <span>Опрос активен (виден по ссылке)</span>
                  </label>
                </div>

                {editErr && (
                  <p className="surveys-modal-err">{editErr}</p>
                )}

                <div className="surveys-onboard-actions" style={{ marginTop: 4 }}>
                  <button
                    type="button"
                    className="surveys-onboard-btn-secondary"
                    onClick={() => setEditModal(null)}
                    disabled={editBusy}
                  >
                    Отмена
                  </button>
                  <button
                    type="button"
                    className="surveys-onboard-btn-primary"
                    onClick={() => void handleEditSave()}
                    disabled={editBusy || !editTitle.trim() || !editSlug.trim()}
                  >
                    {editBusy ? <span className="adm-spinner adm-spinner--sm" /> : 'Сохранить'}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}

      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {deleteModal && (
            <motion.div
              key="delete-survey-modal"
              className="surveys-onboard-root"
              role="presentation"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              onClick={() => { if (!deleteBusy) setDeleteModal(null) }}
            >
              <motion.div
                role="dialog"
                aria-modal="true"
                aria-labelledby="surveys-delete-title"
                className="surveys-onboard-dialog"
                style={{ maxWidth: 420, gap: 14 }}
                initial={{ opacity: 0, y: 16, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 12, scale: 0.98 }}
                transition={{ duration: 0.22, ease: easeOut }}
                onClick={e => e.stopPropagation()}
              >
                <div className="surveys-onboard-head">
                  <div className="surveys-onboard-head-text">
                    <h2 id="surveys-delete-title" className="surveys-onboard-title" style={{ fontSize: 16 }}>
                      Удалить опросник?
                    </h2>
                    <p className="surveys-delete-lead">
                      «{deleteModal.title}» (/s/{deleteModal.slug}) будет удалён безвозвратно вместе со всеми ответами респондентов и персональными ссылками с токенами.
                    </p>
                  </div>
                  <button
                    type="button"
                    className="surveys-onboard-close"
                    onClick={() => setDeleteModal(null)}
                    disabled={deleteBusy}
                    aria-label="Закрыть"
                  >
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
                      <path d="M3.5 3.5l7 7M10.5 3.5l-7 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                  </button>
                </div>

                {deleteErr && (
                  <p className="surveys-modal-err">{deleteErr}</p>
                )}

                <div className="surveys-onboard-actions" style={{ marginTop: 4 }}>
                  <button
                    type="button"
                    className="surveys-onboard-btn-secondary"
                    onClick={() => setDeleteModal(null)}
                    disabled={deleteBusy}
                  >
                    Отмена
                  </button>
                  <button
                    type="button"
                    className="surveys-onboard-btn-danger"
                    onClick={() => void handleDeleteConfirm()}
                    disabled={deleteBusy}
                  >
                    {deleteBusy ? <span className="adm-spinner adm-spinner--sm" /> : 'Удалить навсегда'}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}
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
