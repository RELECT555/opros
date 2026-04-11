import { useState, useEffect } from 'react'
import { motion, AnimatePresence, easeOut } from 'framer-motion'
import { getResponses, getTokens, createTokens, deleteToken } from './lib/supabase'
import type { SurveyRecord, TokenRecord } from './lib/supabase'
import { loadConfig, loadConfigRemote, saveConfigRemote, DEFAULTS } from './config'
import type { SurveyConfig } from './config'
import './Admin.css'

const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD ?? 'admin2024'

const CURRENT_LABELS: Record<string, string> = {
  yes: 'Да, используем CRM',
  no: 'Нет, работаем без CRM',
  looking: 'Выбираем CRM прямо сейчас',
  switching: 'Хотим сменить текущую',
}

function formatDate(iso: string) {
  const d = new Date(iso)
  return d.toLocaleString('ru-RU', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

/* ══════════════════════════════════════════════════════════════
   LOGIN
══════════════════════════════════════════════════════════════ */
function LoginScreen({ onAuth }: { onAuth: () => void }) {
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

/* ══════════════════════════════════════════════════════════════
   RESPONSES TAB
══════════════════════════════════════════════════════════════ */
function ResponsesTab() {
  const [rows, setRows] = useState<SurveyRecord[]>([])
  const [tokens, setTokens] = useState<TokenRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [expanded, setExpanded] = useState<number | null>(null)

  function load() {
    setLoading(true)
    Promise.all([getResponses(), getTokens()])
      .then(([r, t]) => { setRows(r); setTokens(t) })
      .catch(e => setError(e.message ?? 'Ошибка загрузки'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  function emailByToken(token?: string) {
    if (!token) return null
    return tokens.find(t => t.token === token)?.email ?? null
  }

  return (
    <div className="adm-tab-content">
      <div className="adm-section-head">
        <div className="adm-section-title-row">
          <h2 className="adm-section-title">Заявки</h2>
          {!loading && <span className="adm-badge">{rows.length}</span>}
        </div>
        <button className="adm-btn-ghost" onClick={load} disabled={loading}>
          {loading ? <span className="adm-spinner" /> : 'Обновить'}
        </button>
      </div>

      {error && <p className="adm-err-banner">{error}</p>}

      {loading && (
        <div className="adm-loading-rows">
          {[1, 2, 3].map(i => <div key={i} className="adm-skeleton" style={{ opacity: 1 - i * 0.25 }} />)}
        </div>
      )}

      {!loading && rows.length === 0 && !error && (
        <div className="adm-empty">
          <p>Заявок пока нет</p>
          <span>Они появятся здесь после первой отправки опроса</span>
        </div>
      )}

      <div className="adm-responses-list">
        {rows.map((row, idx) => (
          <motion.div
            key={row.id}
            className={`adm-card adm-response-card ${expanded === row.id ? 'adm-card--open' : ''}`}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: idx * 0.04, ease: easeOut }}
          >
            <button
              className="adm-response-header"
              onClick={() => setExpanded(expanded === row.id ? null : row.id)}
            >
              <div className="adm-response-left">
                <span className="adm-response-num">#{rows.length - idx}</span>
                <div>
                  <p className="adm-response-name">{row.name}</p>
                  <p className="adm-response-phone">{row.phone}</p>
                  {emailByToken(row.token) && (
                    <p className="adm-response-email">{emailByToken(row.token)}</p>
                  )}
                </div>
              </div>
              <div className="adm-response-right">
                <span className="adm-response-date">{formatDate(row.created_at)}</span>
                <span className={`adm-chevron ${expanded === row.id ? 'adm-chevron--open' : ''}`}>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M3 5l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </span>
              </div>
            </button>

            <AnimatePresence>
              {expanded === row.id && (
                <motion.div
                  className="adm-response-body"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.28, ease: easeOut }}
                >
                  <div className="adm-response-body-inner">
                    <DataRow label="Имя" value={row.name} highlight />
                    <DataRow label="Телефон" value={row.phone} highlight />
                    {emailByToken(row.token) && (
                      <DataRow label="Email (источник)" value={emailByToken(row.token)!} highlight />
                    )}
                    <div className="adm-divider" />
                    <DataRow label="Текущий статус" value={CURRENT_LABELS[row.current_crm] ?? row.current_crm} />
                    <DataRow label="Цель CRM" value={row.crm_purpose.join(', ')} />
                    <DataRow label="Использовали раньше" value={row.crm_used_before.join(', ')} />
                    {row.comment && <DataRow label="Комментарий" value={row.comment} />}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ))}
      </div>
    </div>
  )
}

function DataRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="adm-data-row">
      <span className="adm-data-label">{label}</span>
      <span className={`adm-data-value ${highlight ? 'adm-data-value--hi' : ''}`}>{value}</span>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════
   TOKENS TAB
══════════════════════════════════════════════════════════════ */
function TokensTab() {
  const [tokens, setTokens] = useState<TokenRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [emailInput, setEmailInput] = useState('')
  const [generating, setGenerating] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)

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

/* ══════════════════════════════════════════════════════════════
   QUESTIONS TAB
══════════════════════════════════════════════════════════════ */
function QuestionsTab() {
  const [cfg, setCfg] = useState<SurveyConfig>(loadConfig)
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')

  useEffect(() => {
    loadConfigRemote().then(setCfg)
  }, [])

  async function save() {
    setSaving(true)
    setSaveError('')
    try {
      await saveConfigRemote(cfg)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (e: unknown) {
      setSaveError(e instanceof Error ? e.message : 'Ошибка сохранения')
    } finally {
      setSaving(false)
    }
  }

  async function reset() {
    if (!confirm('Сбросить все вопросы до исходных?')) return
    setCfg(DEFAULTS)
    await saveConfigRemote(DEFAULTS)
  }

  /* Q1 helpers */
  function setQ1Option(i: number, val: string) {
    setCfg(c => ({ ...c, q1: { ...c.q1, options: c.q1.options.map((o, j) => j === i ? val : o) } }))
  }
  function addQ1Option() {
    setCfg(c => ({ ...c, q1: { ...c.q1, options: [...c.q1.options, ''] } }))
  }
  function removeQ1Option(i: number) {
    setCfg(c => ({ ...c, q1: { ...c.q1, options: c.q1.options.filter((_, j) => j !== i) } }))
  }

  /* Q2 helpers */
  function setQ2Option(i: number, val: string) {
    setCfg(c => ({ ...c, q2: { ...c.q2, options: c.q2.options.map((o, j) => j === i ? val : o) } }))
  }
  function addQ2Option() {
    setCfg(c => ({ ...c, q2: { ...c.q2, options: [...c.q2.options, ''] } }))
  }
  function removeQ2Option(i: number) {
    setCfg(c => ({ ...c, q2: { ...c.q2, options: c.q2.options.filter((_, j) => j !== i) } }))
  }

  /* Q3 helpers */
  function setQ3Label(i: number, label: string) {
    setCfg(c => ({ ...c, q3: { ...c.q3, options: c.q3.options.map((o, j) => j === i ? { ...o, label } : o) } }))
  }
  function addQ3Option() {
    setCfg(c => ({ ...c, q3: { ...c.q3, options: [...c.q3.options, { value: `opt${Date.now()}`, label: '' }] } }))
  }
  function removeQ3Option(i: number) {
    setCfg(c => ({ ...c, q3: { ...c.q3, options: c.q3.options.filter((_, j) => j !== i) } }))
  }

  return (
    <div className="adm-tab-content">
      <div className="adm-section-head">
        <div className="adm-section-title-row">
          <h2 className="adm-section-title">Редактор вопросов</h2>
        </div>
        <div className="adm-head-actions">
          <button className="adm-btn-ghost" onClick={reset}>Сбросить</button>
          <motion.button
            className={`adm-btn-primary adm-btn-save ${saved ? 'adm-btn-saved' : ''}`}
            onClick={save}
            whileTap={{ scale: 0.97 }}
            disabled={saving}
          >
            {saving ? <span className="adm-spinner" /> : saved ? (
              <><SavedIcon /> Сохранено</>
            ) : 'Сохранить'}
          </motion.button>
        </div>
      </div>

      <p className="adm-hint">Изменения применятся к опросу при следующей загрузке страницы пользователем.</p>
      {saveError && <p className="adm-err-banner">{saveError}</p>}

      {/* Q1 */}
      <div className="adm-card adm-q-card">
        <div className="adm-q-num">01</div>
        <QTitleField
          label="Заголовок вопроса"
          value={cfg.q1.title}
          onChange={v => setCfg(c => ({ ...c, q1: { ...c.q1, title: v } }))}
        />
        <QTitleField
          label="Подзаголовок"
          value={cfg.q1.sub}
          onChange={v => setCfg(c => ({ ...c, q1: { ...c.q1, sub: v } }))}
        />
        <div className="adm-q-options-label">Варианты ответа <span>(чекбоксы)</span></div>
        <div className="adm-options-list">
          {cfg.q1.options.map((opt, i) => (
            <OptionRow
              key={i}
              value={opt}
              onChange={v => setQ1Option(i, v)}
              onRemove={() => removeQ1Option(i)}
            />
          ))}
          <AddOptionBtn onClick={addQ1Option} />
        </div>
      </div>

      {/* Q2 */}
      <div className="adm-card adm-q-card">
        <div className="adm-q-num">02</div>
        <QTitleField
          label="Заголовок вопроса"
          value={cfg.q2.title}
          onChange={v => setCfg(c => ({ ...c, q2: { ...c.q2, title: v } }))}
        />
        <QTitleField
          label="Подзаголовок"
          value={cfg.q2.sub}
          onChange={v => setCfg(c => ({ ...c, q2: { ...c.q2, sub: v } }))}
        />
        <div className="adm-q-options-label">Варианты ответа <span>(чекбоксы)</span></div>
        <div className="adm-options-list">
          {cfg.q2.options.map((opt, i) => (
            <OptionRow
              key={i}
              value={opt}
              onChange={v => setQ2Option(i, v)}
              onRemove={() => removeQ2Option(i)}
            />
          ))}
          <AddOptionBtn onClick={addQ2Option} />
        </div>
      </div>

      {/* Q3 */}
      <div className="adm-card adm-q-card">
        <div className="adm-q-num">03</div>
        <QTitleField
          label="Заголовок вопроса"
          value={cfg.q3.title}
          onChange={v => setCfg(c => ({ ...c, q3: { ...c.q3, title: v } }))}
        />
        <QTitleField
          label="Подзаголовок"
          value={cfg.q3.sub}
          onChange={v => setCfg(c => ({ ...c, q3: { ...c.q3, sub: v } }))}
        />
        <div className="adm-q-options-label">Варианты ответа <span>(радио-кнопки)</span></div>
        <div className="adm-options-list">
          {cfg.q3.options.map((opt, i) => (
            <OptionRow
              key={opt.value}
              value={opt.label}
              onChange={v => setQ3Label(i, v)}
              onRemove={() => removeQ3Option(i)}
            />
          ))}
          <AddOptionBtn onClick={addQ3Option} />
        </div>
      </div>
    </div>
  )
}

function QTitleField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="adm-field adm-field--sm">
      <label>{label}</label>
      <input type="text" value={value} onChange={e => onChange(e.target.value)} />
    </div>
  )
}

function OptionRow({ value, onChange, onRemove }: { value: string; onChange: (v: string) => void; onRemove: () => void }) {
  return (
    <div className="adm-option-row">
      <span className="adm-option-drag">⠿</span>
      <input
        className="adm-option-input"
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="Текст варианта..."
      />
      <button className="adm-option-remove" onClick={onRemove} title="Удалить">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      </button>
    </div>
  )
}

function AddOptionBtn({ onClick }: { onClick: () => void }) {
  return (
    <button className="adm-add-option" onClick={onClick}>
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <path d="M7 2v10M2 7h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
      Добавить вариант
    </button>
  )
}

function SavedIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0 }}>
      <path d="M2 7l3.5 3.5L12 3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

/* ══════════════════════════════════════════════════════════════
   MAIN
══════════════════════════════════════════════════════════════ */
type Tab = 'responses' | 'tokens' | 'questions'

export default function AdminPage() {
  const [authed, setAuthed] = useState(false)
  const [tab, setTab] = useState<Tab>('responses')

  if (!authed) return <LoginScreen onAuth={() => setAuthed(true)} />

  return (
    <div className="adm-root">
      <div className="adm-bg-scene">
        <div className="adm-orb adm-orb--1" />
        <div className="adm-orb adm-orb--2" />
        <div className="adm-grid" />
      </div>

      <div className="adm-layout">
        {/* Sidebar */}
        <aside className="adm-sidebar">
          <div className="adm-sidebar-brand">
            <p className="adm-eyebrow">CRM-консультация</p>
            <h1 className="adm-brand-title">Админ</h1>
          </div>

          <nav className="adm-nav">
            <button
              className={`adm-nav-item ${tab === 'responses' ? 'adm-nav-item--active' : ''}`}
              onClick={() => setTab('responses')}
            >
              <InboxIcon /> Заявки
            </button>
            <button
              className={`adm-nav-item ${tab === 'tokens' ? 'adm-nav-item--active' : ''}`}
              onClick={() => setTab('tokens')}
            >
              <LinkIcon /> Токены
            </button>
            <button
              className={`adm-nav-item ${tab === 'questions' ? 'adm-nav-item--active' : ''}`}
              onClick={() => setTab('questions')}
            >
              <EditIcon /> Вопросы
            </button>
          </nav>

          <a className="adm-survey-link" href="/" target="_blank" rel="noopener">
            <ExternalIcon /> Открыть опрос
          </a>
        </aside>

        {/* Main */}
        <main className="adm-main">
          <AnimatePresence mode="wait">
            <motion.div
              key={tab}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25, ease: easeOut }}
            >
              {tab === 'responses' ? <ResponsesTab /> : tab === 'tokens' ? <TokensTab /> : <QuestionsTab />}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  )
}

/* ── Icons ── */
function InboxIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <rect x="1.5" y="3.5" width="13" height="10" rx="2" stroke="currentColor" strokeWidth="1.4"/>
      <path d="M1.5 9.5h3.5l1.5 2h3l1.5-2H14.5" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
    </svg>
  )
}
function EditIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M11 2.5l2.5 2.5-8 8H3v-2.5l8-8z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
    </svg>
  )
}
function LinkIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M6.5 9.5a3.5 3.5 0 005 0l2-2a3.5 3.5 0 00-5-5l-1 1" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
      <path d="M9.5 6.5a3.5 3.5 0 00-5 0l-2 2a3.5 3.5 0 005 5l1-1" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
    </svg>
  )
}
function ExternalIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
      <path d="M5 2H2a1 1 0 00-1 1v7a1 1 0 001 1h7a1 1 0 001-1V7M7 1h4m0 0v4m0-4L5 7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}
