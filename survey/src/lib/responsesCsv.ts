import { responseQuestions, responseSchemaKey, responseSchemaLabel } from '../domain/responseHistory.ts'
import type { SurveyRecord, TokenRecord, SurveyConfigData } from './supabase'

const statuses: Record<string, string> = { new: 'Новая', called: 'Позвонили', in_progress: 'В работе', closed: 'Закрыто' }
const currentLabels: Record<string, string> = { yes: 'Да, используем CRM', no: 'Нет, работаем без CRM', looking: 'Выбираем CRM прямо сейчас', switching: 'Хотим сменить текущую' }

function cell(value: unknown): string {
  let text = String(value ?? '')
  if (/^[\s]*[=+@-]/.test(text) || /^[\t\r\n]/.test(text)) text = `'${text}`
  return `"${text.replace(/"/g, '""')}"`
}

export function buildResponsesCsv(rows: SurveyRecord[], tokens: TokenRecord[], config: SurveyConfigData): string {
  const tokenMap = new Map(tokens.map(token => [token.token, token.email]))
  const questions = new Map<string, { id: string; title: string; schema: string }>()
  for (const row of rows) for (const question of responseQuestions(row)) {
    if (row.answers?.[question.id] === undefined) continue
    const schema = responseSchemaKey(row)
    questions.set(schema + ':' + question.id, { id: question.id, schema, title: question.title + ' · ' + responseSchemaLabel(row) })
  }
  if (!rows.length) for (const q of config.questions ?? []) questions.set(q.id, { id: q.id, schema: '', title: q.title })
  const headers = ['ID', 'Дата', 'Имя', 'Телефон', 'Email', 'Email (токен)', 'Статус',
    'Цель CRM', 'Использовали раньше', 'Текущая ситуация', 'Комментарий', 'Заметка менеджера', 'Схема ответа', ...[...questions.values()].map(q => q.title)]
  const lines = [headers.map(cell).join(';')]
  for (const row of rows) {
    const answers = [...questions.values()].map(({ id, schema }) => {
      if (schema !== responseSchemaKey(row)) return ''
      const raw = row.answers?.[id]
      const values = Array.isArray(raw) ? raw : [raw]
      return values.map(value => value === '__other__' ? row.answers?.[`${id}__other`] || 'Другое' : value ?? '').join(', ')
    })
    lines.push([row.id, new Date(row.created_at).toLocaleString('ru-RU'), row.name, row.phone, row.email,
      row.token ? tokenMap.get(row.token) : '', statuses[row.status] ?? row.status,
      (row.crm_purpose ?? []).join(', '), (row.crm_used_before ?? []).join(', '),
      currentLabels[row.current_crm] ?? row.current_crm, row.comment, row.manager_note, responseSchemaLabel(row), ...answers].map(cell).join(';'))
  }
  return '\uFEFF' + lines.join('\r\n')
}
