import { NavChevronIcon, SurveyListRowIcon, HomeLandingIcon, MegaphoneIcon, GridIcon, InboxIcon, ChartIcon, EditIcon, BuilderIcon, LinkIcon, ExternalIcon, BrushIcon, GearIcon, LogoutIcon, SwapIcon, ArrowRightIcon, CollapseIcon, SunIcon, MoonIcon, WhereAmISillyGlyph } from '../components/admin/AdminIcons'
import { AdminLandingSectionsModal } from '../components/admin/AdminLandingSectionsModal'
import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence, easeOut, useReducedMotion } from 'framer-motion'
import { ThemeProvider } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import FormControlLabel from '@mui/material/FormControlLabel'
import Switch from '@mui/material/Switch'
import { createAdminMuiTheme } from '../lib/muiTheme'
import { LoginScreen } from '../components/admin/LoginScreen'
import { ResponsesTab } from '../components/admin/ResponsesTab'
import { AnalyticsTab } from '../components/admin/AnalyticsTab'
import { TokensTab } from '../components/admin/TokensTab'
import { QuestionsTab } from '../components/admin/QuestionsTab'
import { DesignTab } from '../components/admin/DesignTab'
import { SurveysListTab } from '../components/admin/SurveysListTab'
import { CanvasBuilderTab } from '../components/admin/CanvasBuilderTab'
import { SettingsTab, loadAdminTheme, applyAdminTheme, toggleAdminUiMode } from '../components/admin/SettingsTab'
import { ProductUpdatesTab } from '../components/admin/ProductUpdatesTab'
import { LeadsTab } from '../components/admin/LeadsTab'
import { AdminDemoLeadsShell } from '../components/admin/AdminDemoLeadsShell'
import { AdminWelcomeModal } from '../components/admin/AdminWelcomeModal'
import { AdminSurveyBootstrapSkeleton } from '../components/admin/AdminSkeletons'
import { getSurveys, getSurveyById, fetchMe, logout } from '../lib/api-client'
import type { Survey, AuthMe } from '../lib/api-client'
import { supabase } from '../lib/supabase'
import { isCanvasSurvey } from '../lib/surveyCanvas'
import { questionsLiveEditHref } from '../lib/liveEditLinks'
import { markAdminAuthenticated, clearAdminAuthenticated } from '../lib/adminSession'
import { API_BASE_URL } from '../lib/apiBaseUrl'
import {
  ADMIN_WELCOME_AUTOSHOW_EVENT,
  ADMIN_WELCOME_AUTOSHOW_KEY,
  getAdminWelcomeAutoshow,
} from '../lib/adminWelcomePref'
import '../styles/admin.css'

type Tab = 'responses' | 'analytics' | 'tokens' | 'questions' | 'design' | 'builder' | 'updates' | 'settings' | 'leads'

const ADMIN_TAB_KEYS: Tab[] = ['responses', 'analytics', 'tokens', 'questions', 'design', 'builder']

type AdminPlatform = 'surveys' | 'demo_leads'

