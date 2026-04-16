import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../../lib/supabase'
import { login, fetchMeOrThrow } from '../../lib/api-client'
import { API_BASE_URL, productionApiUrlWarning } from '../../lib/apiBaseUrl'

const ADMIN_ORIGIN = `${window.location.origin}/admin`

function isNetworkFetchFailure(msg: string): boolean {
  const m = msg.toLowerCase()
  return (
    m.includes('failed to fetch') ||
    m.includes('networkerror') ||
    m.includes('load failed') ||
    m.includes('network request failed') ||
    m.includes('the internet connection appears to be offline') ||
    m.includes('connection was lost') ||
    m.includes('did not match the expected pattern')
  )
}

function isUpstreamOrApiMisconfig(msg: string): boolean {
  const m = msg.toLowerCase()
  return (
    m.includes('502') ||
    m.includes('503') ||
    m.includes('504') ||
    m.includes('bad gateway') ||
    m.includes('gateway timeout') ||
    m.includes('invalid response from server') ||
    m.includes('expected json')
  )
}

export function LoginScreen({
  onAuth,
  externalError,
}: {
  onAuth: () => void | Promise<void>
  externalError?: string | null
}) {
  const [pw, setPw] = useState('')
  const [wrong, setWrong] = useState(false)
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [oauthLoading, setOauthLoading] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)

  async function submit() {
    if (loading || !pw) return
    setLoading(true)
    setErr(null)
    try {
      await login(pw)
      await fetchMeOrThrow()
      await onAuth()
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Ошибка входа'
      if (msg.includes('Неверный') || msg.includes('401')) {
        setWrong(true)
        setTimeout(() => setWrong(false), 2000)
      } else if (isNetworkFetchFailure(msg)) {
        if (import.meta.env.PROD) {
          setErr(
            `Не удалось связаться с API (${API_BASE_URL || 'same origin'}). Убедитесь, что API доступен, VITE_API_URL при сборке указывает на его адрес (без /api), а на API в FRONTEND_URL — URL этого сайта (CORS).`,
          )
        } else {
          setErr(
            `Не удалось связаться с API (${API_BASE_URL}). Запустите server (npm run dev в папке server). В survey/.env задайте VITE_API_URL. Для CORS в server/.env: FRONTEND_URL=http://localhost:5173.`,
          )
        }
      } else if (isUpstreamOrApiMisconfig(msg)) {
        setErr(
          'Шлюз вернул 502/503 или ответ не JSON: отдельный API недоступен или отвечает не JSON. Проверьте VITE_API_URL при сборке (корень API, без /api), пересборку фронта и что API в сети отвечает по HTTPS; на API в FRONTEND_URL — URL этого сайта.',
        )
      } else {
        setErr(msg)
      }
    } finally {
      setLoading(false)
    }
  }

  async function oauth(provider: 'google' | 'azure') {
    if (oauthLoading) return
    setOauthLoading(provider)
    setErr(null)
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: ADMIN_ORIGIN,
          scopes: provider === 'azure' ? 'email' : undefined,
        },
      })
      if (error) {
        const m = error.message ?? ''
        if (m.includes('not enabled') || m.includes('Unsupported provider')) {
          setErr(
            'Провайдер выключен в Supabase: Dashboard → Authentication → Providers → включите Google и/или Azure (Microsoft), сохраните.',
          )
        } else {
          setErr(m)
        }
      }
    } finally {
      setOauthLoading(null)
    }
  }

  const apiUrlWarn = productionApiUrlWarning()

  return (
    <div className="ls-root">
      <div className="ls-glow ls-glow--1" />
      <div className="ls-glow ls-glow--2" />
      <div className="ls-noise" />

      <div className="ls-login-stack">
      {apiUrlWarn && (
        <div className="ls-deploy-banner" role="alert">
          <code className="ls-deploy-code">VITE_API_URL</code>: {apiUrlWarn}
        </div>
      )}
      <motion.div
        className="ls-card"
        initial={{ opacity: 0, y: 16 }}
        animate={
          wrong
            ? { x: [0, -12, 12, -8, 8, -4, 4, 0], opacity: 1, y: 0 }
            : { opacity: 1, y: 0, x: 0 }
        }
        transition={{ duration: wrong ? 0.5 : 0.4, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="ls-brand">
          <span className="ls-brand-dot" />
          Askly
        </div>

        <h1 className="ls-title">Панель<br />администратора</h1>

        <div className="ls-oauth-row">
          <button
            type="button"
            className="ls-oauth-btn"
            disabled={!!oauthLoading}
            onClick={() => oauth('google')}
          >
            {oauthLoading === 'google' ? <span className="ls-spinner" /> : (
              <>Google</>
            )}
          </button>
          <button
            type="button"
            className="ls-oauth-btn"
            disabled={!!oauthLoading}
            onClick={() => oauth('azure')}
          >
            {oauthLoading === 'azure' ? <span className="ls-spinner" /> : (
              <>Microsoft</>
            )}
          </button>
        </div>

        <p className="ls-divider"><span>или пароль администратора</span></p>

        <div className="ls-field">
          <div className={`ls-input-wrap${wrong ? ' ls-input-wrap--err' : ''}`}>
            <input
              type={showPw ? 'text' : 'password'}
              placeholder="Пароль"
              value={pw}
              onChange={e => setPw(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && submit()}
              className="ls-input"
            />
            <button
              type="button"
              className="ls-eye"
              onClick={() => setShowPw(v => !v)}
              tabIndex={-1}
            >
              {showPw ? (
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                  <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                  <line x1="1" y1="1" x2="23" y2="23"/>
                </svg>
              ) : (
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                  <circle cx="12" cy="12" r="3"/>
                </svg>
              )}
            </button>
          </div>

          <AnimatePresence>
            {wrong && (
              <motion.p
                className="ls-err"
                initial={{ opacity: 0, height: 0, marginTop: 0 }}
                animate={{ opacity: 1, height: 'auto', marginTop: 8 }}
                exit={{ opacity: 0, height: 0, marginTop: 0 }}
                transition={{ duration: 0.2 }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0,marginTop:1}}>
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" y1="8" x2="12" y2="12"/>
                  <line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                Неверный пароль
              </motion.p>
            )}
          </AnimatePresence>
        </div>

        {(err || externalError) && <p className="ls-err ls-err--static">{err || externalError}</p>}

        <motion.button
          className="ls-btn"
          onClick={submit}
          disabled={loading || !pw}
          whileHover={!loading && pw ? { scale: 1.02 } : {}}
          whileTap={!loading && pw ? { scale: 0.97 } : {}}
        >
          {loading ? <span className="ls-spinner" /> : 'Войти по паролю'}
        </motion.button>
      </motion.div>
      </div>
    </div>
  )
}
