/* eslint-disable react-refresh/only-export-components */
import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { SavedIcon } from './AdminFormParts'
import { setGlobalTheme, getGlobalTheme } from '../../lib/api-client'
import {
  ADMIN_WELCOME_AUTOSHOW_EVENT,
  ADMIN_WELCOME_AUTOSHOW_KEY,
  getAdminWelcomeAutoshow,
  setAdminWelcomeAutoshow,
} from '../../lib/adminWelcomePref'

/* ── Storage keys ── */
const SETTINGS_KEY = 'askly_app_settings_v1'
const THEME_KEY    = 'askly_admin_theme_v1'

export interface AppSettings {
  tg_enabled: boolean
  tg_bot_token: string
  tg_chat_id: string
}

const SETTINGS_DEFAULTS: AppSettings = {
  tg_enabled: false,
  tg_bot_token: '',
  tg_chat_id: '',
}

export function loadAppSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    if (raw) {
      const p = JSON.parse(raw) as Record<string, unknown>
      return {
        ...SETTINGS_DEFAULTS,
        tg_enabled: Boolean(p.tg_enabled),
        tg_bot_token: typeof p.tg_bot_token === 'string' ? p.tg_bot_token : '',
        tg_chat_id: typeof p.tg_chat_id === 'string' ? p.tg_chat_id : '',
      }
    }
  } catch { /* ignore */ }
  return { ...SETTINGS_DEFAULTS }
}
export function saveAppSettings(s: AppSettings): void {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(s))
}

/* ── Admin theme ── */
export type AdminUiMode = 'dark' | 'light'
export type AdminFxMode = 'full' | 'lite'

export interface AdminTheme {
  accent:   string
  accent2:  string
  bg:       string
  orb1:     string
  orb2:     string
}

export type AdminThemeStored = AdminTheme & { preset?: string; uiMode?: AdminUiMode; fxMode?: AdminFxMode }

export interface AdminThemePreset {
  id:    string
  name:  string
  theme: AdminTheme
}

export const THEME_PRESETS: AdminThemePreset[] = [
  { id: 'indigo',   name: 'Indigo',   theme: { accent: '#5b73f9', accent2: '#9b6dff', bg: '#07070d', orb1: '#5b73f9', orb2: '#9b6dff' } },
  { id: 'aurora',   name: 'Aurora',   theme: { accent: '#00c9a7', accent2: '#00a8e8', bg: '#05080d', orb1: '#00c9a7', orb2: '#0070c0' } },
  { id: 'sunset',   name: 'Sunset',   theme: { accent: '#f97316', accent2: '#ef4444', bg: '#0d0705', orb1: '#f97316', orb2: '#dc2626' } },
  { id: 'rose',     name: 'Rose',     theme: { accent: '#ec4899', accent2: '#f43f5e', bg: '#0d0508', orb1: '#ec4899', orb2: '#e11d48' } },
  { id: 'emerald',  name: 'Emerald',  theme: { accent: '#10b981', accent2: '#34d399', bg: '#040d09', orb1: '#059669', orb2: '#34d399' } },
  { id: 'gold',     name: 'Gold',     theme: { accent: '#f59e0b', accent2: '#fbbf24', bg: '#0d0a03', orb1: '#d97706', orb2: '#fbbf24' } },
  { id: 'crimson',  name: 'Crimson',  theme: { accent: '#e11d48', accent2: '#fb7185', bg: '#0d0305', orb1: '#be123c', orb2: '#f43f5e' } },
  { id: 'cyber',    name: 'Cyber',    theme: { accent: '#06b6d4', accent2: '#3b82f6', bg: '#020d0f', orb1: '#0891b2', orb2: '#2563eb' } },
  { id: 'violet',   name: 'Violet',   theme: { accent: '#7c3aed', accent2: '#c026d3', bg: '#07030d', orb1: '#6d28d9', orb2: '#a21caf' } },
  { id: 'mint',     name: 'Mint',     theme: { accent: '#2dd4bf', accent2: '#4ade80', bg: '#03100e', orb1: '#14b8a6', orb2: '#22c55e' } },
]

