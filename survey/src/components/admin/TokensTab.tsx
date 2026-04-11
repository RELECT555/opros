import { useState, useEffect } from 'react'
import { motion, easeOut } from 'framer-motion'
import { getTokens, createTokens, deleteToken, regenerateToken } from '../../lib/supabase'
import type { TokenRecord } from '../../lib/supabase'

export function TokensTab() {
  const [tokens, setTokens] = useState<TokenRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [emailInput, setEmailInput] = useState('')
  const [generating, setGenerating] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)
  const [regenerating, setRegenerating] = useState<string | null>(null)

  const origin = window.location.origin

  function load() {
    setLoading(true)
    getTokens()
      .then(setTokens)
      .catch(e => setError(e.message ?? 'Ошибка загрузки'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  async function generate() {
    const emails = emailInput.split(/[\n,;]+/).map(e => e.trim()).filter(Boolean)
    if (!emails.length) return
    setGenerating(true)
    try {
      await createTokens(emails)
      setEmailInput('')
      load()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Ошибка генерации')
    } finally {
      setGenerating(false)
    }
  }

  async function remove(token: string) {
    await deleteToken(token)
    setTokens(t => t.filter(r => r.token !== token))
  }

  async function regen(token: string, email: string) {
    setRegenerating(token)
    try {
      const newToken = await regenerateToken(token, email)
      setTokens(prev => prev.map(t => t.token === token ? newToken : t))
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Ошибка перегенерации')
    } finally {
      setRegenerating(null)
    }
  }

  function copy(token: string) {
    const url = `${origin}/?t=${token}`
    navigator.clipboard.writeText(url)
    setCopied(token)
    setTimeout(() => setCopied(null), 1800)
  }

  return (
    <div className="adm-tab-content">
      <div className="adm-section-head">
        <div className="adm-section-title-row">
          <h2 className="adm-section-title">Токены рассылки</h2>
          {!loading && <span className="adm-badge">{tokens.length}</span>}
        </div>
        <button className="adm-btn-ghost" onClick={load} disabled={loading}>
          {loading ? <span className="adm-spinner" /> : 'Обновить'}
        </button>
      </div>

      <p className="adm-hint">Создайте уникальные ссылки для каждого получателя. Ссылка не раскрывает email — только токен.</p>
      {error && <p className="adm-err-banner">{error}</p>}

      {/* Generate */}
      <div className="adm-card adm-token-gen">
        <p className="adm-token-gen-label">Email адреса получателей</p>
        <textarea
          className="adm-token-textarea"
          placeholder={'ivanov@company.ru\npetrov@firm.com\nsidorov@biz.ru'}
          value={emailInput}
          onChange={e => setEmailInput(e.target.value)}
          rows={4}
        />
        <p className="adm-token-gen-hint">Каждый email с новой строки, или через запятую / точку с запятой</p>
        <motion.button
          className="adm-btn-primary"
          onClick={generate}
          disabled={generating || !emailInput.trim()}
          whileTap={{ scale: 0.97 }}
        >
          {generating ? <span className="adm-spinner" /> : 'Создать ссылки'}
        </motion.button>
      </div>

      {/* List */}
      {!loading && tokens.length === 0 && !error && (
        <div className="adm-empty">
          <p>Токенов пока нет</p>
          <span>Введите email адреса выше и создайте ссылки</span>
        </div>
      )}

      <div className="adm-token-list">
        {tokens.map((t, idx) => (
          <motion.div
            key={t.token}
            className="adm-card adm-token-row"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: idx * 0.03, ease: easeOut }}
          >
            <div className="adm-token-info">
              <p className="adm-token-email">{t.email}</p>
              <p className="adm-token-url">{origin}/?t={t.token}</p>
            </div>
            <div className="adm-token-meta">
              {t.used_at
                ? <span className="adm-token-badge adm-token-badge--used">Заполнен</span>
                : t.opened_at
                  ? <span className="adm-token-badge adm-token-badge--opened">Открыт</span>
                  : <span className="adm-token-badge adm-token-badge--new">Не открыт</span>
              }
            </div>
            <div className="adm-token-actions">
              <motion.button
                className={`adm-btn-ghost adm-btn-copy ${copied === t.token ? 'adm-btn-copy--done' : ''}`}
                onClick={() => copy(t.token)}
                whileTap={{ scale: 0.95 }}
              >
                {copied === t.token ? 'Скопировано' : 'Копировать'}
              </motion.button>
              <button
                className="adm-btn-ghost adm-btn-regen"
                onClick={() => regen(t.token, t.email)}
                disabled={regenerating === t.token}
                title="Перегенерировать ссылку"
              >
                {regenerating === t.token
                  ? <span className="adm-spinner adm-spinner--sm" />
                  : <RegenIcon />
                }
              </button>
              <button className="adm-btn-danger" onClick={() => remove(t.token)} title="Удалить">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </button>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  )
}

function RegenIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M2.5 7A4.5 4.5 0 007 11.5a4.5 4.5 0 004.5-4.5A4.5 4.5 0 007 2.5a4.5 4.5 0 00-3.18 1.32" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
      <path d="M2 2v2.5h2.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}
