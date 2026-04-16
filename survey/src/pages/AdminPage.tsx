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

type Tab = 'responses' | 'analytics' | 'tokens' | 'questions' | 'design' | 'builder' | 'updates' | 'settings'

const ADMIN_TAB_KEYS: Tab[] = ['responses', 'analytics', 'tokens', 'questions', 'design', 'builder']

export default function AdminPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [authed, setAuthed] = useState(false)
  const [authMe, setAuthMe] = useState<AuthMe | null>(null)
  const [authError, setAuthError] = useState<string | null>(null)
  const [activeSurvey, setActiveSurvey] = useState<Survey | null>(null)
  const [tab, setTab] = useState<Tab>('responses')
  const [collapsed, setCollapsed] = useState(false)
  const [surveysListOpen, setSurveysListOpen] = useState(true)
  const [sidebarSurveys, setSidebarSurveys] = useState<Survey[]>([])
  const [resolvingSurveyFromUrl, setResolvingSurveyFromUrl] = useState(false)
  const [builderOpenDesignOnce, setBuilderOpenDesignOnce] = useState(false)
  const [adminWelcomeOpen, setAdminWelcomeOpen] = useState(false)
  const [welcomeAutoshow, setWelcomeAutoshow] = useState(() => getAdminWelcomeAutoshow())
  const [muiMode, setMuiMode] = useState<'light' | 'dark'>(() =>
    loadAdminTheme().uiMode === 'light' ? 'light' : 'dark',
  )
  const reduceMotion = useReducedMotion()
  const sidebarRef = useRef<HTMLElement>(null)
  const muiTheme = useMemo(() => createAdminMuiTheme(muiMode), [muiMode])

  const handleSurveySelect = useCallback((survey: Survey, options?: { openTab?: Tab }) => {
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
    function onTransitionStart(ev: TransitionEvent) {
      if (ev.target !== el || ev.propertyName !== 'width') return
      el.classList.add('adm-sidebar--animating')
    }
    function onTransitionEnd(ev: TransitionEvent) {
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
        }}
      />
    </ThemeProvider>
  )

  return (
    <ThemeProvider theme={muiTheme}>
    <CssBaseline />
    <div className="adm-root">
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
          <div className="adm-sidebar-top">
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
          </div>

          <nav className="adm-nav">
            <div className="adm-nav-group">
              <div
                className={`adm-nav-group-head ${collapsed ? 'adm-nav-group-head--collapsed' : ''} ${!collapsed && sidebarSurveys.length > 0 ? 'adm-nav-group-head--has-chevron' : ''} ${!collapsed ? 'adm-nav-bundled' : ''}`}
              >
                {sidebarSurveys.length > 0 && (
                  <button
                    type="button"
                    className="adm-nav-chevron"
                    onClick={() => setSurveysListOpen(o => !o)}
                    aria-expanded={surveysListOpen}
                    title={surveysListOpen ? 'Скрыть список опросников' : 'Показать список опросников'}
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
                          <span className="adm-nav-survey-pick-icon" aria-hidden>
                            <SurveyListRowIcon />
                          </span>
                          <span className="adm-nav-survey-pick-label">{label}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              {activeSurvey && (
                <>
                  <div className="adm-nav-divider adm-nav-divider--nested">
                    <span className="adm-nav-divider-label" title={activeSurvey.title}>
                      {activeSurvey.title.length > 18 ? activeSurvey.title.slice(0, 18) + '…' : activeSurvey.title}
                    </span>
                  </div>
                  <div className="adm-nav-divider-dot" aria-hidden />
                  <button
                    className={`adm-nav-item ${tab === 'responses' ? 'adm-nav-item--active' : ''}`}
                    onClick={() => setTab('responses')}
                    title="Заявки"
                  >
                    <InboxIcon />
                    <span className="adm-nav-label">Заявки</span>
                  </button>
                  <button
                    className={`adm-nav-item ${tab === 'analytics' ? 'adm-nav-item--active' : ''}`}
                    onClick={() => setTab('analytics')}
                    title="Аналитика"
                  >
                    <ChartIcon />
                    <span className="adm-nav-label">Аналитика</span>
                  </button>
                  <button
                    className={`adm-nav-item ${tab === 'tokens' ? 'adm-nav-item--active' : ''}`}
                    onClick={() => setTab('tokens')}
                    title="Токены"
                  >
                    <LinkIcon />
                    <span className="adm-nav-label">Токены</span>
                  </button>
                  <button
                    className={`adm-nav-item ${tab === 'questions' ? 'adm-nav-item--active' : ''}`}
                    onClick={() => setTab('questions')}
                    title="Вопросы"
                  >
                    <EditIcon />
                    <span className="adm-nav-label">Вопросы</span>
                  </button>
                  {isCanvasSurvey(activeSurvey.config) && (
                    <button
                      className={`adm-nav-item ${tab === 'builder' ? 'adm-nav-item--active' : ''}`}
                      onClick={() => setTab('builder')}
                      title="Конструктор страниц"
                    >
                      <BuilderIcon />
                      <span className="adm-nav-label">Конструктор</span>
                    </button>
                  )}
                  {!isCanvasSurvey(activeSurvey.config) && (
                    <button
                      className={`adm-nav-item ${tab === 'design' ? 'adm-nav-item--active' : ''}`}
                      onClick={() => setTab('design')}
                      title="Дизайн"
                    >
                      <BrushIcon />
                      <span className="adm-nav-label">Дизайн</span>
                    </button>
                  )}
                </>
              )}
            </div>
          </nav>

          <div className="adm-sidebar-bottom">
            <Link
              to="/"
              className="adm-nav-item"
              title="Открыть главную страницу сайта"
            >
              <HomeLandingIcon />
              <span className="adm-nav-label">На лендинг</span>
            </Link>
            <button
              type="button"
              className={`adm-nav-item ${tab === 'updates' ? 'adm-nav-item--active' : ''}`}
              onClick={() => { setActiveSurvey(null); setTab('updates') }}
              title="Обновления продукта"
            >
              <MegaphoneIcon />
              <span className="adm-nav-label">Обновления</span>
            </button>
            <button
              type="button"
              className={`adm-nav-item ${tab === 'settings' ? 'adm-nav-item--active' : ''}`}
              onClick={() => { setActiveSurvey(null); setTab('settings') }}
              title="Настройки"
            >
              <GearIcon />
              <span className="adm-nav-label">Настройки</span>
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
                  slotProps={{
                    input: {
                      role: 'switch',
                      'aria-label': 'Тёмная тема оформления админки',
                    },
                  }}
                />
              }
              label={
                <span className="adm-theme-switch-caption">
                  {muiMode === 'dark' ? <MoonIcon /> : <SunIcon />}
                  <span>{muiMode === 'dark' ? 'Тёмная тема' : 'Светлая тема'}</span>
                </span>
              }
            />

            {activeSurvey && (
              <a
                className="adm-survey-link"
                href={questionsLiveEditHref(activeSurvey.slug)}
                target="_blank"
                rel="noopener"
                title="Правка на живой странице (?edit=1): только тексты вопросов. Полный canvas — только по кнопке из раздела «Конструктор». Служебная ссылка."
              >
                <ExternalIcon />
                <span className="adm-nav-label">Правка на сайте</span>
              </a>
            )}

            <button
              type="button"
              className="adm-nav-item"
              onClick={() => {
                void logout().then(() => {
                  setAuthed(false)
                  setAuthMe(null)
                  setSidebarSurveys([])
                  setActiveSurvey(null)
                })
              }}
              title="Выйти из аккаунта"
            >
              <LogoutIcon />
              <span className="adm-nav-label">Выйти</span>
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
        <main className="adm-main">
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
                <SurveysListTab onSelect={handleSurveySelect} canGrantAccess={canGrantSurveyAccess} />
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
function NavChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="adm-nav-chevron-svg"
      style={{ transform: open ? 'rotate(0deg)' : 'rotate(-90deg)' }}
      aria-hidden
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  )
}

function SurveyListRowIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
      <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
    </svg>
  )
}

function HomeLandingIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1h-5v-7H9v7H4a1 1 0 01-1-1V9.5z" />
    </svg>
  )
}

function MegaphoneIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M3 11v4a2 2 0 002 2h2l6 3V6L7 9H5a2 2 0 00-2 2z" />
      <path d="M16 9.5a4 4 0 010 5" />
    </svg>
  )
}

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
function BuilderIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="3" y="3" width="18" height="7" rx="2" />
      <rect x="3" y="14" width="18" height="7" rx="2" />
      <path d="M8 6.5h4M8 17.5h6" />
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
function LogoutIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  )
}

function CollapseIcon({ collapsed }: { collapsed: boolean }) {
  return (
    <svg
      className={`adm-collapse-icon ${collapsed ? 'adm-collapse-icon--collapsed' : ''}`}
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
           strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={true}
    >
      <polyline points="15 18 9 12 15 6"/>
    </svg>
  )
}

function SunIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
    </svg>
  )
}

function MoonIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
    </svg>
  )
}