export default function AdminPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [authed, setAuthed] = useState(false)
  const [authMe, setAuthMe] = useState<AuthMe | null>(null)
  const [authError, setAuthError] = useState<string | null>(null)
  const [activeSurvey, setActiveSurvey] = useState<Survey | null>(null)
  const [requestedTab, setTab] = useState<Tab>('responses')
  const [collapsed, setCollapsed] = useState(false)
  const [showLandingChoice, setShowLandingChoice] = useState(false)
  const [surveysListOpen, setSurveysListOpen] = useState(true)
  const [sidebarSurveys, setSidebarSurveys] = useState<Survey[]>([])
  const [resolvingSurveyFromUrl, setResolvingSurveyFromUrl] = useState(false)
  const [builderOpenDesignOnce, setBuilderOpenDesignOnce] = useState(false)
  const [adminWelcomeOpen, setAdminWelcomeOpen] = useState(false)
  const [welcomeAutoshow, setWelcomeAutoshow] = useState(() => getAdminWelcomeAutoshow())
  const [muiMode, setMuiMode] = useState<'light' | 'dark'>(() =>
    loadAdminTheme().uiMode === 'light' ? 'light' : 'dark',
  )
  const [adminPlatform, setAdminPlatform] = useState<AdminPlatform>('surveys')
  const [landingSectionsHelpOpen, setLandingSectionsHelpOpen] = useState(false)
  const reduceMotion = useReducedMotion()
  const sidebarRef = useRef<HTMLElement>(null)
  const muiTheme = useMemo(() => createAdminMuiTheme(muiMode), [muiMode])

  const handleSurveySelect = useCallback((survey: Survey, options?: { openTab?: Tab }) => {
    setSidebarSurveys(previous => previous.some(item => item.id === survey.id)
      ? previous.map(item => item.id === survey.id ? survey : item)
      : [...previous, survey])
    setAdminPlatform('surveys')
    setActiveSurvey(survey)
    if (options?.openTab) setTab(options.openTab)
  }, [])

  const handleSurveyUpdate = useCallback((s: Survey) => {
    setActiveSurvey(s)
    setSidebarSurveys(prev => prev.map(x => (x.id === s.id ? s : x)))
  }, [])

  const canGrantSurveyAccess =
    authMe?.auth === 'password_admin' ||
    (authMe?.auth === 'oauth' && authMe.user.is_global_admin)

  const canUseManualLeads = canGrantSurveyAccess
  const tab = requestedTab === 'leads' && !canUseManualLeads ? 'responses' : requestedTab
  const isDemoLeadsPlatform = canUseManualLeads && tab !== 'updates' &&
    (tab === 'leads' || adminPlatform === 'demo_leads')

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      let session: Awaited<ReturnType<typeof supabase.auth.getSession>>['data']['session'] = null
      try {
        const resp = await supabase.auth.getSession()
        session = resp.data.session
      } catch {
        /* Safari/WebKit may throw on corrupted session storage */
      }
      if (cancelled) return
      if (session?.access_token) {
        const me = await fetchMe()
        if (cancelled) return
        if (me) {
          markAdminAuthenticated()
          setAuthMe(me)
          setAuthed(true)
          setShowLandingChoice(true)
        } else {
          setAuthError(
            import.meta.env.PROD
              ? `OAuth-сессия есть (Supabase), но отдельный API-сервер не отвечает или вернул ошибку. ` +
                `Проверьте: 1) при сборке фронта VITE_API_URL указывает на корень вашего API (https://…, без /api); ` +
                `2) на сервере API в .env заданы SUPABASE_JWT_SECRET (Supabase → Settings → API → JWT Secret) и ADMIN_PASSWORD; ` +
                `3) на API в FRONTEND_URL указан URL этого сайта (CORS).`
              : `OAuth-сессия есть (Supabase), но API-сервер (${API_BASE_URL}) не отвечает или вернул ошибку. ` +
                `Убедитесь: 1) server запущен (npm run dev в папке server); ` +
                `2) в server/.env заданы SUPABASE_JWT_SECRET и ADMIN_PASSWORD; ` +
                `3) VITE_API_URL в survey/.env совпадает с адресом server.`,
          )
        }
        return
      }
      const me = await fetchMe()
      if (cancelled) return
      if (me) {
        markAdminAuthenticated()
        setAuthMe(me)
        setAuthed(true)
        setShowLandingChoice(true)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.access_token) {
        setAuthError(null)
        const me = await fetchMe()
        if (me) {
          markAdminAuthenticated()
          setAuthMe(me)
          setAuthed(true)
          setShowLandingChoice(true)
        } else {
          setAuthError(
            import.meta.env.PROD
              ? `OAuth OK, но отдельный API-сервер недоступен. Проверьте VITE_API_URL при сборке фронта, ` +
                `SUPABASE_JWT_SECRET и ADMIN_PASSWORD на API, FRONTEND_URL на API для CORS.`
              : `OAuth OK, но API-сервер (${API_BASE_URL}) недоступен. ` +
                `Запустите server (npm run dev) и убедитесь, что в server/.env задан SUPABASE_JWT_SECRET.`,
          )
        }
      }
      if (event === 'SIGNED_OUT') {
        clearAdminAuthenticated()
        setAuthMe(null)
        setAuthed(false)
        setShowLandingChoice(false)
        setSidebarSurveys([])
        setActiveSurvey(null)
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!authed) return
    getSurveys().then(setSidebarSurveys).catch(() => {})
  }, [authed])

  useEffect(() => {
    function syncWelcomePref() {
      setWelcomeAutoshow(getAdminWelcomeAutoshow())
    }
    function onStorage(e: StorageEvent) {
      if (e.key === ADMIN_WELCOME_AUTOSHOW_KEY || e.key === null) syncWelcomePref()
    }
    window.addEventListener(ADMIN_WELCOME_AUTOSHOW_EVENT, syncWelcomePref)
    window.addEventListener('storage', onStorage)
    return () => {
      window.removeEventListener(ADMIN_WELCOME_AUTOSHOW_EVENT, syncWelcomePref)
      window.removeEventListener('storage', onStorage)
    }
  }, [])

  useEffect(() => {
    if (!authed) return
    queueMicrotask(() => {
      setAdminWelcomeOpen(welcomeAutoshow)
    })
  }, [authed, welcomeAutoshow])

  const handleAdminWelcomeClose = useCallback(() => {
    setAdminWelcomeOpen(false)
  }, [])

  const tabMotionTransition = reduceMotion
    ? { duration: 0 }
    : { duration: 0.25, ease: easeOut }

  useEffect(() => {
    applyAdminTheme(loadAdminTheme())
  }, [authed, muiMode])

  useEffect(() => {
    function clearResolving() {
      queueMicrotask(() => setResolvingSurveyFromUrl(false))
    }
    function startResolving() {
      queueMicrotask(() => setResolvingSurveyFromUrl(true))
    }
    if (!authed) {
      clearResolving()
      return
    }
    const sid = searchParams.get('survey')
    if (!sid) {
      clearResolving()
      return
    }
    const id = Number(sid)
    if (!Number.isFinite(id) || id < 1) {
      clearResolving()
      return
    }
    const rawTab = searchParams.get('tab')
    let nextTab: Tab =
      rawTab && ADMIN_TAB_KEYS.includes(rawTab as Tab) ? (rawTab as Tab) : 'questions'
    let cancelled = false
    startResolving()
    getSurveyById(id)
      .then(s => {
        if (cancelled) return
        if (!s) {
          setSearchParams(prev => {
            const p = new URLSearchParams(prev)
            p.delete('survey')
            p.delete('tab')
            return p
          }, { replace: true })
          return
        }
        let openBuilderDesign = false
        if (nextTab === 'design' && isCanvasSurvey(s.config)) {
          nextTab = 'builder'
          openBuilderDesign = true
        }
        if (nextTab === 'builder' && !isCanvasSurvey(s.config)) nextTab = 'questions'
        setAdminPlatform('surveys')
        setActiveSurvey(s)
        setTab(nextTab)
        if (openBuilderDesign) setBuilderOpenDesignOnce(true)
        setSearchParams(prev => {
          const p = new URLSearchParams(prev)
          p.delete('survey')
          p.delete('tab')
          return p
        }, { replace: true })
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) clearResolving()
      })
    return () => {
      cancelled = true
      clearResolving()
    }
  }, [authed, searchParams, setSearchParams])

  useEffect(() => {
    function syncMuiFromStorage() {
      setMuiMode(loadAdminTheme().uiMode === 'light' ? 'light' : 'dark')
    }
    window.addEventListener('askly-admin-mui', syncMuiFromStorage)
    return () => window.removeEventListener('askly-admin-mui', syncMuiFromStorage)
  }, [])

  useEffect(() => {
    const root = document.documentElement
    if (!authed) {
      root.style.removeProperty('--adm-sidebar-width')
      return
    }
    root.style.setProperty('--adm-sidebar-width', collapsed ? '64px' : '220px')
    return () => {
      root.style.removeProperty('--adm-sidebar-width')
    }
  }, [collapsed, authed])

  useEffect(() => {
    if (reduceMotion) return
    const el = sidebarRef.current
    if (!el) return
    const onTransitionStart = (ev: TransitionEvent) => {
      if (ev.target !== el || ev.propertyName !== 'width') return
      el.classList.add('adm-sidebar--animating')
    }
    const onTransitionEnd = (ev: TransitionEvent) => {
      if (ev.target !== el || ev.propertyName !== 'width') return
      el.classList.remove('adm-sidebar--animating')
    }
    el.addEventListener('transitionstart', onTransitionStart as EventListener)
    el.addEventListener('transitionend', onTransitionEnd as EventListener)
    return () => {
      el.removeEventListener('transitionstart', onTransitionStart as EventListener)
      el.removeEventListener('transitionend', onTransitionEnd as EventListener)
    }
  }, [reduceMotion])

  if (activeSurvey) {
    const canvas = isCanvasSurvey(activeSurvey.config)
    if (tab === 'design' && canvas) {
      setTab('builder')
      setBuilderOpenDesignOnce(true)
    } else if (tab === 'builder' && !canvas) {
      setTab('questions')
    }
  }

  if (authed && showLandingChoice) return (
    <ThemeProvider theme={muiTheme}>
      <CssBaseline />
      <div className="adm-landing-choice-root">
        <div className="adm-bg-scene">
          <div className="adm-orb adm-orb--1" />
          <div className="adm-orb adm-orb--2" />
          <div className="adm-grid" />
        </div>
        <button
          type="button"
          className="adm-landing-whereami"
          onClick={() => setLandingSectionsHelpOpen(true)}
          aria-haspopup="dialog"
          aria-expanded={landingSectionsHelpOpen}
          aria-controls="adm-lc-sections-dialog"
          title="Подсказка: что за разделы"
        >
          <span className="adm-landing-whereami-mascot" aria-hidden>
            <WhereAmISillyGlyph />
          </span>
          <span className="adm-landing-whereami-label">ГДЕ Я</span>
        </button>
        <div className="adm-landing-choice-wrap">
          <div className="adm-landing-choice-brand">
            <div className="adm-brand-mark">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
            </div>
            <div className="adm-brand-text">
              <span className="adm-brand-name">Askly</span>
              <span className="adm-brand-sub">Admin</span>
            </div>
          </div>
          <div className="adm-landing-choice-header">
            <p className="adm-landing-choice-kicker">[ РАБОЧЕЕ ПРОСТРАНСТВО ]</p>
            <h1 className="adm-landing-choice-title">Куда перейти?</h1>
            <p className="adm-landing-choice-sub">Два независимых раздела — переключиться можно в любой момент</p>
          </div>
          <AdminLandingSectionsModal open={landingSectionsHelpOpen} onClose={() => setLandingSectionsHelpOpen(false)} />
          <div className="adm-landing-choice-cards">
            <button
              type="button"
              className="adm-landing-choice-card"
              onClick={() => {
                setAdminPlatform('surveys')
                setShowLandingChoice(false)
              }}
            >
              <div className="adm-lc-corner adm-lc-corner--tl" />
              <div className="adm-lc-corner adm-lc-corner--tr" />
              <div className="adm-lc-corner adm-lc-corner--bl" />
              <div className="adm-lc-corner adm-lc-corner--br" />
              <div className="adm-lc-glow" />
              <div className="adm-landing-choice-card-inner">
                <div className="adm-landing-choice-card-top">
                  <div className="adm-landing-choice-card-icon">
                    <GridIcon />
                  </div>
                  <div className="adm-landing-choice-card-arrow"><ArrowRightIcon /></div>
                </div>
                <div className="adm-landing-choice-card-body">
                  <span className="adm-landing-choice-card-title">Опросник</span>
                  <span className="adm-landing-choice-card-desc">Опросы, вопросы, дизайн, аналитика и токены доступа</span>
                </div>
              </div>
            </button>
            <button
              type="button"
              className="adm-landing-choice-card"
              onClick={() => {
                setAdminPlatform('demo_leads')
                setTab('leads')
                setShowLandingChoice(false)
              }}
            >
              <div className="adm-lc-corner adm-lc-corner--tl" />
              <div className="adm-lc-corner adm-lc-corner--tr" />
              <div className="adm-lc-corner adm-lc-corner--bl" />
              <div className="adm-lc-corner adm-lc-corner--br" />
              <div className="adm-lc-glow" />
              <div className="adm-landing-choice-card-inner">
                <div className="adm-landing-choice-card-top">
                  <div className="adm-landing-choice-card-icon">
                    <InboxIcon />
                  </div>
                  <div className="adm-landing-choice-card-arrow"><ArrowRightIcon /></div>
                </div>
                <div className="adm-landing-choice-card-body">
                  <span className="adm-landing-choice-card-title">Заявки</span>
                  <span className="adm-landing-choice-card-desc">Входящие лиды, демо-заявки и ручной ввод контактов</span>
                </div>
              </div>
            </button>
          </div>
        </div>
      </div>
    </ThemeProvider>
  )

  if (!authed) return (
    <ThemeProvider theme={muiTheme}>
      <CssBaseline />
      <LoginScreen
        externalError={authError}
        onAuth={async () => {
          setAuthError(null)
          const me = await fetchMe()
          setAuthMe(me)
          setAuthed(true)
          setShowLandingChoice(true)
        }}
      />
    </ThemeProvider>
  )

  return (
    <ThemeProvider theme={muiTheme}>
    <CssBaseline />
    <div className="adm-root" data-adm-platform={isDemoLeadsPlatform ? 'demo-leads' : 'surveys'}>
      <AdminWelcomeModal open={adminWelcomeOpen} onClose={handleAdminWelcomeClose} />
      <div className="adm-bg-scene">
        <div className="adm-orb adm-orb--1" />
        <div className="adm-orb adm-orb--2" />
        <div className="adm-grid" />
      </div>

      <div className="adm-layout">
        {/* Sidebar */}
        <aside
          ref={sidebarRef}
          className={`adm-sidebar ${collapsed ? 'adm-sidebar--collapsed' : ''}`}
        >
          {/* ── Шапка сайдбара ── */}
          <div className="adm-sidebar-top">
            <div className="adm-sidebar-brand">
              <div className="adm-brand-mark">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                </svg>
              </div>
              <div className="adm-brand-text">
                <span className="adm-brand-name">Askly</span>
                <span className="adm-brand-sub">{isDemoLeadsPlatform ? 'Заявки' : 'Опросник'}</span>
              </div>
            </div>
          </div>

          {/* ── Переключатель пространства ── */}
          <button
            type="button"
            className="adm-workspace-pill"
            onClick={() => setShowLandingChoice(true)}
            title="Сменить рабочее пространство"
          >
            <div className="adm-workspace-pill-icon">
              {isDemoLeadsPlatform ? <InboxIcon /> : <GridIcon />}
            </div>
            <span className="adm-workspace-pill-label">
              {isDemoLeadsPlatform ? 'Заявки' : 'Опросник'}
            </span>
            <SwapIcon />
          </button>

          {/* ── Навигация: зависит от пространства ── */}
          <nav className="adm-nav">
            <div className="adm-nav-group">

              {/* ОПРОСНИК */}
              {!isDemoLeadsPlatform && (<>
                <div className={`adm-nav-group-head ${collapsed ? 'adm-nav-group-head--collapsed' : ''} ${!collapsed && sidebarSurveys.length > 0 ? 'adm-nav-group-head--has-chevron' : ''} ${!collapsed ? 'adm-nav-bundled' : ''}`}>
                  {sidebarSurveys.length > 0 && (
                    <button
                      type="button"
                      className="adm-nav-chevron"
                      onClick={() => setSurveysListOpen(o => !o)}
                      aria-expanded={surveysListOpen}
                      title={surveysListOpen ? 'Скрыть список' : 'Показать список'}
                    >
                      <NavChevronIcon open={surveysListOpen} />
                    </button>
                  )}
                  <button
                    className={`adm-nav-item adm-nav-group-trigger ${!activeSurvey && tab !== 'settings' && tab !== 'updates' ? 'adm-nav-item--active' : ''}`}
                    onClick={() => { setActiveSurvey(null); setTab('responses') }}
                    title="Все опросники"
                  >
                    <GridIcon />
                    <span className="adm-nav-label">Опросники</span>
                  </button>
                </div>

                {!collapsed && surveysListOpen && sidebarSurveys.length > 0 && (
                  <div className="adm-nav-surveys-nest">
                    <div className="adm-nav-surveys-scroll" role="list">
                      {sidebarSurveys.map(s => {
                        const label = s.title.length > 28 ? `${s.title.slice(0, 28)}…` : s.title
                        return (
                          <button
                            key={s.id}
                            type="button"
                            role="listitem"
                            className={`adm-nav-survey-pick ${activeSurvey?.id === s.id ? 'adm-nav-survey-pick--current' : ''}`}
                            onClick={() => handleSurveySelect(s)}
                            title={s.title}
                          >
                            <span className="adm-nav-survey-pick-icon" aria-hidden><SurveyListRowIcon /></span>
                            <span className="adm-nav-survey-pick-label">{label}</span>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}

                {activeSurvey && (<>
                  <div className="adm-nav-divider adm-nav-divider--nested">
                    <span className="adm-nav-divider-label" title={activeSurvey.title}>
                      {activeSurvey.title.length > 18 ? activeSurvey.title.slice(0, 18) + '…' : activeSurvey.title}
                    </span>
                  </div>
                  <div className="adm-nav-divider-dot" aria-hidden />
                  <button className={`adm-nav-item ${tab === 'responses' ? 'adm-nav-item--active' : ''}`} onClick={() => setTab('responses')} title="Заявки">
                    <InboxIcon /><span className="adm-nav-label">Заявки</span>
                  </button>
                  <button className={`adm-nav-item ${tab === 'analytics' ? 'adm-nav-item--active' : ''}`} onClick={() => setTab('analytics')} title="Аналитика">
                    <ChartIcon /><span className="adm-nav-label">Аналитика</span>
                  </button>
                  <button className={`adm-nav-item ${tab === 'tokens' ? 'adm-nav-item--active' : ''}`} onClick={() => setTab('tokens')} title="Токены">
                    <LinkIcon /><span className="adm-nav-label">Токены</span>
                  </button>
                  <button className={`adm-nav-item ${tab === 'questions' ? 'adm-nav-item--active' : ''}`} onClick={() => setTab('questions')} title="Вопросы">
                    <EditIcon /><span className="adm-nav-label">Вопросы</span>
                  </button>
                  {isCanvasSurvey(activeSurvey.config) && (
                    <button className={`adm-nav-item ${tab === 'builder' ? 'adm-nav-item--active' : ''}`} onClick={() => setTab('builder')} title="Конструктор">
                      <BuilderIcon /><span className="adm-nav-label">Конструктор</span>
                    </button>
                  )}
                  {!isCanvasSurvey(activeSurvey.config) && (
                    <button className={`adm-nav-item ${tab === 'design' ? 'adm-nav-item--active' : ''}`} onClick={() => setTab('design')} title="Дизайн">
                      <BrushIcon /><span className="adm-nav-label">Дизайн</span>
                    </button>
                  )}
                </>)}
              </>)}

              {/* ЗАЯВКИ */}
              {isDemoLeadsPlatform && (<>
                <button
                  type="button"
                  className={`adm-nav-item ${tab === 'leads' ? 'adm-nav-item--active' : ''}`}
                  onClick={() => setTab('leads')}
                  title="Входящие лиды"
                >
                  <InboxIcon /><span className="adm-nav-label">Входящие</span>
                </button>
              </>)}

            </div>
          </nav>

          {/* ── Нижняя часть сайдбара ── */}
          <div className="adm-sidebar-bottom">
            {!isDemoLeadsPlatform && (
              <Link to="/" className="adm-nav-item" title="Главная страница сайта">
                <HomeLandingIcon /><span className="adm-nav-label">На лендинг</span>
              </Link>
            )}
            {!isDemoLeadsPlatform && (
              <button
                type="button"
                className={`adm-nav-item ${tab === 'updates' ? 'adm-nav-item--active' : ''}`}
                onClick={() => { setActiveSurvey(null); setTab('updates') }}
                title="Обновления продукта"
              >
                <MegaphoneIcon /><span className="adm-nav-label">Обновления</span>
              </button>
            )}
            <button
              type="button"
              className={`adm-nav-item ${tab === 'settings' ? 'adm-nav-item--active' : ''}`}
              onClick={() => { setActiveSurvey(null); setTab('settings') }}
              title="Настройки"
            >
              <GearIcon /><span className="adm-nav-label">Настройки</span>
            </button>

            <FormControlLabel
              className={`adm-theme-form-label ${collapsed ? 'adm-theme-form-label--collapsed' : ''}`}
              labelPlacement="start"
              title={muiMode === 'dark' ? 'Тёмная тема' : 'Светлая тема'}
              control={
                <Switch
                  checked={muiMode === 'dark'}
                  onChange={(_, checked) => {
                    if (checked !== (muiMode === 'dark')) toggleAdminUiMode()
                  }}
                  size="small"
                  color="primary"
                  slotProps={{ input: { role: 'switch', 'aria-label': 'Тёмная тема оформления админки' } }}
                />
              }
              label={
                <span className="adm-theme-switch-caption">
                  {muiMode === 'dark' ? <MoonIcon /> : <SunIcon />}
                  <span>{muiMode === 'dark' ? 'Тёмная тема' : 'Светлая тема'}</span>
                </span>
              }
            />

            {activeSurvey && !isDemoLeadsPlatform && (
              <a
                className="adm-survey-link"
                href={questionsLiveEditHref(activeSurvey.slug)}
                target="_blank"
                rel="noopener"
                title="Правка на живой странице"
              >
                <ExternalIcon /><span className="adm-nav-label">Правка на сайте</span>
              </a>
            )}

            <button
              type="button"
              className="adm-nav-item"
              onClick={() => {
                void logout().then(() => {
                  setAuthed(false)
                  setAuthMe(null)
                  setShowLandingChoice(false)
                  setSidebarSurveys([])
                  setActiveSurvey(null)
                })
              }}
              title="Выйти из аккаунта"
            >
              <LogoutIcon /><span className="adm-nav-label">Выйти</span>
            </button>

            <button
              className="adm-collapse-btn"
              onClick={() => setCollapsed(c => !c)}
              title={collapsed ? 'Развернуть' : 'Свернуть'}
            >
              <CollapseIcon collapsed={collapsed} />
              <span className="adm-collapse-label">Свернуть</span>
            </button>
          </div>
        </aside>

        {/* Main */}
        <main className={`adm-main ${isDemoLeadsPlatform ? 'adm-main--demo-leads' : ''}`}>
          <AnimatePresence mode="wait">
            {tab === 'settings' ? (
              <motion.div
                key="settings"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={tabMotionTransition}
              >
                <SettingsTab />
              </motion.div>
            ) : tab === 'updates' ? (
              <motion.div
                key="updates"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={tabMotionTransition}
              >
                <ProductUpdatesTab />
              </motion.div>
            ) : tab === 'leads' && canUseManualLeads ? (
              <motion.div
                key="leads"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={tabMotionTransition}
              >
                <AdminDemoLeadsShell>
                  <LeadsTab />
                </AdminDemoLeadsShell>
              </motion.div>
            ) : resolvingSurveyFromUrl ? (
              <motion.div
                key="survey-url-resolve"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={tabMotionTransition}
              >
                <AdminSurveyBootstrapSkeleton />
              </motion.div>
            ) : !activeSurvey ? (
              <motion.div
                key="surveys-list"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={tabMotionTransition}
              >
                <SurveysListTab onSelect={handleSurveySelect} canGrantAccess={canGrantSurveyAccess} onListChange={setSidebarSurveys} />
              </motion.div>
            ) : (
              <motion.div
                key={`${activeSurvey.id}-${tab}`}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={tabMotionTransition}
              >
                               {tab === 'responses'  ? <ResponsesTab  surveyId={activeSurvey.id} survey={activeSurvey} /> :
                 tab === 'analytics' ? <AnalyticsTab surveyId={activeSurvey.id} survey={activeSurvey} /> :
                 tab === 'tokens'    ? <TokensTab     surveyId={activeSurvey.id} surveySlug={activeSurvey.slug} /> :
                 tab === 'design'    ? <DesignTab     surveyId={activeSurvey.id} onSurveyUpdate={handleSurveyUpdate} /> :
                 tab === 'builder'   ? (
                   <CanvasBuilderTab
                     surveyId={activeSurvey.id}
                     onSurveyUpdate={handleSurveyUpdate}
                     openDesignPanelOnMount={builderOpenDesignOnce}
                     onConsumedDesignPanelMount={() => setBuilderOpenDesignOnce(false)}
                   />
                 ) :
                 <QuestionsTab surveyId={activeSurvey.id} surveySlug={activeSurvey.slug} onSurveyUpdate={handleSurveyUpdate} />}
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
