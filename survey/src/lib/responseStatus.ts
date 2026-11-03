import type { ResponseStatus } from './supabase'

export const STATUS_CONFIG: Record<ResponseStatus, { label: string; cls: string }> = {
  new:         { label: 'Новая',      cls: 'adm-status--new' },
  called:      { label: 'Позвонили',  cls: 'adm-status--called' },
  in_progress: { label: 'В работе',   cls: 'adm-status--progress' },
  closed:      { label: 'Закрыто',    cls: 'adm-status--closed' },
}

export const STATUS_ORDER: ResponseStatus[] = ['new', 'called', 'in_progress', 'closed']
