import { useState, useEffect, memo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import { getSurveyBySlug, saveSurveyResponseGeneric, markTokenOpened, updateSurveyConfig } from '../lib/supabase'
import { isAdminAuthenticated } from '../lib/adminSession'
import type { Survey, SurveyDesign, SurveyQuestion } from '../lib/supabase'
import { mergeSurveyDesign, buildSurveyDesignStylesheet } from '../lib/surveyDesign'

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
import { DottedSurface } from '../components/ui/dotted-surface'
import { WelcomeScreen } from '../components/survey/WelcomeScreen'
import { AdminLinkWelcomeGate } from '../components/survey/AdminLinkWelcomeGate'
import { DynamicSurveyForm, emptyFormData } from '../components/survey/DynamicSurveyForm'
import type { DynamicFormData } from '../components/survey/DynamicSurveyForm'
import { SuccessScreen } from '../components/survey/SuccessScreen'
import '../App.css'

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
  const [consent, setConsent] = useState(false)
  const [form, setForm] = useState<DynamicFormData>({ answers: {}, name: '', phone: '', email: '', comment: '' })
  const [token] = useState(() => new URLSearchParams(window.location.search).get('t') ?? undefined)
  const editorFromUrl = searchParams.get('edit') === '1' || searchParams.get('a') === '1'
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
      return p
    }, { replace: true })
  }

  useEffect(() => {
    getSurveyBySlug(slug)
      .then(s => {
        if (!s) { setLoadError('Опрос не найден'); return }
        setSurvey(s)
        setForm(emptyFormData(s.config.questions))
        if (token) markTokenOpened(token)
        applySurveyDesign(s.config.design)
        // Сохраняем slug в историю посещённых опросов
        try {
          const visited: string[] = JSON.parse(localStorage.getItem('askly_visited') ?? '[]')
          if (!visited.includes(s.slug)) {
            localStorage.setItem('askly_visited', JSON.stringify([...visited, s.slug]))
          }
        } catch { /* ignore */ }
      })
      .catch(e => setLoadError(e.message ?? 'Ошибка загрузки опроса'))
  }, [slug])

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

  const questions = survey.config.questions
  const validPhone = /^[\d\s\+\-\(\)]{7,}$/.test(form.phone.trim())

  function isAnswered(q: typeof questions[number]): boolean {
    if (q.type === 'checkbox') return ((form.answers[q.id] as string[]) ?? []).length > 0
    return !!(form.answers[q.id])
  }

  const totalSections = questions.length + 1

  const canSubmit =
    questions.every(q => isAnswered(q)) &&
    form.name.trim().length > 0 &&
    validPhone &&
    consent

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
    setForm(emptyFormData(questions))
    setStatus('idle')
    setScreen('welcome')
    setConsent(false)
  }

  async function handleLiveQuestionSave(updated: SurveyQuestion, index: number) {
    if (!survey) return
    const nextQuestions = survey.config.questions.map((qq, i) => (i === index ? updated : qq))
    const cfg = { ...survey.config, questions: nextQuestions }
    await updateSurveyConfig(survey.id, cfg)
    setSurvey({ ...survey, config: cfg })
  }

  const welcomeTitle  = survey.config.welcome_title ?? 'Пройдите опрос'
  const welcomeSub    = survey.config.welcome_sub   ?? survey.description ?? ''
  const welcomeBtn    = survey.config.design?.btn_label?.trim() || undefined
  const welcomeLogo   = survey.config.design?.logo_url?.trim()  || undefined
  const dm = mergeSurveyDesign(survey.config.design)
  const typeScaleClass  = dm.type_scale !== 'normal' ? ` root--type-${dm.type_scale}` : ''

  const showSurveyForm = screen === 'survey' && status !== 'done'

  return (
    <div className={`root${showSurveyForm ? ' root--survey-form' : screen === 'welcome' ? ' root--welcome' : ''}${typeScaleClass}${showAdminChrome ? ' root--admin-context' : ''}`}>
      {showAdminChrome && (
        <div className="survey-admin-bar survey-admin-bar--live" role="region" aria-label="Режим администратора">
          <div className="survey-admin-bar-inner">
            <p className="survey-admin-bar-text">
              <strong>Режим правки:</strong> «Изменить вопрос» на карточке. Клиенты видят так же, без панели и без <code className="survey-admin-bar-code">?edit=1</code>.
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
            questionCount={totalSections}
            btnLabel={welcomeBtn}
            logoUrl={welcomeLogo}
            badgeText={dm.welcome_badge}
            hintLeft={dm.welcome_hint_1}
            hintRight={dm.welcome_hint_2}
          />
        ) : status === 'done' ? (
          <SuccessScreen key="done" onReset={handleReset} />
        ) : (
          <DynamicSurveyForm
            key="form"
            questions={questions}
            form={form}
            setForm={setForm}
            status={status}
            canSubmit={canSubmit}
            consent={consent}
            setConsent={setConsent}
            handleSubmit={handleSubmit}
            errorMsg={errorMsg}
            token={token}
            liveEdit={showLiveEdit}
            onLiveQuestionSave={showLiveEdit ? handleLiveQuestionSave : undefined}
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