const THEME_DEFAULT = THEME_PRESETS[0].theme

export function loadAdminTheme(): AdminThemeStored {
  try {
    const raw = localStorage.getItem(THEME_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<AdminThemeStored>
      return {
        ...THEME_DEFAULT,
        preset: 'indigo',
        uiMode: 'dark',
        fxMode: 'full',
        ...parsed,
      }
    }
  } catch { /* ignore */ }
  return { ...THEME_DEFAULT, preset: 'indigo', uiMode: 'dark', fxMode: 'full' }
}

export function saveAdminTheme(t: AdminThemeStored): void {
  localStorage.setItem(THEME_KEY, JSON.stringify(t))
}

function hexToRgb(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `${r},${g},${b}`
}

function isHexColor(s: string): boolean {
  return /^#[0-9A-Fa-f]{6}$/.test(s)
}

export function resolveStoredBg(t: AdminThemeStored, mode: AdminUiMode): string {
  if (mode === 'light') {
    const accent = isHexColor(t.accent) ? t.accent : THEME_DEFAULT.accent
    return `color-mix(in srgb, #f8f9fa 96%, ${accent} 4%)`
  }
  return isHexColor(t.bg) ? t.bg : THEME_DEFAULT.bg
}

export function applyAdminTheme(t: AdminThemeStored): void {
  const mode: AdminUiMode = t.uiMode === 'light' ? 'light' : 'dark'
  const fxMode: AdminFxMode = t.fxMode === 'lite' ? 'lite' : 'full'
  document.documentElement.setAttribute('data-adm-mode', mode)
  document.documentElement.setAttribute('data-adm-fx', fxMode)
  document.documentElement.style.colorScheme = mode === 'light' ? 'light' : 'dark'

  const bg = resolveStoredBg(t, mode)

  const targets = document.querySelectorAll<HTMLElement>('.adm-root, .adm-center')
  const vars: Record<string, string> = {
    '--accent':     isHexColor(t.accent) ? t.accent : THEME_DEFAULT.accent,
    '--accent-2':   isHexColor(t.accent2) ? t.accent2 : THEME_DEFAULT.accent2,
    '--bg':         bg,
  }
  try { vars['--accent-rgb'] = hexToRgb(vars['--accent']) } catch { /* ignore */ }
  try { vars['--accent-2-rgb'] = hexToRgb(vars['--accent-2']) } catch { /* ignore */ }

  targets.forEach(el => {
    el.setAttribute('data-adm-mode', mode)
    el.setAttribute('data-adm-fx', fxMode)
    Object.entries(vars).forEach(([k, v]) => el.style.setProperty(k, v))
    el.style.removeProperty('background')
  })

  Object.entries(vars).forEach(([k, v]) => document.documentElement.style.setProperty(k, v))
}

export function toggleAdminUiMode(): void {
  const t = loadAdminTheme()
  const next: AdminThemeStored = {
    ...t,
    uiMode: t.uiMode === 'light' ? 'dark' : 'light',
  }
  saveAdminTheme(next)
  applyAdminTheme(next)
  window.dispatchEvent(new CustomEvent('askly-admin-mui'))
}

