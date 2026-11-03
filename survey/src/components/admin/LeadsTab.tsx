import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Pagination from '@mui/material/Pagination'
import Tabs from '@mui/material/Tabs'
import Tab from '@mui/material/Tab'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import Button from '@mui/material/Button'
import TextField from '@mui/material/TextField'
import {
  getLeadProjects,
  createLeadProject,
  updateLeadProject,
  deleteLeadProject,
  getManualLeadsPaged,
  createManualLead,
  updateManualLead,
  deleteManualLead,
  PAGE_SIZE,
} from '../../lib/api-client'
import type { LeadProjectRecord, ManualLeadRecord, ResponseStatus } from '../../lib/api-client'
import { STATUS_CONFIG, STATUS_ORDER } from '../../lib/responseStatus'
import { ResponsesTabSkeleton } from './AdminSkeletons'

const expandTransition = {
  height: { type: 'spring' as const, bounce: 0, stiffness: 240, damping: 38, mass: 0.9 },
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('ru-RU', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function StatusBadge({ status }: { status: ResponseStatus }) {
  const cfg = STATUS_CONFIG[status]
  return (
    <span className={`adm-status-badge ${cfg.cls}`}>
      <span className="adm-status-dot" />
      {cfg.label}
    </span>
  )
}

// ── Экран списка проектов ──────────────────────────────────────

type ProjectDialogState =
  | { mode: 'closed' }
  | { mode: 'create' }
  | { mode: 'edit'; project: LeadProjectRecord }

function ProjectsScreen({
  onOpen,
}: {
  onOpen: (project: LeadProjectRecord) => void
}) {
  const [projects, setProjects] = useState<LeadProjectRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [dialog, setDialog] = useState<ProjectDialogState>({ mode: 'closed' })
  const [formName, setFormName] = useState('')
  const [formDesc, setFormDesc] = useState('')
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<number | null>(null)

  const load = useCallback(() => {
    setLoading(true)
    setError('')
    getLeadProjects()
      .then(setProjects)
      .catch(e => setError(e.message ?? 'Ошибка загрузки'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    let active = true
    void Promise.resolve().then(() => { if (active) load() })
    return () => { active = false }
  }, [load])

  function openCreate() {
    setFormName('')
    setFormDesc('')
    setDialog({ mode: 'create' })
  }

  function openEdit(p: LeadProjectRecord) {
    setFormName(p.name)
    setFormDesc(p.description ?? '')
    setDialog({ mode: 'edit', project: p })
  }

  function closeDialog() {
    if (!saving) setDialog({ mode: 'closed' })
  }

  async function handleSave() {
    const name = formName.trim()
    if (!name) return
    setSaving(true)
    try {
      if (dialog.mode === 'create') {
        const p = await createLeadProject({ name, description: formDesc.trim() || undefined })
        setProjects(prev => [p, ...prev])
      } else if (dialog.mode === 'edit') {
        const p = await updateLeadProject(dialog.project.id, {
          name,
          description: formDesc.trim() || null,
        })
        setProjects(prev => prev.map(x => x.id === p.id ? p : x))
      }
      setDialog({ mode: 'closed' })
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(p: LeadProjectRecord) {
    if (!window.confirm(`Удалить проект «${p.name}»? Заявки останутся, но потеряют привязку.`)) return
    setDeletingId(p.id)
    try {
      await deleteLeadProject(p.id)
      setProjects(prev => prev.filter(x => x.id !== p.id))
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="adm-tab-content">
      <div className="adm-section-head">
        <div className="adm-section-title-row">
          <h2 className="adm-section-title">Проекты</h2>
          {!loading && <span className="adm-badge">{projects.length}</span>}
        </div>
        <div className="adm-head-actions">
          <motion.button
            className="adm-btn-primary"
            onClick={openCreate}
            whileTap={{ scale: 0.97 }}
            type="button"
          >
            + Новый проект
          </motion.button>
          <button className="adm-btn-ghost" onClick={load} disabled={loading} type="button">
            {loading ? <span className="adm-spinner" /> : 'Обновить'}
          </button>
        </div>
      </div>

      <p className="adm-leads-hint">
        Создайте проект — контейнер для заявок одной кампании или выставки. Заявки добавляются внутри проекта.
      </p>

      {error && <p className="adm-err-banner">{error}</p>}
      {loading && <ResponsesTabSkeleton />}

      {!loading && projects.length === 0 && !error && (
        <div className="adm-empty">
          <p>Проектов пока нет</p>
          <span>Нажмите «+ Новый проект», чтобы начать</span>
        </div>
      )}

      <div className="adm-lead-projects-grid">
        {projects.map(p => (
          <button
            key={p.id}
            type="button"
            className="adm-lead-project-card"
            onClick={() => onOpen(p)}
          >
            <div className="adm-lead-project-card-header">
              <div className="adm-lead-project-icon">
                <FolderIcon />
              </div>
              <div className="adm-lead-project-actions" onClick={e => e.stopPropagation()}>
                <button
                  type="button"
                  className="adm-icon-btn"
                  title="Переименовать"
                  onClick={() => openEdit(p)}
                >
                  <EditSmIcon />
                </button>
                <button
                  type="button"
                  className="adm-icon-btn adm-icon-btn--danger"
                  title="Удалить проект"
                  disabled={deletingId === p.id}
                  onClick={() => handleDelete(p)}
                >
                  <TrashSmIcon />
                </button>
              </div>
            </div>
            <div className="adm-lead-project-name">{p.name}</div>
            {p.description && (
              <div className="adm-lead-project-desc">{p.description}</div>
            )}
            <div className="adm-lead-project-footer">
              <span className="adm-lead-project-count">
                {p.lead_count ?? 0} {pluralLeads(Number(p.lead_count ?? 0))}
              </span>
              <span className="adm-lead-project-date">{formatDate(p.created_at)}</span>
            </div>
          </button>
        ))}
      </div>

      <Dialog open={dialog.mode !== 'closed'} onClose={closeDialog} maxWidth="xs" fullWidth>
        <DialogTitle>{dialog.mode === 'edit' ? 'Редактировать проект' : 'Новый проект'}</DialogTitle>
        <DialogContent className="adm-dialog-fields">
          <TextField
            autoFocus
            margin="dense"
            label="Название проекта"
            fullWidth
            required
            value={formName}
            onChange={e => setFormName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && formName.trim()) handleSave() }}
          />
          <TextField
            margin="dense"
            label="Описание (необязательно)"
            fullWidth
            multiline
            minRows={2}
            value={formDesc}
            onChange={e => setFormDesc(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDialog} disabled={saving}>Отмена</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving || !formName.trim()}>
            {saving ? '…' : 'Сохранить'}
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  )
}

// ── Экран заявок внутри проекта ────────────────────────────────

type LeadFormState = {
  full_name: string
  email: string
  organization: string
  phone: string
  comment: string
}

const emptyLeadForm = (): LeadFormState => ({
  full_name: '',
  email: '',
  organization: '',
  phone: '',
  comment: '',
})

function LeadsScreen({
  project,
  onBack,
}: {
  project: LeadProjectRecord
  onBack: () => void
}) {
  const [rows, setRows] = useState<ManualLeadRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [expanded, setExpanded] = useState<number | null>(null)
  const [statusFilter, setStatusFilter] = useState<ResponseStatus | 'all'>('all')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<ManualLeadRecord | null>(null)
  const [form, setForm] = useState<LeadFormState>(emptyLeadForm)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [noteValues, setNoteValues] = useState<Record<number, string>>({})
  const [updatingStatus, setUpdatingStatus] = useState<number | null>(null)

  const totalPages = Math.ceil(total / PAGE_SIZE)

  const load = useCallback((p: number, filter: ResponseStatus | 'all') => {
    setLoading(true)
    setError('')
    getManualLeadsPaged(p, PAGE_SIZE, filter, project.id)
      .then(({ data, total: t }) => {
        setRows(data)
        setTotal(t)
        setNoteValues(prev => {
          const next = { ...prev }
          data.forEach(r => { if (!(r.id in next)) next[r.id] = r.manager_note ?? '' })
          return next
        })
      })
      .catch(e => setError(e.message ?? 'Ошибка загрузки'))
      .finally(() => setLoading(false))
  }, [project.id])

  useEffect(() => {
    let active = true
    void Promise.resolve().then(() => { if (active) load(page, statusFilter) })
    return () => { active = false }
  }, [page, statusFilter, load])

  function openCreate() {
    setEditing(null)
    setForm(emptyLeadForm())
    setDialogOpen(true)
  }

  function openEdit(row: ManualLeadRecord) {
    setEditing(row)
    setForm({
      full_name: row.full_name,
      email: row.email,
      organization: row.organization,
      phone: row.phone,
      comment: row.comment ?? '',
    })
    setDialogOpen(true)
  }

  async function handleSave() {
    const name = form.full_name.trim()
    if (!name) return
    setSaving(true)
    try {
      if (editing) {
        const updated = await updateManualLead(editing.id, {
          full_name: name,
          email: form.email.trim(),
          organization: form.organization.trim(),
          phone: form.phone.trim(),
          comment: form.comment.trim() || null,
        })
        setRows(prev => prev.map(r => r.id === updated.id ? updated : r))
      } else {
        const created = await createManualLead({
          project_id: project.id,
          full_name: name,
          email: form.email.trim(),
          organization: form.organization.trim(),
          phone: form.phone.trim(),
          comment: form.comment.trim() || undefined,
        })
        setDialogOpen(false)
        setPage(0)
        setStatusFilter('all')
        load(0, 'all')
        setExpanded(created.id)
        return
      }
      setDialogOpen(false)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: number) {
    if (!window.confirm('Удалить эту заявку?')) return
    setDeletingId(id)
    try {
      await deleteManualLead(id)
      setRows(prev => prev.filter(r => r.id !== id))
      setTotal(t => Math.max(0, t - 1))
      setExpanded(null)
    } finally {
      setDeletingId(null)
    }
  }

  async function changeStatus(id: number, status: ResponseStatus) {
    setUpdatingStatus(id)
    try {
      const updated = await updateManualLead(id, { status })
      setRows(prev => prev.map(r => r.id === id ? updated : r))
    } finally {
      setUpdatingStatus(null)
    }
  }

  async function saveNote(id: number) {
    const note = noteValues[id] ?? ''
    const updated = await updateManualLead(id, { manager_note: note.trim() || null })
    setRows(prev => prev.map(r => r.id === id ? updated : r))
  }

  return (
    <div className="adm-tab-content">
      <div className="adm-section-head">
        <div className="adm-section-title-row">
          <button type="button" className="adm-back-btn" onClick={onBack} title="Назад к проектам">
            <BackArrowIcon />
          </button>
          <h2 className="adm-section-title">{project.name}</h2>
          {!loading && <span className="adm-badge">{total}</span>}
        </div>
        <div className="adm-head-actions">
          <motion.button
            className="adm-btn-primary"
            onClick={openCreate}
            whileTap={{ scale: 0.97 }}
            type="button"
          >
            + Добавить заявку
          </motion.button>
          <button className="adm-btn-ghost" onClick={() => load(page, statusFilter)} disabled={loading} type="button">
            {loading ? <span className="adm-spinner" /> : 'Обновить'}
          </button>
        </div>
      </div>

      {project.description && (
        <p className="adm-leads-hint">{project.description}</p>
      )}

      <Tabs
        value={statusFilter}
        onChange={(_, v) => { setStatusFilter(v); setPage(0); setExpanded(null) }}
        sx={{ mb: 2 }}
      >
        <Tab value="all"         label="Все" />
        <Tab value="new"         label="Новые" />
        <Tab value="called"      label="Позвонили" />
        <Tab value="in_progress" label="В работе" />
        <Tab value="closed"      label="Закрыто" />
      </Tabs>

      {error && <p className="adm-err-banner">{error}</p>}
      {loading && <ResponsesTabSkeleton />}

      {!loading && rows.length === 0 && !error && (
        <div className="adm-empty">
          <p>Заявок пока нет</p>
          <span>Нажмите «+ Добавить заявку», чтобы внести первый контакт</span>
        </div>
      )}

      <div className="adm-responses-list">
        {rows.map((row, idx) => (
          <div
            key={row.id}
            className={`adm-card adm-response-card ${expanded === row.id ? 'adm-card--open' : ''}`}
          >
            <button
              type="button"
              className="adm-response-header"
              onClick={() => setExpanded(expanded === row.id ? null : row.id)}
            >
              <div className="adm-response-left">
                <span className="adm-response-num">#{total - page * PAGE_SIZE - idx}</span>
                <div className="adm-response-id-block">
                  <p className="adm-response-name">{row.full_name || '—'}</p>
                  <p className="adm-response-meta-line">
                    {row.organization && <span className="adm-response-meta-item">{row.organization}</span>}
                    {row.phone && (
                      <>
                        {row.organization && <span className="adm-response-meta-sep" aria-hidden>·</span>}
                        <span className="adm-response-meta-item">{row.phone}</span>
                      </>
                    )}
                    {row.email && (
                      <>
                        <span className="adm-response-meta-sep" aria-hidden>·</span>
                        <span className="adm-response-meta-item adm-response-meta-item--mail">{row.email}</span>
                      </>
                    )}
                  </p>
                </div>
              </div>
              <div className="adm-response-right">
                <StatusBadge status={row.status} />
                <span className="adm-response-date">{formatDate(row.created_at)}</span>
                <span className={`adm-chevron ${expanded === row.id ? 'adm-chevron--open' : ''}`}>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
                    <path d="M3 5l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </span>
              </div>
            </button>

            <AnimatePresence initial={false}>
              {expanded === row.id && (
                <motion.div
                  className="adm-response-body"
                  initial={{ height: 0 }}
                  animate={{ height: 'auto' }}
                  exit={{ height: 0 }}
                  transition={expandTransition}
                >
                  <div className="adm-response-body-inner">
                    {row.comment && (
                      <section className="adm-response-section">
                        <h3 className="adm-response-section-title">Комментарий</h3>
                        <p className="adm-qa-a">{row.comment}</p>
                      </section>
                    )}

                    <section className="adm-response-section">
                      <h3 className="adm-response-section-title">Статус заявки</h3>
                      <div className="adm-status-row adm-status-row--full">
                        <div className="adm-status-btns">
                          {STATUS_ORDER.map(s => (
                            <button
                              key={s}
                              type="button"
                              className={`adm-status-btn ${STATUS_CONFIG[s].cls} ${row.status === s ? 'adm-status-btn--active' : ''}`}
                              onClick={() => row.status !== s && changeStatus(row.id, s)}
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
                        <label className="adm-manager-note-title" htmlFor={`lead-note-${row.id}`}>Заметка менеджера</label>
                      </div>
                      <div className="adm-manager-note">
                        <textarea
                          id={`lead-note-${row.id}`}
                          className="adm-note-textarea"
                          placeholder="Краткий контекст звонка, договорённости…"
                          value={noteValues[row.id] ?? ''}
                          onChange={e => setNoteValues(prev => ({ ...prev, [row.id]: e.target.value }))}
                          rows={3}
                        />
                        <div className="adm-note-actions">
                          <button type="button" className="adm-btn-save-note" onClick={() => saveNote(row.id)}>
                            Сохранить заметку
                          </button>
                        </div>
                      </div>
                    </section>

                    <div className="adm-note-actions" style={{ justifyContent: 'flex-start', gap: 12 }}>
                      <button type="button" className="adm-btn-ghost" onClick={() => openEdit(row)}>Редактировать</button>
                      <button
                        type="button"
                        className="adm-btn-danger"
                        disabled={deletingId === row.id}
                        onClick={() => handleDelete(row.id)}
                      >
                        {deletingId === row.id ? '…' : 'Удалить'}
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>

      {totalPages > 1 && (
        <Pagination
          className="adm-pagination"
          count={totalPages}
          page={page + 1}
          onChange={(_, p) => setPage(p - 1)}
          color="primary"
          shape="rounded"
        />
      )}

      <Dialog open={dialogOpen} onClose={() => !saving && setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editing ? 'Редактирование заявки' : 'Новая заявка'}</DialogTitle>
        <DialogContent className="adm-dialog-fields">
          <TextField autoFocus margin="dense" label="ФИО" fullWidth required
            value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} />
          <TextField margin="dense" label="Организация" fullWidth
            value={form.organization} onChange={e => setForm(f => ({ ...f, organization: e.target.value }))} />
          <TextField margin="dense" label="Email" fullWidth type="email"
            value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
          <TextField margin="dense" label="Телефон" fullWidth
            value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
          <TextField margin="dense" label="Комментарий" fullWidth multiline minRows={2}
            value={form.comment} onChange={e => setForm(f => ({ ...f, comment: e.target.value }))} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)} disabled={saving}>Отмена</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving || !form.full_name.trim()}>
            {saving ? '…' : 'Сохранить'}
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  )
}

// ── Корневой компонент ─────────────────────────────────────────

export function LeadsTab() {
  const [activeProject, setActiveProject] = useState<LeadProjectRecord | null>(null)

  return (
    <AnimatePresence mode="wait">
      {activeProject === null ? (
        <motion.div
          key="projects"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.18 }}
        >
          <ProjectsScreen onOpen={setActiveProject} />
        </motion.div>
      ) : (
        <motion.div
          key={`project-${activeProject.id}`}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.18 }}
        >
          <LeadsScreen project={activeProject} onBack={() => setActiveProject(null)} />
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// ── Утилиты ────────────────────────────────────────────────────

function pluralLeads(n: number) {
  if (n % 100 >= 11 && n % 100 <= 14) return 'заявок'
  const r = n % 10
  if (r === 1) return 'заявка'
  if (r >= 2 && r <= 4) return 'заявки'
  return 'заявок'
}

// ── Иконки ────────────────────────────────────────────────────

function FolderIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/>
    </svg>
  )
}

function EditSmIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
      <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
    </svg>
  )
}

function TrashSmIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <polyline points="3 6 5 6 21 6"/>
      <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
      <path d="M10 11v6M14 11v6"/>
      <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
    </svg>
  )
}

function BackArrowIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <polyline points="15 18 9 12 15 6"/>
    </svg>
  )
}
