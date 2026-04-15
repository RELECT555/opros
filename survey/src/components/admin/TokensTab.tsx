import { memo, useCallback, useEffect, useMemo, useState } from 'react'
import { motion, easeOut, AnimatePresence } from 'framer-motion'
import Tabs from '@mui/material/Tabs'
import Tab from '@mui/material/Tab'
import { List, type RowComponentProps } from 'react-window'
import { getTokens, createTokens, deleteToken, regenerateToken } from '../../lib/api-client'
import type { TokenRecord } from '../../lib/supabase'
import { AdminSkeletonRows } from './AdminSkeletons'

interface Props {
  surveyId: number
  surveySlug: string
}

type TokensRowData = {
  items: TokenRecord[]
  copied: string | null
  regenerating: string | null
  getTokenUrl: (token: string) => string
  onCopy: (token: string) => void
  onRegenerate: (token: string, email: string) => void
  onDelete: (token: string) => void
}

const TOKEN_ROW_HEIGHT = 112
const TOKEN_VIRTUAL_THRESHOLD = 18
const TOKEN_VIRTUAL_MAX_HEIGHT = 560

export function TokensTab({ surveyId, surveySlug }: Props) {
  const [tokens, setTokens] = useState<TokenRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [emailInput, setEmailInput] = useState('')
  const [generating, setGenerating] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)
  const [regenerating, setRegenerating] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'new' | 'opened' | 'used'>('all')

  const origin = window.location.origin

  const tokenUrl = useCallback((token: string) => {
    // Единый поток: всегда страница опроса (динамическая форма), не лендинг /
    return `${origin}/s/${surveySlug}?t=${token}`
  }, [origin, surveySlug])

  const load = useCallback(() => {
    setLoading(true)
    getTokens(surveyId)
      .then(setTokens)
      .catch(e => setError(e.message ?? 'Ошибка загрузки'))
      .finally(() => setLoading(false))
  }, [surveyId])

  useEffect(() => { load() }, [load])

  async function generate() {
    const emails = emailInput.split(/[\n,;]+/).map(e => e.trim()).filter(Boolean)
    if (!emails.length) return
    setGenerating(true)
    try {
      await createTokens(emails, surveyId)
      setEmailInput('')
      load()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Ошибка генерации')
    } finally {
      setGenerating(false)
    }
  }

  const remove = useCallback(async (token: string) => {
    await deleteToken(token)
    setTokens(t => t.filter(r => r.token !== token))
  }, [])

  const regen = useCallback(async (token: string, email: string) => {
    setRegenerating(token)
    try {
      const newToken = await regenerateToken(token, email, surveyId)
      setTokens(prev => prev.map(t => t.token === token ? newToken : t))
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Ошибка перегенерации')
    } finally {
      setRegenerating(null)
    }
  }, [surveyId])

  const copy = useCallback((token: string) => {
    navigator.clipboard.writeText(tokenUrl(token))
    setCopied(token)
    setTimeout(() => setCopied(null), 1800)
  }, [tokenUrl])

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

  const shouldVirtualize = filtered.length >= TOKEN_VIRTUAL_THRESHOLD
  const virtualHeight = Math.min(TOKEN_VIRTUAL_MAX_HEIGHT, filtered.length * TOKEN_ROW_HEIGHT)
  const rowData = useMemo<TokensRowData>(() => ({
    items: filtered,
    copied,
    regenerating,
    getTokenUrl: tokenUrl,
    onCopy: copy,
    onRegenerate: regen,
    onDelete: remove,
  }), [filtered, copied, regenerating, tokenUrl, copy, regen, remove])

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
        <Tabs
          value={filter}
          onChange={(_, v) => setFilter(v)}
          sx={{ mb: 1 }}
        >
          <Tab value="all"    label={`Все ${counts.all}`} />
          <Tab value="new"    label={`Не открыт ${counts.new}`} />
          <Tab value="opened" label={`Открыт ${counts.opened}`} />
          <Tab value="used"   label={`Заполнен ${counts.used}`} />
        </Tabs>
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
      {loading && <AdminSkeletonRows count={4} rowHeight={64} />}

      {/* Token list */}
      <div className="adm-token-list">
        {shouldVirtualize ? (
          <List
            rowCount={filtered.length}
            rowHeight={TOKEN_ROW_HEIGHT}
            rowComponent={VirtualTokenRow}
            rowProps={rowData}
            style={{ height: virtualHeight }}
          />
        ) : (
          <AnimatePresence initial={false}>
            {filtered.map((t, idx) => (
              <TokenRow
                key={t.token}
                token={t}
                copied={copied === t.token}
                regenerating={regenerating === t.token}
                url={tokenUrl(t.token)}
                onCopy={copy}
                onRegenerate={regen}
                onDelete={remove}
                animateIn
                delay={idx * 0.025}
              />
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  )
}

const TokenRow = memo(function TokenRow({
  token,
  copied,
  regenerating,
  url,
  onCopy,
  onRegenerate,
  onDelete,
  animateIn = false,
  delay = 0,
}: {
  token: TokenRecord
  copied: boolean
  regenerating: boolean
  url: string
  onCopy: (token: string) => void
  onRegenerate: (token: string, email: string) => void
  onDelete: (token: string) => void
  animateIn?: boolean
  delay?: number
}) {
  const status = token.used_at ? 'used' : token.opened_at ? 'opened' : 'new'
  const initials = token.email.slice(0, 2).toUpperCase()

  return (
    <motion.div
      className="tok-row adm-card"
      initial={animateIn ? { opacity: 0, y: 10 } : false}
      animate={animateIn ? { opacity: 1, y: 0 } : undefined}
      exit={animateIn ? { opacity: 0, y: -6, scale: 0.98 } : undefined}
      transition={animateIn ? { duration: 0.25, delay, ease: easeOut } : undefined}
    >
      <div className={`tok-avatar tok-avatar--${status}`}>
        <span>{initials}</span>
      </div>

      <div className="adm-token-info">
        <p className="adm-token-email">{token.email}</p>
        <p className="adm-token-url">{url}</p>
      </div>

      <span className={`adm-token-badge adm-token-badge--${status}`}>
        <span className="adm-token-badge-dot" />
        {status === 'used' ? 'Заполнен' : status === 'opened' ? 'Открыт' : 'Не открыт'}
      </span>

      <div className="adm-token-actions">
        <motion.button
          className={`adm-btn-ghost adm-btn-copy ${copied ? 'adm-btn-copy--done' : ''}`}
          onClick={() => onCopy(token.token)}
          whileTap={{ scale: 0.93 }}
          title="Скопировать ссылку"
        >
          {copied ? <CheckIcon /> : <CopyIcon />}
          {copied ? 'Скопировано' : 'Копировать'}
        </motion.button>
        <button
          className="adm-btn-ghost adm-btn-regen"
          onClick={() => onRegenerate(token.token, token.email)}
          disabled={regenerating}
          title="Перегенерировать ссылку"
        >
          {regenerating ? <span className="adm-spinner adm-spinner--sm" /> : <RegenIcon />}
        </button>
        <button className="adm-btn-danger" onClick={() => onDelete(token.token)} title="Удалить">
          <TrashIcon />
        </button>
      </div>
    </motion.div>
  )
})

function VirtualTokenRow({
  index,
  style,
  ...data
}: RowComponentProps<TokensRowData>) {
  const token = data.items[index]
  return (
    <div style={style}>
      <TokenRow
        token={token}
        copied={data.copied === token.token}
        regenerating={data.regenerating === token.token}
        url={data.getTokenUrl(token.token)}
        onCopy={data.onCopy}
        onRegenerate={data.onRegenerate}
        onDelete={data.onDelete}
      />
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