/* ── Main component ── */
export function SettingsTab() {
  const [settings, setSettings] = useState<AppSettings>(loadAppSettings)
  const [theme, setThemeState]  = useState<AdminThemeStored>(loadAdminTheme)
  const [welcomeAutoshowEnabled, setWelcomeAutoshowEnabled] = useState(() => getAdminWelcomeAutoshow())
  const [tgSaved, setTgSaved]         = useState(false)
  const [tgTesting, setTgTesting]     = useState(false)
  const [tgTestResult, setTgTestResult] = useState<{ ok: boolean; msg: string } | null>(null)
  const [tokenVisible, setTokenVisible] = useState(false)
  const [publishing, setPublishing]   = useState(false)
  const [published, setPublished]     = useState(false)
  const [publishErr, setPublishErr]   = useState<string | null>(null)

  /* Apply theme on mount and whenever it changes */
  useEffect(() => { applyAdminTheme(theme) }, [theme])

  useEffect(() => {
    function syncWelcomePref() {
      setWelcomeAutoshowEnabled(getAdminWelcomeAutoshow())
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

  /* Сайдбар меняет тему через localStorage + applyAdminTheme без обновления этого state */
  useEffect(() => {
    function syncThemeFromStorage() {
      setThemeState(loadAdminTheme())
    }
    window.addEventListener('askly-admin-mui', syncThemeFromStorage)
    return () => window.removeEventListener('askly-admin-mui', syncThemeFromStorage)
  }, [])

  /* Load global theme from Supabase on mount (to show if it's in sync) */
  useEffect(() => {
    getGlobalTheme().then(remote => {
      if (remote) {
        // If local matches remote preset, mark as published
        if (remote.preset === theme.preset && remote.accent === theme.accent) setPublished(true)
      }
    }).catch(() => {})
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function set<K extends keyof AppSettings>(key: K, value: AppSettings[K]) {
    setSettings(s => ({ ...s, [key]: value }))
  }

  function setTheme(t: AdminThemeStored) {
    setThemeState(t)
    saveAdminTheme(t)
    window.dispatchEvent(new CustomEvent('askly-admin-mui'))
  }

  function applyPreset(preset: AdminThemePreset) {
    setTheme({
      ...preset.theme,
      preset: preset.id,
      uiMode: theme.uiMode ?? 'dark',
    })
    setPublished(false)
  }

  function setThemeColor(key: keyof AdminTheme, val: string) {
    setTheme({ ...theme, preset: 'custom', [key]: val })
    setPublished(false)
  }

  function setUiMode(mode: AdminUiMode) {
    if (theme.uiMode === mode) return
    setTheme({ ...theme, uiMode: mode })
    setPublished(false)
  }

  function setFxMode(mode: AdminFxMode) {
    if (theme.fxMode === mode) return
    setTheme({ ...theme, fxMode: mode })
    setPublished(false)
  }

  async function publishTheme() {
    setPublishing(true)
    setPublishErr(null)
    try {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { uiMode: _omitUi, fxMode: _omitFx, ...forRemote } = theme
      await setGlobalTheme(forRemote)
      setPublished(true)
      setTimeout(() => setPublished(false), 3000)
    } catch (e: unknown) {
      setPublishErr(e instanceof Error ? e.message : 'Ошибка сохранения')
    } finally {
      setPublishing(false)
    }
  }

  /* Save Telegram section */
  function saveTelegram() {
    saveAppSettings(settings)
    setTgSaved(true)
    setTimeout(() => setTgSaved(false), 2000)
  }

  /* Test Telegram */
  async function testTelegram() {
    if (!settings.tg_bot_token || !settings.tg_chat_id) return
    setTgTesting(true)
    setTgTestResult(null)
    try {
      const url = `https://api.telegram.org/bot${settings.tg_bot_token}/sendMessage`
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: settings.tg_chat_id, text: '✅ Askly: тестовое уведомление. Интеграция работает.' }),
      })
      const json = await res.json()
      if (json.ok) setTgTestResult({ ok: true,  msg: 'Сообщение отправлено' })
      else         setTgTestResult({ ok: false, msg: json.description ?? 'Ошибка Telegram API' })
    } catch {
      setTgTestResult({ ok: false, msg: 'Сетевая ошибка' })
    } finally {
      setTgTesting(false)
    }
  }

  return (
    <div className="set-root">
      {/* Page header */}
      <div className="set-page-header">
        <div className="set-page-header-icon"><GearIcon /></div>
        <div>
          <h2 className="set-page-title">Настройки</h2>
          <p className="set-page-sub">Тема админки и интеграции</p>
        </div>
      </div>

      {/* ══ Theme customizer ══ */}
      <section className="set-theme-section">
        <div className="set-section-label"><BrushIcon />Тема администратора</div>
        <div className="set-section-desc">Изменения применяются мгновенно и сохраняются в браузере.</div>

        <div className="set-ui-mode-groups">
          <div className="set-ui-mode-row" role="group" aria-label="Светлое или тёмное оформление">
            <button
              type="button"
              className={`set-ui-mode-btn ${theme.uiMode !== 'light' ? 'set-ui-mode-btn--active' : ''}`}
              onClick={() => setUiMode('dark')}
            >
              Тёмная
            </button>
            <button
              type="button"
              className={`set-ui-mode-btn ${theme.uiMode === 'light' ? 'set-ui-mode-btn--active' : ''}`}
              onClick={() => setUiMode('light')}
            >
              Светлая
            </button>
          </div>

          <div className="set-ui-mode-row" role="group" aria-label="Режим производительности интерфейса">
            <button
              type="button"
              className={`set-ui-mode-btn ${theme.fxMode !== 'lite' ? 'set-ui-mode-btn--active' : ''}`}
              onClick={() => setFxMode('full')}
            >
              Полные эффекты
            </button>
            <button
              type="button"
              className={`set-ui-mode-btn ${theme.fxMode === 'lite' ? 'set-ui-mode-btn--active' : ''}`}
              onClick={() => setFxMode('lite')}
            >
              Лёгкий режим
            </button>
          </div>
        </div>

        {/* Presets */}
        <div className="set-presets-grid">
          {THEME_PRESETS.map(p => (
            <button
              key={p.id}
              className={`set-preset-card ${theme.preset === p.id ? 'set-preset-card--active' : ''}`}
              onClick={() => applyPreset(p)}
              title={p.name}
            >
              <span
                className="set-preset-swatch"
                style={{ background: `linear-gradient(135deg, ${p.theme.accent} 0%, ${p.theme.accent2} 100%)` }}
              />
              <span className="set-preset-name">{p.name}</span>
              {theme.preset === p.id && (
                <span className="set-preset-check"><CheckIcon /></span>
              )}
            </button>
          ))}
        </div>

        {/* Manual color pickers */}
        <div className="set-colors-row">
          <ColorField
            label="Акцент"
            value={theme.accent}
            onChange={v => setThemeColor('accent', v)}
          />
          <ColorField
            label="Акцент 2"
            value={theme.accent2}
            onChange={v => setThemeColor('accent2', v)}
          />
          <ColorField
            label="Фон"
            value={theme.bg}
            onChange={v => setThemeColor('bg', v)}
          />
          <ColorField
            label="Орб 1"
            value={theme.orb1}
            onChange={v => setThemeColor('orb1', v)}
          />
          <ColorField
            label="Орб 2"
            value={theme.orb2}
            onChange={v => setThemeColor('orb2', v)}
          />
          <button
            className="set-reset-theme-btn"
            onClick={() => applyPreset(THEME_PRESETS[0])}
            title="Сбросить до Indigo"
          >
            <ResetIcon />
            Сброс
          </button>
        </div>

        {/* Publish row */}
        <div className="set-publish-row">
          <div className="set-publish-info">
            <GlobeIcon />
            <span>Тема сохранена локально. Чтобы все пользователи видели её — опубликуйте.</span>
          </div>
          <button
            className={`set-publish-btn ${published ? 'set-publish-btn--done' : ''}`}
            onClick={publishTheme}
            disabled={publishing}
          >
            {publishing
              ? <><span className="adm-spinner" /> Публикация...</>
              : published
                ? <><SavedIcon /> Опубликовано</>
                : <><GlobeIcon /> Применить ко всем</>}
          </button>
          <AnimatePresence>
            {publishErr && (
              <motion.span
                className="set-publish-err"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              >
                {publishErr}
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        {/* Live preview strip — фон как у реальной админки (в светлой теме не тянем тёмный preset.bg) */}
        <div
          className={`set-theme-preview${theme.uiMode === 'light' ? ' set-theme-preview--lightui' : ''}`}
          style={{ background: resolveStoredBg(theme, theme.uiMode === 'light' ? 'light' : 'dark') }}
        >
          <div
            className="set-theme-preview-orb set-theme-preview-orb--1"
            style={{ background: `radial-gradient(circle, ${theme.orb1} 0%, transparent 70%)` }}
          />
          <div
            className="set-theme-preview-orb set-theme-preview-orb--2"
            style={{ background: `radial-gradient(circle, ${theme.orb2} 0%, transparent 70%)` }}
          />
          <div className="set-theme-preview-content">
            <div className="set-theme-preview-nav">
              {['Опросники', 'Заявки', 'Аналитика'].map((label, i) => (
                <div
                  key={label}
                  className={`set-theme-preview-nav-item ${i === 1 ? 'set-theme-preview-nav-item--active' : ''}`}
                  style={i === 1 ? {
                    background: `${theme.accent}26`,
                    borderColor: `${theme.accent}55`,
                    color: theme.uiMode === 'light' ? theme.accent : '#fff',
                    fontWeight: 600,
                  } : {}}
                >
                  {label}
                </div>
              ))}
            </div>
            <div className="set-theme-preview-main">
              <div className="set-theme-preview-card">
                <div className="set-theme-preview-row" />
                <div className="set-theme-preview-row set-theme-preview-row--short" />
              </div>
              <button
                className="set-theme-preview-btn"
                style={{ background: `linear-gradient(135deg, ${theme.accent}, ${theme.accent2})` }}
              >
                Сохранить
              </button>
            </div>
          </div>
          <div className="set-theme-preview-label">Предпросмотр</div>
        </div>
      </section>

      <div className="set-sections-grid">
        <section className="set-section">
          <div className="set-section-label">Экран приветствия</div>
          <div className="set-section-desc">
            Показывать приветствие при входе в админку. Настройка сохраняется в этом браузере и её можно менять в любой момент.
          </div>
          <div className="set-card">
            <div className="set-row set-row--toggle">
              <div>
                <div className="set-row-label">Показывать при входе</div>
                <div className="set-row-hint">Включено — модалка при каждом заходе; выключено — сразу рабочий экран</div>
              </div>
              <button
                type="button"
                className={`set-toggle ${welcomeAutoshowEnabled ? 'set-toggle--on' : ''}`}
                onClick={() => setAdminWelcomeAutoshow(!welcomeAutoshowEnabled)}
                role="switch"
                aria-checked={welcomeAutoshowEnabled}
              >
                <span
                  className="set-toggle-thumb"
                  style={welcomeAutoshowEnabled ? { background: theme.accent } : {}}
                />
              </button>
            </div>
          </div>
        </section>

        {/* ── Telegram ── */}
        <section className="set-section">
          <div className="set-section-label"><TelegramIcon />Telegram-уведомления</div>
          <div className="set-section-desc">Бот присылает сообщение при каждом новом ответе на опрос.</div>

          <div className="set-card">
            <div className="set-row set-row--toggle">
              <div>
                <div className="set-row-label">Включить уведомления</div>
                <div className="set-row-hint">Отправлять сообщение при новом ответе</div>
              </div>
              <button
                className={`set-toggle ${settings.tg_enabled ? 'set-toggle--on' : ''}`}
                onClick={() => set('tg_enabled', !settings.tg_enabled)}
                role="switch"
                aria-checked={settings.tg_enabled}
              >
                <span className="set-toggle-thumb" style={settings.tg_enabled ? { background: theme.accent } : {}} />
              </button>
            </div>

            <div className="set-divider" />

            <div className="set-row set-row--field">
              <label className="set-row-label" htmlFor="tg-token">Bot Token</label>
              <div className="set-input-wrap">
                <input
                  id="tg-token"
                  className="set-input"
                  type={tokenVisible ? 'text' : 'password'}
                  placeholder="123456789:AAH..."
                  value={settings.tg_bot_token}
                  onChange={e => set('tg_bot_token', e.target.value)}
                  autoComplete="off"
                  spellCheck={false}
                />
                <button className="set-input-eye" onClick={() => setTokenVisible(v => !v)} type="button">
                  {tokenVisible ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
            </div>

            <div className="set-row set-row--field">
              <label className="set-row-label" htmlFor="tg-chat">Chat ID</label>
              <input
                id="tg-chat"
                className="set-input"
                type="text"
                placeholder="-100123456789 или @username"
                value={settings.tg_chat_id}
                onChange={e => set('tg_chat_id', e.target.value)}
                autoComplete="off"
                spellCheck={false}
              />
            </div>

            <div className="set-row set-row--actions">
              <button
                className="set-btn-test"
                onClick={testTelegram}
                disabled={tgTesting || !settings.tg_bot_token || !settings.tg_chat_id}
              >
                {tgTesting ? <><span className="adm-spinner" /> Отправка...</> : <><PaperPlaneIcon /> Тест</>}
              </button>
              <button className={`adm-btn-primary adm-btn-save ${tgSaved ? 'adm-btn-saved' : ''}`} onClick={saveTelegram}>
                {tgSaved ? <><SavedIcon /> Сохранено</> : 'Сохранить'}
              </button>
            </div>

            <AnimatePresence>
              {tgTestResult && (
                <motion.div
                  className={`set-test-result ${tgTestResult.ok ? 'set-test-result--ok' : 'set-test-result--err'}`}
                  initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  {tgTestResult.ok ? <OkIcon /> : <ErrIcon />}
                  {tgTestResult.msg}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="set-tip">
            Создайте бота через <a className="set-link" href="https://t.me/BotFather" target="_blank" rel="noopener">@BotFather</a>,
            добавьте его в нужную группу и укажите Chat ID этой группы.
          </div>
        </section>
      </div>
    </div>
  )
}

/* ── ColorField helper ── */
function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const inputRef = useRef<HTMLInputElement>(null)
  return (
    <div className="set-color-field">
      <button
        className="set-color-field-swatch"
        style={{ background: value }}
        onClick={() => inputRef.current?.click()}
        title={label}
      />
      <input
        ref={inputRef}
        type="color"
        value={value}
        onChange={e => onChange(e.target.value)}
        className="set-color-field-hidden"
        tabIndex={-1}
      />
      <span className="set-color-field-label">{label}</span>
    </div>
  )
}

/* ── Icons ── */
function GearIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="2.5" stroke="currentColor" strokeWidth="1.4"/>
      <path d="M8 1.5v1.2M8 13.3v1.2M1.5 8h1.2M13.3 8h1.2M3.4 3.4l.85.85M11.75 11.75l.85.85M3.4 12.6l.85-.85M11.75 4.25l.85-.85"
        stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
    </svg>
  )
}
function BrushIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
      <path d="M3 21c3 0 7-1 7-8V5a2 2 0 00-4 0v8c0 7-4 8-4 8h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M20.5 3.5a2.121 2.121 0 00-3 3L21 10l2.5-2.5-3-4z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
    </svg>
  )
}
function TelegramIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
      <path d="M21.2 4.1L3 11.2c-1.1.4-1.1 1.1-.2 1.4l4.6 1.4 1.8 5.4c.2.6.5.8.9.7l2.5-2.3 4.8 3.5c.9.5 1.5.2 1.7-.8L22.9 5c.3-1.2-.4-1.7-1.7-.9z"
        stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
    </svg>
  )
}
function PaperPlaneIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
      <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/>
    </svg>
  )
}
function EyeIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
      <path d="M1 12C1 12 5 4 12 4s11 8 11 8-4 8-11 8S1 12 1 12z" stroke="currentColor" strokeWidth="1.5"/>
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.5"/>
    </svg>
  )
}
function EyeOffIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
      <path d="M17.9 17.9A10.9 10.9 0 0112 20C5 20 1 12 1 12a18.8 18.8 0 015.1-6.9M9.9 4.2A10.7 10.7 0 0112 4c7 0 11 8 11 8a18.8 18.8 0 01-2.2 3.5M3 3l18 18"
        stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  )
}
function CheckIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
      <path d="M1.5 5.5l2.5 2.5 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}
function OkIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M2 7l3 3 7-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}
function ErrIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  )
}
function ResetIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
      <path d="M3 12a9 9 0 109-9H8M8 7l-4 4 4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}
function GlobeIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M2 12h20M12 2a15.3 15.3 0 010 20M12 2a15.3 15.3 0 000 20" stroke="currentColor" strokeWidth="1.5"/>
    </svg>
  )
}
