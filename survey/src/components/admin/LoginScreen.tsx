import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const ADMIN_PASSWORD = 'admin2026'

export function LoginScreen({ onAuth }: { onAuth: () => void }) {
  const [pw, setPw] = useState('')
  const [wrong, setWrong] = useState(false)
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)

  async function submit() {
    if (loading || !pw) return
    setLoading(true)
    await new Promise(r => setTimeout(r, 500))
    setLoading(false)
    if (pw === ADMIN_PASSWORD) {
      onAuth()
    } else {
      setWrong(true)
      setTimeout(() => setWrong(false), 2000)
    }
  }

  return (
    <div className="ls-root">
      <div className="ls-glow ls-glow--1" />
      <div className="ls-glow ls-glow--2" />
      <div className="ls-noise" />

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

        <div className="ls-field">
          <div className={`ls-input-wrap${wrong ? ' ls-input-wrap--err' : ''}`}>
            <input
              type={showPw ? 'text' : 'password'}
              placeholder="Введите пароль"
              value={pw}
              onChange={e => setPw(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && submit()}
              autoFocus
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

        <motion.button
          className="ls-btn"
          onClick={submit}
          disabled={loading || !pw}
          whileHover={!loading && pw ? { scale: 1.02 } : {}}
          whileTap={!loading && pw ? { scale: 0.97 } : {}}
        >
          {loading ? <span className="ls-spinner" /> : 'Войти'}
        </motion.button>
      </motion.div>
    </div>
  )
}
