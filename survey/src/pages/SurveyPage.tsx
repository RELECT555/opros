import { useState, useEffect, memo } from 'react'
import { AnimatePresence } from 'framer-motion'
import { getSurveyBySlug, saveSurveyResponseGeneric, markTokenOpened } from '../lib/supabase'
import type { Survey } from '../lib/supabase'
import { SparklesCore } from '../components/ui/sparkles'
import { DottedSurface } from '../components/ui/dotted-surface'
import { WelcomeScreen } from '../components/survey/WelcomeScreen'
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
  const [survey, setSurvey] = useState<Survey | null>(null)
  const [loadError, setLoadError] = useState('')
  const [screen, setScreen] = useState<'welcome' | 'survey'>('welcome')
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [consent, setConsent] = useState(false)
  const [form, setForm] = useState<DynamicFormData>({ answers: {}, name: '', phone: '', email: '', comment: '' })
  const [token] = useState(() => new URLSearchParams(window.location.search).get('t') ?? undefined)

  useEffect(() => {
    getSurveyBySlug(slug)
      .then(s => {
        if (!s) { setLoadError('Опрос не найден'); return }
        setSurvey(s)
        setForm(emptyFormData(s.config.questions))
        if (token) markTokenOpened(token)
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

  const answeredSections = [
    ...questions.map(q =>
      q.type === 'checkbox'
        ? (form.answers[q.id] as string[])?.length > 0
        : !!(form.answers[q.id])
    ),
    form.name.trim().length > 0 && validPhone,
  ].filter(Boolean).length

  const totalSections = questions.length + 1

  const canSubmit =
    questions.every(q =>
      q.type === 'checkbox'
        ? (form.answers[q.id] as string[])?.length > 0
        : !!(form.answers[q.id])
    ) &&
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

  const welcomeTitle = survey.config.welcome_title ?? 'Пройдите опрос'
  const welcomeSub   = survey.config.welcome_sub   ?? survey.description ?? ''

  return (
    <div className="root">
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
            answeredSections={answeredSections}
            handleSubmit={handleSubmit}
            errorMsg={errorMsg}
            token={token}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
