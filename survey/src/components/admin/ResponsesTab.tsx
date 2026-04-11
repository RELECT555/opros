import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence, easeOut } from 'framer-motion'
import {
  getResponsesPaged, getResponses, getTokens,
  updateResponseStatus, updateManagerNote, PAGE_SIZE,
} from '../../lib/supabase'
import type { SurveyRecord, TokenRecord, ResponseStatus } from '../../lib/supabase'
import { DataRow } from './shared'

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
  a.download = `opros_${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export function ResponsesTab() {
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

  const totalPages = Math.ceil(total / PAGE_SIZE)

  const load = useCallback((p: number) => {
    setLoading(true)
    setError('')
    Promise.all([getResponsesPaged(p), getTokens()])
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

  useEffect(() => { load(page) }, [page, load])

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
      const all = await getResponses()
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
          <button className="adm-btn-ghost" onClick={() => load(page)} disabled={loading}>
            {loading ? <span className="adm-spinner" /> : 'Обновить'}
          </button>
        </div>
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
                  <div>
                    <p className="adm-response-name">{row.name}</p>
                    <p className="adm-response-phone">{row.phone}</p>
                    {displayEmail && <p className="adm-response-email">{displayEmail}</p>}
                  </div>
                </div>
                <div className="adm-response-right">
                  <span className={`adm-status-badge ${statusCfg.cls}`}>{statusCfg.label}</span>
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
                      {row.email && <DataRow label="Email" value={row.email} highlight />}
                      {tokenEmail && <DataRow label="Email (источник)" value={tokenEmail} highlight />}
                      <div className="adm-divider" />
                      <DataRow label="Текущий статус" value={CURRENT_LABELS[row.current_crm] ?? row.current_crm} />
                      <DataRow label="Цель CRM" value={row.crm_purpose.join(', ')} />
                      <DataRow label="Использовали раньше" value={row.crm_used_before.join(', ')} />
                      {row.comment && <DataRow label="Комментарий клиента" value={row.comment} />}

                      <div className="adm-divider" />
                      {/* Заметка менеджера */}
                      <div className="adm-manager-note">
                        <label className="adm-data-label" htmlFor={`note-${row.id}`}>Заметка менеджера</label>
                        <textarea
                          id={`note-${row.id}`}
                          className="adm-note-textarea"
                          placeholder="Добавьте заметку..."
                          value={noteValues[row.id] ?? ''}
                          onChange={e => setNoteValues(prev => ({ ...prev, [row.id]: e.target.value }))}
                          rows={2}
                        />
                        <button
                          className="adm-btn-save-note"
                          onClick={() => saveNote(row.id)}
                          disabled={savingNote === row.id}
                        >
                          {savingNote === row.id ? <span className="adm-spinner adm-spinner--sm" /> : 'Сохранить'}
                        </button>
                      </div>

                      <div className="adm-divider" />
                      <div className="adm-status-row">
                        <span className="adm-data-label">Изменить статус</span>
                        <div className="adm-status-btns">
                          {STATUS_ORDER.map(s => (
                            <button
                              key={s}
                              className={`adm-status-btn ${STATUS_CONFIG[s].cls} ${rowStatus === s ? 'adm-status-btn--active' : ''}`}
                              onClick={() => changeStatus(row.id, s)}
                              disabled={updatingStatus === row.id || rowStatus === s}
                            >
                              {updatingStatus === row.id && rowStatus !== s
                                ? <span className="adm-spinner adm-spinner--sm" />
                                : STATUS_CONFIG[s].label}
                            </button>
                          ))}
                        </div>
                      </div>
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
        <div className="adm-pagination">
          <button
            className="adm-btn-ghost adm-pag-btn"
            onClick={() => setPage(p => p - 1)}
            disabled={page === 0 || loading}
          >
            ← Назад
          </button>
          <span className="adm-pag-info">Стр. {page + 1} из {totalPages}</span>
          <button
            className="adm-btn-ghost adm-pag-btn"
            onClick={() => setPage(p => p + 1)}
            disabled={page >= totalPages - 1 || loading}
          >
            Вперёд →
          </button>
        </div>
      )}
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
