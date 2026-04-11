import { useState } from 'react'
import { motion, AnimatePresence, easeOut } from 'framer-motion'
import { ThemeProvider } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import { adminTheme } from './lib/muiTheme'
import { LoginScreen } from './components/admin/LoginScreen'
import { ResponsesTab } from './components/admin/ResponsesTab'
import { AnalyticsTab } from './components/admin/AnalyticsTab'
import { TokensTab } from './components/admin/TokensTab'
import { QuestionsTab } from './components/admin/QuestionsTab'
import { SurveysListTab } from './components/admin/SurveysListTab'
import type { Survey } from './lib/supabase'
import './Admin.css'

type Tab = 'responses' | 'analytics' | 'tokens' | 'questions'

export default function AdminPage() {
  const [authed, setAuthed] = useState(false)
  const [activeSurvey, setActiveSurvey] = useState<Survey | null>(null)
  const [tab, setTab] = useState<Tab>('responses')

  if (!authed) return (
    <ThemeProvider theme={adminTheme}>
      <CssBaseline />
      <LoginScreen onAuth={() => setAuthed(true)} />
    </ThemeProvider>
  )

  return (
    <ThemeProvider theme={adminTheme}>
    <CssBaseline />
    <div className="adm-root">
      <div className="adm-bg-scene">
        <div className="adm-orb adm-orb--1" />
        <div className="adm-orb adm-orb--2" />
        <div className="adm-grid" />
      </div>

      <div className="adm-layout">
        {/* Sidebar */}
        <aside className="adm-sidebar">
          <div className="adm-sidebar-brand">
            <p className="adm-eyebrow">OPROS</p>
            <h1 className="adm-brand-title">Админ</h1>
          </div>

          <nav className="adm-nav">
            {/* Кнопка "Все опросники" — всегда видна */}
            <button
              className={`adm-nav-item ${!activeSurvey ? 'adm-nav-item--active' : ''}`}
              onClick={() => setActiveSurvey(null)}
            >
              <GridIcon /> Опросники
            </button>

            {/* Вкладки конкретного опросника */}
            {activeSurvey && (
              <>
                <div className="adm-nav-divider">
                  <span className="adm-nav-divider-label" title={activeSurvey.title}>
                    {activeSurvey.title.length > 18 ? activeSurvey.title.slice(0, 18) + '…' : activeSurvey.title}
                  </span>
                </div>
                <button
                  className={`adm-nav-item ${tab === 'responses' ? 'adm-nav-item--active' : ''}`}
                  onClick={() => setTab('responses')}
                >
                  <InboxIcon /> Заявки
                </button>
                <button
                  className={`adm-nav-item ${tab === 'analytics' ? 'adm-nav-item--active' : ''}`}
                  onClick={() => setTab('analytics')}
                >
                  <ChartIcon /> Аналитика
                </button>
                <button
                  className={`adm-nav-item ${tab === 'tokens' ? 'adm-nav-item--active' : ''}`}
                  onClick={() => setTab('tokens')}
                >
                  <LinkIcon /> Токены
                </button>
                <button
                  className={`adm-nav-item ${tab === 'questions' ? 'adm-nav-item--active' : ''}`}
                  onClick={() => setTab('questions')}
                >
                  <EditIcon /> Вопросы
                </button>
              </>
            )}
          </nav>

          {activeSurvey && (
            <a
              className="adm-survey-link"
              href={`/s/${activeSurvey.slug}`}
              target="_blank"
              rel="noopener"
            >
              <ExternalIcon /> Открыть опрос
            </a>
          )}
        </aside>

        {/* Main */}
        <main className="adm-main">
          <AnimatePresence mode="wait">
            {!activeSurvey ? (
              <motion.div
                key="surveys-list"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25, ease: easeOut }}
              >
                <SurveysListTab onSelect={survey => { setActiveSurvey(survey); setTab('responses') }} />
              </motion.div>
            ) : (
              <motion.div
                key={`${activeSurvey.id}-${tab}`}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25, ease: easeOut }}
              >
                {tab === 'responses'  ? <ResponsesTab  surveyId={activeSurvey.id} survey={activeSurvey} /> :
                 tab === 'analytics' ? <AnalyticsTab  surveyId={activeSurvey.id} /> :
                 tab === 'tokens'    ? <TokensTab     surveyId={activeSurvey.id} surveySlug={activeSurvey.slug} /> :
                 <QuestionsTab surveyId={activeSurvey.id} onSurveyUpdate={s => setActiveSurvey(s)} />}
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>
    </div>
    </ThemeProvider>
  )
}

/* ── Icons ── */
function GridIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <rect x="1.5" y="1.5" width="5.5" height="5.5" rx="1.5" stroke="currentColor" strokeWidth="1.4"/>
      <rect x="9" y="1.5" width="5.5" height="5.5" rx="1.5" stroke="currentColor" strokeWidth="1.4"/>
      <rect x="1.5" y="9" width="5.5" height="5.5" rx="1.5" stroke="currentColor" strokeWidth="1.4"/>
      <rect x="9" y="9" width="5.5" height="5.5" rx="1.5" stroke="currentColor" strokeWidth="1.4"/>
    </svg>
  )
}
function InboxIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <rect x="1.5" y="3.5" width="13" height="10" rx="2" stroke="currentColor" strokeWidth="1.4"/>
      <path d="M1.5 9.5h3.5l1.5 2h3l1.5-2H14.5" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
    </svg>
  )
}
function ChartIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M2 12V8M6 12V5M10 12V7M14 12V3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
    </svg>
  )
}
function EditIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M11 2.5l2.5 2.5-8 8H3v-2.5l8-8z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
    </svg>
  )
}
function LinkIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M6.5 9.5a3.5 3.5 0 005 0l2-2a3.5 3.5 0 00-5-5l-1 1" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
      <path d="M9.5 6.5a3.5 3.5 0 00-5 0l-2 2a3.5 3.5 0 005 5l1-1" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
    </svg>
  )
}
function ExternalIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
      <path d="M5 2H2a1 1 0 00-1 1v7a1 1 0 001 1h7a1 1 0 001-1V7M7 1h4m0 0v4m0-4L5 7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}
