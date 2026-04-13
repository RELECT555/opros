import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence, easeOut } from 'framer-motion'
import Pagination from '@mui/material/Pagination'
import Tabs from '@mui/material/Tabs'
import Tab from '@mui/material/Tab'
import {
  getResponsesPaged, getResponses, getTokens,
  updateResponseStatus, updateManagerNote, PAGE_SIZE,
} from '../../lib/supabase'
import type { SurveyRecord, TokenRecord, ResponseStatus, Survey } from '../../lib/supabase'

const CURRENT_LABELS: Record<string, string> = {
  yes:       'Да, используем CRM',
  no:        'Нет, работаем без CRM',
  looking:   'Выбираем CRM прямо сейчас',
  switching: 'Хотим сменить текущую',
}

export const STATUS_CONFIG: Record<ResponseStatus, { label: string; cls: string }> = {
  new:         { label: 'Новая',      cls: 'adm-status--new' },
  called:      { label: 'Позвонили',  cls: 'adm-status--called' },
  in_progress: { label: 'В работе',   cls: 'adm-status--progress' },
  closed:      { label: 'Закрыто',    cls: 'adm-status--closed' },
}

function StatusBadge({ status, size = 'sm' }: { status: ResponseStatus; size?: 'sm' | 'md' }) {
  const cfg = STATUS_CONFIG[status]
  return (
    <span className={`adm-status-badge ${cfg.cls} ${size === 'md' ? 'adm-status-badge--md' : ''}`}>
      <span className="adm-status-dot" />
      {cfg.label}
    </span>
  )
}
const STATUS_ORDER: ResponseStatus[] = ['new', 'called', 'in_progress', 'closed']

