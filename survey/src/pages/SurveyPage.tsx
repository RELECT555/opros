import { useState, useEffect, useMemo, useSyncExternalStore, memo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import { getSurveyBySlug, getInvitation, saveSurveyResponseGeneric, markTokenOpened, updateSurveyConfig } from '../lib/api-client'
import { ConfigAutosave } from '../lib/configAutosave'
import { isAdminAuthenticated } from '../lib/adminSession'
import type { Survey, SurveyDesign, SurveyQuestion, SurveyConfigData } from '../lib/supabase'
import { isViteSupabaseConfigured } from '../lib/supabase'
import { API_BASE_URL } from '../lib/apiBaseUrl'
import { mergeSurveyDesign, buildSurveyDesignStylesheet } from '../lib/surveyDesign'
import {
  getContentPages,
  isCanvasSurvey,
  orderedQuestionsFromCanvas,
  stepWidthClassForQuestionId,
} from '../lib/surveyCanvas'
import {
  allRequiredConsentsChecked,
  contactsStepComplete,
  mergeContactsBlockConfig,
} from '../lib/contactsBlock'
function applySurveyDesign(d?: SurveyDesign) {
  const styleId = 'survey-design-vars'
  let el = document.getElementById(styleId) as HTMLStyleElement | null
  if (!el) {
    el = document.createElement('style')
    el.id = styleId
    document.head.appendChild(el)
  }
  el.textContent = buildSurveyDesignStylesheet(d)
}
import { SparklesCore } from '../components/ui/sparkles'
import { DottedSurface } from '../components/ui/DottedSurface'
import { WelcomeScreen } from '../components/survey/WelcomeScreen'
import { AdminLinkWelcomeGate } from '../components/survey/AdminLinkWelcomeGate'
import { emptyFormData } from '../components/survey/DynamicSurveyForm'
import { SurveyFormEntry } from '../components/survey/SurveyFormEntry'
import type { DynamicFormData } from '../components/survey/DynamicSurveyForm'
import { SuccessScreen } from '../components/survey/SuccessScreen'
import { isConstructorCanvasUnlock } from '../lib/liveEditLinks'
import '../styles/survey.css'

const GlobalSparkles = memo(() => (
  <div className="global-sparkles" aria-hidden="true">
    <SparklesCore
      id="global-sparkles"
      background="transparent"
      minSize={0.3}
      maxSize={1.1}
      particleDensity={60}
      className="w-full h-full"
      particleColor="#FFFFFF"
      speed={0.8}
    />
  </div>
))

interface Props {
  slug: string
}

export default function SurveyPage({ slug }: Props) {
  const [searchParams, setSearchParams] = useSearchParams()
  const [adminOk, setAdminOk] = useState(() => isAdminAuthenticated())
  const [survey, setSurvey] = useState<Survey | null>(null)
  const [loadError, setLoadError] = useState('')
  const [screen, setScreen] = useState<'welcome' | 'survey'>('welcome')
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [form, setForm] = useState<DynamicFormData>({
    answers: {},
    name: '',
    phone: '',
    email: '',
    comment: '',
    consentChecks: {},
  })
  const token = searchParams.get('t') || undefined
  const surveyId = survey?.id
  const autosave = useMemo(() => new ConfigAutosave(cfg => updateSurveyConfig(surveyId!, cfg)), [surveyId])
  const saveState = useSyncExternalStore(autosave.subscribe, autosave.getSnapshot)

  useEffect(() => () => { void autosave.flush() }, [autosave])
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (autosave.getSnapshot().status !== 'idle') event.preventDefault()
    }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [autosave])
  const editorFromUrl = searchParams.get('edit') === '1' || searchParams.get('a') === '1'
  const canvasUnlockCv = searchParams.get('cv')
  const canvasToolsFromUrl =
    searchParams.get('canvas') === '1' && isConstructorCanvasUnlock(slug, canvasUnlockCv)
  const showLiveEdit = editorFromUrl && adminOk
  const [showAdminLinkGate, setShowAdminLinkGate] = useState(() => {
    if (typeof window === 'undefined') return false
    const p = new URLSearchParams(window.location.search)
    const isEdit = p.get('edit') === '1' || p.get('a') === '1'
    if (!isEdit) return false
    try {
      return sessionStorage.getItem(`askly_admin_edit_gate_${slug}`) !== '1'
    } catch {
      return true
    }
  })

  function acknowledgeAdminLinkGate() {
    try {
      sessionStorage.setItem(`askly_admin_edit_gate_${slug}`, '1')
    } catch {
      /* ignore */
    }
    setShowAdminLinkGate(false)
  }
  /** Панель и подсказки только при явном ?edit=1 — не на обычных ссылках для клиентов */
  const showAdminChrome = adminOk && editorFromUrl

  useEffect(() => {
    function refreshAdmin() {
      setAdminOk(isAdminAuthenticated())
    }
    window.addEventListener('focus', refreshAdmin)
    window.addEventListener('storage', refreshAdmin)
    return () => {
      window.removeEventListener('focus', refreshAdmin)
      window.removeEventListener('storage', refreshAdmin)
    }
  }, [])

  function disableLiveEdit() {
    setSearchParams(prev => {
      const p = new URLSearchParams(prev)
      p.delete('edit')
      p.delete('a')
      p.delete('canvas')
      p.delete('cv')
      return p
    }, { replace: true })
  }

  useEffect(() => {
    let cancelled = false
    if (!slug?.trim()) {
      queueMicrotask(() => { if (!cancelled) setLoadError('Некорректная ссылка на опрос') })
      return () => { cancelled = true }
    }
    queueMicrotask(() => { if (!cancelled) { setLoadError(''); setSurvey(null); setStatus('idle'); setScreen('welcome') } })
    getSurveyBySlug(slug.trim())
      .then(async s => {
        if (cancelled) return
        if (!s) {
          const hint =
            !isViteSupabaseConfigured() && !API_BASE_URL
              ? ' Проверьте в Vercel переменные VITE_SUPABASE_URL и VITE_SUPABASE_ANON_KEY (и пересборку) или задайте VITE_API_URL на бэкенд.'
              : ''
          setLoadError(`Опрос не найден${hint}`)
          return
        }
        const invitation = token ? await getInvitation(token, s.id) : null
        if (cancelled) return
        setSurvey(s)
        setForm({ ...emptyFormData(orderedQuestionsFromCanvas(s.config), s.config.contacts_block), email: invitation?.email ?? '' })
        if (token) void markTokenOpened(token)
        applySurveyDesign(s.config.design)
        // Сохраняем slug в историю посещённых опросов
        try {
          const visited: string[] = JSON.parse(localStorage.getItem('askly_visited') ?? '[]')
          if (!visited.includes(s.slug)) {
            localStorage.setItem('askly_visited', JSON.stringify([...visited, s.slug]))
          }
        } catch { /* ignore */ }
      })
      .catch(e => { if (!cancelled) setLoadError(e.message ?? 'Ошибка загрузки опроса') })
    return () => { cancelled = true }
  }, [slug, token])

  async function persistCanvasConfig(fn: (c: SurveyConfigData) => SurveyConfigData) {
    if (!survey) return
    const nextCfg = fn(survey.config)
    setSurvey({ ...survey, config: nextCfg })
    setForm(emptyFormData(orderedQuestionsFromCanvas(nextCfg), nextCfg.contacts_block))
    autosave.schedule(nextCfg)
  }

  if (loadError) {
    return (
      <div className="root" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 16 }}>{loadError}</p>
      </div>
    )
  }

  if (!survey) {
    return (
      <div className="root" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span className="spinner" style={{ width: 32, height: 32, borderWidth: 3 }} />
      </div>
    )
  }

  const questions = orderedQuestionsFromCanvas(survey.config)
  const contactsResolved = mergeContactsBlockConfig(survey.config.contacts_block)

  function isAnswered(q: typeof questions[number]): boolean {
    if (q.type === 'checkbox') return ((form.answers[q.id] as string[]) ?? []).length > 0
    const answer = form.answers[q.id]
    return typeof answer === 'string' && answer.trim().length > 0
  }

  const canSubmit =
    questions.every(q => isAnswered(q)) &&
    contactsStepComplete(form, contactsResolved) &&
    allRequiredConsentsChecked(form, contactsResolved)

  async function handleSubmit() {
    if (!canSubmit) return
    setStatus('loading')
    try {
      await saveSurveyResponseGeneric({
        surveyId: survey!.id,
        answers: form.answers,
        name: form.name.trim(),
        phone: form.phone.trim(),
        email: form.email.trim() || undefined,
        comment: form.comment.trim() || undefined,
        token,
      })
      setStatus('done')
    } catch (e: unknown) {
      setErrorMsg(e instanceof Error ? e.message : 'Ошибка отправки')
      setStatus('error')
    }
  }

  function handleReset() {
    if (!survey) return
    setForm(emptyFormData(questions, survey.config.contacts_block))
    setStatus('idle')
    setScreen('welcome')
  }

  async function handleLiveQuestionSave(updated: SurveyQuestion, index: number) {
    if (!survey) return
    const order = orderedQuestionsFromCanvas(survey.config)
    const target = order[index]
    if (!target) return
    const nextQuestions = survey.config.questions.map(qq => (qq.id === target.id ? updated : qq))
    const cfg = { ...survey.config, questions: nextQuestions }
    setSurvey({ ...survey, config: cfg })
    setForm(emptyFormData(orderedQuestionsFromCanvas(cfg), cfg.contacts_block))
    autosave.schedule(cfg)
    await autosave.flush()
    if (autosave.getSnapshot().status === 'error') throw new Error(autosave.getSnapshot().error)
  }

  const welcomePageBlocks = isCanvasSurvey(survey.config)
    ? (survey.config.canvas!.pages.find(p => p.role === 'welcome')?.blocks ?? [])
    : null
  const canvasContentPages = isCanvasSurvey(survey.config) ? getContentPages(survey.config) : undefined
  const welcomeTitle  = survey.config.welcome_title ?? 'Пройдите опрос'
  const welcomeSub    = survey.config.welcome_sub   ?? survey.description ?? ''
  const welcomeBtn    = survey.config.design?.btn_label?.trim() || undefined
  const welcomeLogo   = survey.config.design?.logo_url?.trim()  || undefined
  const dm = mergeSurveyDesign(survey.config.design)
  const typeScaleClass  = dm.type_scale !== 'normal' ? ` root--type-${dm.type_scale}` : ''

  const showSurveyForm = screen === 'survey' && status !== 'done'
  const showCanvasLiveTools =
    showLiveEdit && canvasToolsFromUrl && isCanvasSurvey(survey.config)

  return (
    <div className={`root${showSurveyForm ? ' root--survey-form' : screen === 'welcome' ? ' root--welcome' : ''}${typeScaleClass}${showAdminChrome ? ' root--admin-context' : ''}`}>
      {showAdminChrome && (
        <div className="survey-admin-bar survey-admin-bar--live" role="region" aria-label="Режим администратора">
          <div className="survey-admin-bar-inner">
            <div aria-live="polite">
              {saveState.status === 'error' ? (
                <span role="alert">Не удалось сохранить: {saveState.error}{' '}
                  <button type="button" className="survey-admin-bar-btn" onClick={() => void autosave.flush()}>Повторить сохранение</button>
                </span>
              ) : <span>{saveState.status === 'idle' ? 'Все изменения сохранены' : 'Сохранение…'}</span>}
            </div>
            <p className="survey-admin-bar-text">
              {isCanvasSurvey(survey.config) ? (
                showCanvasLiveTools ? (
                  <>
                    <strong>Конструктор на живой странице:</strong> блоки, приветствие, ширина шагов; тексты вопросов — «Изменить вопрос». Без <code className="survey-admin-bar-code">?edit=1</code> виден только опрос.
                  </>
                ) : (
                  <>
                    <strong>Правка текстов:</strong> «Изменить вопрос» на карточках. Полотно и блоки — только из админки: раздел «Конструктор» → ссылка «открыть полную правку на сайте» (не копируйте адрес вручную).
                  </>
                )
              ) : (
                <>
                  <strong>Режим правки:</strong> «Изменить вопрос» на карточке. Клиенты видят так же, без панели и без <code className="survey-admin-bar-code">?edit=1</code>.
                </>
              )}
            </p>
            <button type="button" className="survey-admin-bar-btn survey-admin-bar-btn--ghost" onClick={disableLiveEdit}>
              Снять правку
            </button>
          </div>
        </div>
      )}

      <div className="bg-scene">
        <div className="bg-orb bg-orb--1" />
        <div className="bg-orb bg-orb--2" />
        <div className="bg-orb bg-orb--3" />
        <div className="bg-grid" />
      </div>

      {screen === 'welcome'
        ? <DottedSurface className="fixed inset-0 z-0" />
        : <GlobalSparkles />
      }

      <AnimatePresence mode="wait">
        {screen === 'welcome' ? (
          <WelcomeScreen
            key="welcome"
            onStart={() => setScreen('survey')}
            title={welcomeTitle}
            sub={welcomeSub}
            questionCount={questions.length}
            topics={questions.map(({ id, title }) => ({ id, title }))}
            btnLabel={welcomeBtn}
            logoUrl={welcomeLogo}
            badgeText={dm.welcome_badge}
            hintLeft={dm.welcome_hint_1}
            hintRight={dm.welcome_hint_2}
            welcomeCanvasBlocks={welcomePageBlocks}
            liveWelcomeEdit={showCanvasLiveTools}
            onWelcomePatch={showCanvasLiveTools ? persistCanvasConfig : undefined}
          />
        ) : status === 'done' ? (
          <SuccessScreen key="done" onReset={handleReset} />
        ) : (
          <SurveyFormEntry
            key="form"
            questions={questions}
            form={form}
            setForm={setForm}
            status={status}
            canSubmit={canSubmit}
            contactsBlock={contactsResolved}
            handleSubmit={handleSubmit}
            errorMsg={errorMsg}
            token={token}
            liveEdit={showLiveEdit}
            onLiveQuestionSave={showLiveEdit ? handleLiveQuestionSave : undefined}
            questionWrapClass={
              isCanvasSurvey(survey.config)
                ? () => 'sf-canvas-qcard-wrap'
                : q => stepWidthClassForQuestionId(survey.config, q.id)
            }
            canvasContentPages={canvasContentPages}
            liveCanvasEdit={showCanvasLiveTools}
            onCanvasPatch={showCanvasLiveTools ? persistCanvasConfig : undefined}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showAdminLinkGate ? (
          <AdminLinkWelcomeGate key="admin-link-gate" onContinue={acknowledgeAdminLinkGate} />
        ) : null}
      </AnimatePresence>
    </div>
  )
}
