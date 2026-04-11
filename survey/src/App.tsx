import { useState, useEffect, memo } from 'react'
import { AnimatePresence } from 'framer-motion'
import { saveSurveyResponse, markTokenOpened } from './lib/supabase'
import { SparklesCore } from './components/ui/sparkles'
import { DottedSurface } from './components/ui/dotted-surface'
import { loadConfig, loadConfigRemote } from './config'
import { WelcomeScreen } from './components/survey/WelcomeScreen'
import { SurveyForm } from './components/survey/SurveyForm'
import type { FormData } from './components/survey/SurveyForm'
import { SuccessScreen } from './components/survey/SuccessScreen'
import './App.css'

const EMPTY: FormData = {
  crm_purpose: [],
  crm_used_before: [],
  current_crm: '',
  name: '',
  phone: '',
  email: '',
  comment: '',
}

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

export default function App() {
  const [form, setForm] = useState<FormData>(EMPTY)
  const [screen, setScreen] = useState<'welcome' | 'survey'>('welcome')
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [consent, setConsent] = useState(false)
  const [cfg, setCfg] = useState(loadConfig)
  const [token] = useState(() => new URLSearchParams(window.location.search).get('t') ?? undefined)

  useEffect(() => {
    loadConfigRemote().then(setCfg)
    if (token) markTokenOpened(token)
  }, [])

  const validPhone = /^[\d\s\+\-\(\)]{7,}$/.test(form.phone.trim())
  const canSubmit =
    form.crm_purpose.length > 0 &&
    form.crm_used_before.length > 0 &&
    form.current_crm !== '' &&
    form.name.trim().length > 0 &&
    validPhone &&
    consent

  const answeredSections = [
    form.crm_purpose.length > 0,
    form.crm_used_before.length > 0,
    form.current_crm !== '',
    form.name.trim().length > 0 && validPhone,
  ].filter(Boolean).length

  async function handleSubmit() {
    if (!canSubmit) return
    setStatus('loading')
    try {
      await saveSurveyResponse({
        crm_purpose: form.crm_purpose,
        crm_used_before: form.crm_used_before,
        current_crm: form.current_crm,
        name: form.name.trim(),
        phone: form.phone.trim(),
        email: form.email.trim() || undefined,
        comment: form.comment.trim(),
        token,
      })
      setStatus('done')
    } catch (e: unknown) {
      setErrorMsg(e instanceof Error ? e.message : 'Ошибка отправки')
      setStatus('error')
    }
  }

  function handleReset() {
    setForm(EMPTY)
    setStatus('idle')
    setScreen('welcome')
  }

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
          <WelcomeScreen key="welcome" onStart={() => setScreen('survey')} />
        ) : status === 'done' ? (
          <SuccessScreen key="done" onReset={handleReset} />
        ) : (
          <SurveyForm
            key="form"
            form={form}
            setForm={setForm}
            cfg={cfg}
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