function formatDate(iso: string) {
  const d = new Date(iso)
  return d.toLocaleString('ru-RU', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function exportToCSV(rows: SurveyRecord[], tokens: TokenRecord[]) {
  const tokenMap = new Map(tokens.map(t => [t.token, t.email]))
  const esc = (val: string) => `"${val.replace(/"/g, '""')}"`

  const headers = [
    'ID', 'Дата', 'Имя', 'Телефон', 'Email', 'Email (токен)',
    'Статус', 'Цель CRM', 'Использовали раньше', 'Текущая ситуация',
    'Комментарий', 'Заметка менеджера',
  ]

  const lines = [
    headers.join(';'),
    ...rows.map(r => [
      r.id,
      formatDate(r.created_at),
      esc(r.name),
      esc(r.phone),
      esc(r.email ?? ''),
      esc(r.token ? (tokenMap.get(r.token) ?? '') : ''),
      STATUS_CONFIG[r.status]?.label ?? r.status,
      esc(r.crm_purpose.join(', ')),
      esc(r.crm_used_before.join(', ')),
      esc(CURRENT_LABELS[r.current_crm] ?? r.current_crm),
      esc(r.comment ?? ''),
      esc(r.manager_note ?? ''),
    ].join(';')),
  ]

  const blob = new Blob(['\uFEFF' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `askly_${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

interface Props {
  surveyId: number
  survey: Survey
}

export function ResponsesTab({ surveyId, survey }: Props) {
  const [rows, setRows] = useState<SurveyRecord[]>([])
  const [tokens, setTokens] = useState<TokenRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [expanded, setExpanded] = useState<number | null>(null)
  const [updatingStatus, setUpdatingStatus] = useState<number | null>(null)
  const [savingNote, setSavingNote] = useState<number | null>(null)
  const [noteValues, setNoteValues] = useState<Record<number, string>>({})
  const [exporting, setExporting] = useState(false)
  const [statusFilter, setStatusFilter] = useState<ResponseStatus | 'all'>('all')

  const totalPages = Math.ceil(total / PAGE_SIZE)

  const load = useCallback((p: number, filter: ResponseStatus | 'all') => {
    setLoading(true)
    setError('')
    Promise.all([getResponsesPaged(p, PAGE_SIZE, surveyId, filter), getTokens(surveyId)])
      .then(([{ data, total: t }, tkns]) => {
        setRows(data)
        setTotal(t)
        setTokens(tkns)
        setNoteValues(prev => {
          const next = { ...prev }
          data.forEach(r => { if (!(r.id in next)) next[r.id] = r.manager_note ?? '' })
          return next
        })
      })
      .catch(e => setError(e.message ?? 'Ошибка загрузки'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load(page, statusFilter) }, [page, statusFilter, load])

  function emailByToken(token?: string) {
    if (!token) return null
    return tokens.find(t => t.token === token)?.email ?? null
  }

  async function changeStatus(id: number, status: ResponseStatus) {
    setUpdatingStatus(id)
    try {
      await updateResponseStatus(id, status)
      setRows(prev => prev.map(r => r.id === id ? { ...r, status } : r))
    } finally {
      setUpdatingStatus(null)
    }
  }

  async function saveNote(id: number) {
    setSavingNote(id)
    try {
      await updateManagerNote(id, noteValues[id] ?? '')
      setRows(prev => prev.map(r => r.id === id ? { ...r, manager_note: noteValues[id] } : r))
    } finally {
      setSavingNote(null)
    }
  }

  async function handleExport() {
    setExporting(true)
    try {
      const all = await getResponses(surveyId)
      exportToCSV(all, tokens)
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="adm-tab-content">
      <div className="adm-section-head">
        <div className="adm-section-title-row">
          <h2 className="adm-section-title">Заявки</h2>
          {!loading && <span className="adm-badge">{total}</span>}
        </div>
        <div className="adm-head-actions">
          <motion.button
            className="adm-btn-ghost adm-btn-export"
            onClick={handleExport}
            disabled={exporting || loading}
            whileTap={{ scale: 0.97 }}
            title="Экспортировать в CSV"
          >
            {exporting ? <span className="adm-spinner" /> : <><CsvIcon /> CSV</>}
          </motion.button>
          <button className="adm-btn-ghost" onClick={() => load(page, statusFilter)} disabled={loading}>
            {loading ? <span className="adm-spinner" /> : 'Обновить'}
          </button>
        </div>
      </div>

      {/* Status filter */}
      <Tabs
        value={statusFilter}
        onChange={(_, v) => { setStatusFilter(v); setPage(0); setExpanded(null) }}
        sx={{ mb: 2 }}
        TabIndicatorProps={{ children: <span /> }}
      >
        <Tab value="all"         label="Все" />
        <Tab value="new"         label="Новые" />
        <Tab value="called"      label="Позвонили" />
        <Tab value="in_progress" label="В работе" />
        <Tab value="closed"      label="Закрыто" />
      </Tabs>

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
        {rows.map((row, idx) => {
          const rowStatus: ResponseStatus = (row.status as ResponseStatus) ?? 'new'
          const statusCfg = STATUS_CONFIG[rowStatus]
          const tokenEmail = emailByToken(row.token)
          const displayEmail = row.email || tokenEmail
          return (
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
                  <span className="adm-response-num">#{total - page * PAGE_SIZE - idx}</span>
                  <div className="adm-response-id-block">
                    <p className="adm-response-name">{row.name}</p>
                    <p className="adm-response-meta-line">
                      <span className="adm-response-meta-item">{row.phone}</span>
                      {displayEmail && (
                        <>
                          <span className="adm-response-meta-sep" aria-hidden>·</span>
                          <span className="adm-response-meta-item adm-response-meta-item--mail">{displayEmail}</span>
                        </>
                      )}
                    </p>
                  </div>
                </div>
                <div className="adm-response-right">
                  <StatusBadge status={rowStatus} />
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
                      {row.token && tokenEmail && row.email && row.email.trim() !== tokenEmail.trim() && (
                        <div className="adm-response-extra-meta">
                          <span className="adm-response-extra-label">Персональная ссылка</span>
                          <span className="adm-response-extra-value">{tokenEmail}</span>
                          <span className="adm-response-extra-hint">отличается от email в форме</span>
                        </div>
                      )}

                      <section className="adm-response-section">
                        <h3 className="adm-response-section-title">Ответы анкеты</h3>
                        <div className="adm-response-answers">
                          {row.answers && Object.keys(row.answers).length > 0
                            ? survey.config.questions.map(q => {
                                const ans = row.answers![q.id]
                                if (ans === undefined || ans === null || ans === '' || (Array.isArray(ans) && ans.length === 0)) return null
                                const otherText = row.answers![q.id + '__other'] as string | undefined
                                let val: string
                                if (Array.isArray(ans)) {
                                  val = ans
                                    .map(v => v === '__other__' ? (otherText ? `Другое: ${otherText}` : 'Другое') : v)
                                    .join(', ')
                                } else if (ans === '__other__') {
                                  val = otherText ? `Другое: ${otherText}` : 'Другое'
                                } else {
                                  val = String(ans)
                                }
                                return <AnswerBlock key={q.id} title={q.title} value={val} />
                              })
                            : (
                              <>
                                <AnswerBlock title="Текущий статус" value={CURRENT_LABELS[row.current_crm] ?? row.current_crm} />
                                <AnswerBlock title="Цель CRM" value={row.crm_purpose?.filter(Boolean).join(', ') || '—'} />
                                <AnswerBlock title="Использовали раньше" value={row.crm_used_before?.filter(Boolean).join(', ') || '—'} />
                              </>
                            )}
                          {row.comment && (
                            <AnswerBlock title="Комментарий клиента" value={row.comment} />
                          )}
                        </div>
                      </section>

                      <section className="adm-response-section">
                        <h3 className="adm-response-section-title">Статус заявки</h3>
                        <div className="adm-status-row adm-status-row--full">
                          <div className="adm-status-btns">
                            {STATUS_ORDER.map(s => (
                              <button
                                key={s}
                                type="button"
                                className={`adm-status-btn ${STATUS_CONFIG[s].cls} ${rowStatus === s ? 'adm-status-btn--active' : ''}`}
                                onClick={() => rowStatus !== s && changeStatus(row.id, s)}
                                disabled={updatingStatus === row.id}
                              >
                                <span className="adm-status-dot" />
                                {STATUS_CONFIG[s].label}
                              </button>
                            ))}
                          </div>
                        </div>
                      </section>

                      <section className="adm-response-section">
                        <div className="adm-manager-note-head">
                          <label className="adm-manager-note-title" htmlFor={`note-${row.id}`}>Заметка менеджера</label>
                          <span className="adm-manager-note-hint">Только для команды, в CSV попадает отдельной колонкой</span>
                        </div>
                        <div className="adm-manager-note">
                          <textarea
                            id={`note-${row.id}`}
                            className="adm-note-textarea"
                            placeholder="Краткий контекст звонка, договорённости…"
                            value={noteValues[row.id] ?? ''}
                            onChange={e => setNoteValues(prev => ({ ...prev, [row.id]: e.target.value }))}
                            rows={3}
                          />
                          <div className="adm-note-actions">
                            <button
                              type="button"
                              className="adm-btn-save-note"
                              onClick={() => saveNote(row.id)}
                              disabled={savingNote === row.id}
                            >
                              {savingNote === row.id ? <span className="adm-spinner adm-spinner--sm" /> : 'Сохранить заметку'}
                            </button>
                          </div>
                        </div>
                      </section>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )
        })}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <Pagination
          count={totalPages}
          page={page + 1}
          onChange={(_, p) => setPage(p - 1)}
          disabled={loading}
          shape="rounded"
          size="small"
        />
      )}
    </div>
  )
}

function AnswerBlock({ title, value }: { title: string; value: string }) {
  return (
    <div className="adm-qa-block">
      <div className="adm-qa-q">{title}</div>
      <div className="adm-qa-a">{value}</div>
    </div>
  )
}

function CsvIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M2 2h6l3 3v7H2V2z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
      <path d="M8 2v3h3" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
      <path d="M4 8h6M4 10h4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
    </svg>
  )
}
