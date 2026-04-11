import { useState } from 'react'
import { motion, AnimatePresence, easeOut } from 'framer-motion'

const ADMIN_PASSWORD = 'admin2026'

export function LoginScreen({ onAuth }: { onAuth: () => void }) {
  const [pw, setPw] = useState('')
  const [wrong, setWrong] = useState(false)

  function submit() {
    if (pw === ADMIN_PASSWORD) { onAuth() }
    else { setWrong(true); setTimeout(() => setWrong(false), 1800) }
  }

  return (
    <div className="adm-center">
      <div className="adm-bg-scene">
        <div className="adm-orb adm-orb--1" />
        <div className="adm-orb adm-orb--2" />
        <div className="adm-grid" />
      </div>
      <motion.div
        className="adm-login-card"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: easeOut }}
      >
        <p className="adm-eyebrow">CRM-консультация</p>
        <h1 className="adm-login-title">Панель администратора</h1>
        <div className="adm-field">
          <label htmlFor="adm-pw">Пароль</label>
          <input
            id="adm-pw"
            type="password"
            placeholder="Введите пароль"
            value={pw}
            onChange={e => setPw(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && submit()}
            className={wrong ? 'adm-input--error' : ''}
            autoFocus
          />
          <AnimatePresence>
            {wrong && (
              <motion.p
                className="adm-err-text"
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
              >
                Неверный пароль
              </motion.p>
            )}
          </AnimatePresence>
        </div>
        <motion.button
          className="adm-btn-primary"
          onClick={submit}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          Войти
        </motion.button>
      </motion.div>
    </div>
  )
}
