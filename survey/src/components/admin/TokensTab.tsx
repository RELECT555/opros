import { useState, useEffect } from 'react'
import { motion, easeOut, AnimatePresence } from 'framer-motion'
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
  const [filter, setFilter] = useState<'all' | 'new' | 'opened' | 'used'>('all')

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

  const counts = {
    all: tokens.length,
    new: tokens.filter(t => !t.opened_at && !t.used_at).length,
    opened: tokens.filter(t => t.opened_at && !t.used_at).length,
    used: tokens.filter(t => !!t.used_at).length,
  }

  const filtered = filter === 'all' ? tokens
    : filter === 'new' ? tokens.filter(t => !t.opened_at && !t.used_at)
    : filter === 'opened' ? tokens.filter(t => t.opened_at && !t.used_at)
    : tokens.filter(t => !!t.used_at)

  return (
    <div className="adm-tab-content">
      {/* Header */}
      <div className="adm-section-head">
        <div className="adm-section-title-row">
          <h2 className="adm-section-title">Токены рассылки</h2>
          {!loading && <span className="adm-badge">{tokens.length}</span>}
        </div>
        <button className="adm-btn-ghost" onClick={load} disabled={loading}>
          {loading ? <span className="adm-spinner" /> : (
            <><RefreshIcon /> Обновить</>
          )}
        </button>
      </div>

      {error && <p className="adm-err-banner">{error}</p>}

      {/* Generate card */}
      <div className="tok-gen-card adm-card">
        <div className="tok-gen-header">
          <div className="tok-gen-icon">
            <LinkIcon />
          </div>
          <div>
            <p className="tok-gen-title">Создать ссылки</p>
            <p className="tok-gen-sub">Уникальная ссылка для каждого получателя — email не раскрывается</p>
          </div>
        </div>
        <textarea
          className="adm-token-textarea"
          placeholder={'ivanov@company.ru\npetrov@firm.com\nsidorov@biz.ru'}
          value={emailInput}
          onChange={e => setEmailInput(e.target.value)}
          rows={3}
        />
        <div className="tok-gen-footer">
          <p className="adm-token-gen-hint">Каждый email с новой строки, или через запятую / точку с запятой</p>
          <motion.button
            className="adm-btn-primary tok-gen-btn"
            onClick={generate}
            disabled={generating || !emailInput.trim()}
            whileTap={{ scale: 0.97 }}
          >
            {generating ? <span className="adm-spinner" /> : <><PlusIcon /> Создать ссылки</>}
          </motion.button>
        </div>
      </div>

      {/* Stats row */}
      {!loading && tokens.length > 0 && (
        <div className="tok-stats">
          {(['all', 'new', 'opened', 'used'] as const).map(k => (
            <button
              key={k}
              className={`tok-stat-btn ${filter === k ? 'tok-stat-btn--active' : ''}`}
              onClick={() => setFilter(k)}
            >
              <span className={`tok-stat-dot tok-stat-dot--${k}`} />
              <span className="tok-stat-label">{
                k === 'all' ? 'Все' : k === 'new' ? 'Не открыт' : k === 'opened' ? 'Открыт' : 'Заполнен'
              }</span>
              <span className="tok-stat-count">{counts[k]}</span>
            </button>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && tokens.length === 0 && !error && (
        <div className="adm-empty tok-empty">
          <div className="tok-empty-icon"><LinkIcon /></div>
          <p>Токенов пока нет</p>
          <span>Введите email адреса выше и создайте ссылки</span>
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="adm-loading-rows">
          {[1,2,3].map(i => <div key={i} className="adm-skeleton" />)}
        </div>
      )}

      {/* Token list */}
      <div className="adm-token-list">
        <AnimatePresence initial={false}>
          {filtered.map((t, idx) => {
            const status = t.used_at ? 'used' : t.opened_at ? 'opened' : 'new'
            const initials = t.email.slice(0, 2).toUpperCase()
            return (
              <motion.div
                key={t.token}
                className="tok-row adm-card"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6, scale: 0.98 }}
                transition={{ duration: 0.25, delay: idx * 0.025, ease: easeOut }}
              >
                <div className={`tok-row-accent tok-row-accent--${status}`} />

                <div className="tok-avatar">
                  <span>{initials}</span>
                </div>

                <div className="adm-token-info">
                  <p className="adm-token-email">{t.email}</p>
                  <p className="adm-token-url">{origin}/?t={t.token}</p>
                </div>

                <span className={`adm-token-badge adm-token-badge--${status}`}>
                  <span className={`tok-badge-dot tok-badge-dot--${status}`} />
                  {status === 'used' ? 'Заполнен' : status === 'opened' ? 'Открыт' : 'Не открыт'}
                </span>

                <div className="adm-token-actions">
                  <motion.button
                    className={`adm-btn-ghost adm-btn-copy ${copied === t.token ? 'adm-btn-copy--done' : ''}`}
                    onClick={() => copy(t.token)}
                    whileTap={{ scale: 0.93 }}
                    title="Скопировать ссылку"
                  >
                    {copied === t.token ? <CheckIcon /> : <CopyIcon />}
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
                      : <RegenIcon />}
                  </button>
                  <button className="adm-btn-danger" onClick={() => remove(t.token)} title="Удалить">
                    <TrashIcon />
                  </button>
                </div>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>
    </div>
  )
}

function LinkIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M6.5 9.5l3-3M5.5 7l-1.207 1.207a2.5 2.5 0 003.536 3.536L9 10.5M11 9l1.207-1.207a2.5 2.5 0 00-3.536-3.536L7.5 5.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
    </svg>
  )
}

function PlusIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M7 2v10M2 7h10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
    </svg>
  )
}

function CopyIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
      <rect x="4.5" y="4.5" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.2"/>
      <path d="M4.5 8.5H3a1 1 0 01-1-1V3a1 1 0 011-1h4.5a1 1 0 011 1v1.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
      <path d="M2 6.5l3.5 3.5 5.5-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

function RefreshIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
      <path d="M2 6.5A4.5 4.5 0 006.5 11a4.5 4.5 0 004.5-4.5A4.5 4.5 0 006.5 2a4.5 4.5 0 00-3.18 1.32" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
      <path d="M2 2v3h3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
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

function TrashIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
      <path d="M2 3.5h9M5 3.5V2.5h3v1M4.5 3.5l.5 7h3l.5-7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}
