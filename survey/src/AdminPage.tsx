import { useState, useEffect } from 'react'
import { motion, AnimatePresence, easeOut } from 'framer-motion'
import { ThemeProvider } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import { adminTheme } from './lib/muiTheme'
import { LoginScreen } from './components/admin/LoginScreen'
import { ResponsesTab } from './components/admin/ResponsesTab'
import { AnalyticsTab } from './components/admin/AnalyticsTab'
import { TokensTab } from './components/admin/TokensTab'
import { QuestionsTab } from './components/admin/QuestionsTab'
import { DesignTab } from './components/admin/DesignTab'
import { SurveysListTab } from './components/admin/SurveysListTab'
import { SettingsTab, loadAdminTheme, applyAdminTheme } from './components/admin/SettingsTab'
import type { Survey } from './lib/supabase'
import './Admin.css'

type Tab = 'responses' | 'analytics' | 'tokens' | 'questions' | 'design' | 'settings'

export default function AdminPage() {
  const [authed, setAuthed] = useState(false)
  const [activeSurvey, setActiveSurvey] = useState<Survey | null>(null)
  const [tab, setTab] = useState<Tab>('responses')
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => { applyAdminTheme(loadAdminTheme()) }, [])

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
        <motion.aside
          className={`adm-sidebar ${collapsed ? 'adm-sidebar--collapsed' : ''}`}
          animate={{ width: collapsed ? 64 : 220 }}
          transition={{ duration: 0.25, ease: easeOut }}
        >
          <div className="adm-sidebar-top">
            {!collapsed && (
              <div className="adm-sidebar-brand">
                <div className="adm-brand-mark">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                  </svg>
                </div>
                <div className="adm-brand-text">
                  <span className="adm-brand-name">Askly</span>
                  <span className="adm-brand-sub">Admin</span>
                </div>
              </div>
            )}
            {collapsed && (
              <div className="adm-brand-mark">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                </svg>
              </div>
            )}
          </div>

          <nav className="adm-nav">
            <button
              className={`adm-nav-item ${!activeSurvey && tab !== 'settings' ? 'adm-nav-item--active' : ''}`}
              onClick={() => { setActiveSurvey(null); setTab('responses') }}
              title="Опросники"
            >
              <GridIcon />
              {!collapsed && <span>Опросники</span>}
            </button>

            {activeSurvey && (
              <>
                {!collapsed && (
                  <div className="adm-nav-divider">
                    <span className="adm-nav-divider-label" title={activeSurvey.title}>
                      {activeSurvey.title.length > 18 ? activeSurvey.title.slice(0, 18) + '…' : activeSurvey.title}
                    </span>
                  </div>
                )}
                {collapsed && <div className="adm-nav-divider-dot" />}
                <button
                  className={`adm-nav-item ${tab === 'responses' ? 'adm-nav-item--active' : ''}`}
                  onClick={() => setTab('responses')}
                  title="Заявки"
                >
                  <InboxIcon />
                  {!collapsed && <span>Заявки</span>}
                </button>
                <button
                  className={`adm-nav-item ${tab === 'analytics' ? 'adm-nav-item--active' : ''}`}
                  onClick={() => setTab('analytics')}
                  title="Аналитика"
                >
                  <ChartIcon />
                  {!collapsed && <span>Аналитика</span>}
                </button>
                <button
                  className={`adm-nav-item ${tab === 'tokens' ? 'adm-nav-item--active' : ''}`}
                  onClick={() => setTab('tokens')}
                  title="Токены"
                >
                  <LinkIcon />
                  {!collapsed && <span>Токены</span>}
                </button>
                <button
                  className={`adm-nav-item ${tab === 'questions' ? 'adm-nav-item--active' : ''}`}
                  onClick={() => setTab('questions')}
                  title="Вопросы"
                >
                  <EditIcon />
                  {!collapsed && <span>Вопросы</span>}
                </button>
                <button
                  className={`adm-nav-item ${tab === 'design' ? 'adm-nav-item--active' : ''}`}
                  onClick={() => setTab('design')}
                  title="Дизайн"
                >
                  <BrushIcon />
                  {!collapsed && <span>Дизайн</span>}
                </button>
              </>
            )}
          </nav>

          <div className="adm-sidebar-bottom">
            <button
              className={`adm-nav-item ${tab === 'settings' ? 'adm-nav-item--active' : ''}`}
              onClick={() => { setActiveSurvey(null); setTab('settings') }}
              title="Настройки"
            >
              <GearIcon />
              {!collapsed && <span>Настройки</span>}
            </button>

            {activeSurvey && (
              <a
                className="adm-survey-link"
                href={`/s/${activeSurvey.slug}`}
                target="_blank"
                rel="noopener"
                title="Открыть опрос"
              >
                <ExternalIcon />
                {!collapsed && <span>Открыть опрос</span>}
              </a>
            )}

            <button
              className="adm-collapse-btn"
              onClick={() => setCollapsed(c => !c)}
              title={collapsed ? 'Развернуть' : 'Свернуть'}
            >
              <CollapseIcon collapsed={collapsed} />
              {!collapsed && <span>Свернуть</span>}
            </button>
          </div>
        </motion.aside>

        {/* Main */}
        <main className="adm-main">
          <AnimatePresence mode="wait">
            {tab === 'settings' ? (
              <motion.div
                key="settings"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25, ease: easeOut }}
              >
                <SettingsTab />
              </motion.div>
            ) : !activeSurvey ? (
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
                 tab === 'design'    ? <DesignTab     surveyId={activeSurvey.id} onSurveyUpdate={s => setActiveSurvey(s)} /> :
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
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1.5"/>
      <rect x="14" y="3" width="7" height="7" rx="1.5"/>
      <rect x="3" y="14" width="7" height="7" rx="1.5"/>
      <rect x="14" y="14" width="7" height="7" rx="1.5"/>
    </svg>
  )
}
function InboxIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 12h-6l-2 3h-4l-2-3H2"/>
      <path d="M5.45 5.11L2 12v6a2 2 0 002 2h16a2 2 0 002-2v-6l-3.45-6.89A2 2 0 0016.76 4H7.24a2 2 0 00-1.79 1.11z"/>
    </svg>
  )
}
function ChartIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10"/>
      <line x1="12" y1="20" x2="12" y2="4"/>
      <line x1="6" y1="20" x2="6" y2="14"/>
    </svg>
  )
}
function EditIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
      <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
    </svg>
  )
}
function LinkIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/>
      <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/>
    </svg>
  )
}
function ExternalIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/>
      <polyline points="15 3 21 3 21 9"/>
      <line x1="10" y1="14" x2="21" y2="3"/>
    </svg>
  )
}
function BrushIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="13.5" cy="6.5" r="3.5"/>
      <path d="M10 10.5c-5 1-7 5.5-7 8.5 0 0 2-1 4-1s4 1 4 1c0-3 2-7 2-7"/>
    </svg>
  )
}
function GearIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
    </svg>
  )
}
function CollapseIcon({ collapsed }: { collapsed: boolean }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transition: 'transform 0.25s', transform: collapsed ? 'rotate(180deg)' : 'none' }}>
      <polyline points="15 18 9 12 15 6"/>
    </svg>
  )
}
