import type { SurveyConfigData, SurveyQuestion, SurveyRecord } from '../../domain/models'
import { responseQuestions, responseSchemaKey, responseSchemaLabel } from '../../domain/responseHistory.ts'
const TEXT_ANSWER_TOP = 14

export function buildLegacySections(responses: SurveyRecord[]) {
  const sections = { purpose: new Map<string, number>(), usedBefore: new Map<string, number>(), current: new Map<string, number>() }
  for (const row of responses) {
    const labels = row.config_snapshot?.legacy_analytics
    const schema = responseSchemaLabel(row)
    const add = (section: Map<string, number>, title: string, values: string[]) => {
      for (const value of values.filter(value => value?.trim())) {
        const key = `${title} · ${schema}: ${value}`
        section.set(key, (section.get(key) ?? 0) + 1)
      }
    }
    add(sections.purpose, labels?.purpose_title ?? 'Цель CRM', row.crm_purpose ?? [])
    add(sections.usedBefore, labels?.used_before_title ?? 'Предыдущая CRM', row.crm_used_before ?? [])
    const current = row.current_crm?.trim()
    if (current) add(sections.current, labels?.current_title ?? 'Текущая ситуация', [labels?.current_value_labels?.[current] ?? current])
  }
  const sorted = (values: Map<string, number>) => [...values].sort((a, b) => b[1] - a[1])
  return { purpose: sorted(sections.purpose), usedBefore: sorted(sections.usedBefore), current: sorted(sections.current) }
}

type QuestionAgg = { questionId: string; title: string; items: [string, number][] }

function aggregateChoiceQuestion(
  q: SurveyQuestion,
  responses: SurveyRecord[],
): QuestionAgg | null {
  if (q.type !== 'checkbox' && q.type !== 'radio' && q.type !== 'scale') {
    return null
  }

  const counts: Record<string, number> = {}
  let any = false

  for (const r of responses) {
    const raw = r.answers?.[q.id]
    if (raw === undefined || raw === null) continue

    if (q.type === 'checkbox') {
      const arr = Array.isArray(raw) ? raw : []
      for (const v of arr) {
        if (v === undefined || v === null || v === '') continue
        any = true
        let label: string
        if (v === '__other__') {
          const o = String(r.answers?.[`${q.id}__other`] ?? '').trim()
          label = o ? `Другое: ${o}` : 'Другое'
        } else {
          label = String(v)
        }
        counts[label] = (counts[label] ?? 0) + 1
      }
    } else {
      const s = String(raw).trim()
      if (!s) continue
      any = true
      const label =
        s === '__other__'
          ? (() => {
              const o = String(r.answers?.[`${q.id}__other`] ?? '').trim()
              return o ? `Другое: ${o}` : 'Другое'
            })()
          : s
      counts[label] = (counts[label] ?? 0) + 1
    }
  }

  if (!any) return null
  const items = Object.entries(counts).sort((a, b) => b[1] - a[1])
  return { questionId: q.id, title: q.title, items }
}

function aggregateTextQuestion(
  q: SurveyQuestion,
  responses: SurveyRecord[],
): QuestionAgg | null {
  if (q.type !== 'text') return null

  const counts: Record<string, number> = {}
  for (const r of responses) {
    const raw = r.answers?.[q.id]
    if (raw === undefined || raw === null) continue
    const s = String(raw).trim()
    if (!s) continue
    counts[s] = (counts[s] ?? 0) + 1
  }

  const entries = Object.entries(counts).sort((a, b) => b[1] - a[1])
  if (entries.length === 0) return null

  let items: [string, number][]
  if (entries.length <= TEXT_ANSWER_TOP) {
    items = entries.map(([text, n]) => {
      const label = text.length > 100 ? `${text.slice(0, 97)}…` : text
      return [label, n] as [string, number]
    })
  } else {
    const head = entries.slice(0, TEXT_ANSWER_TOP).map(([text, n]) => {
      const label = text.length > 100 ? `${text.slice(0, 97)}…` : text
      return [label, n] as [string, number]
    })
    const restN = entries.slice(TEXT_ANSWER_TOP).reduce((s, [, c]) => s + c, 0)
    const restK = entries.length - TEXT_ANSWER_TOP
    items = [...head, [`Остальные формулировки (${restK})`, restN]]
  }

  return { questionId: q.id, title: q.title, items }
}

export function buildQuestionSections(_config: SurveyConfigData, responses: SurveyRecord[]): QuestionAgg[] {
  const groups = new Map<string, { row: SurveyRecord; question: SurveyQuestion; rows: SurveyRecord[] }>()
  for (const row of responses) for (const question of responseQuestions(row)) {
    if (row.answers?.[question.id] === undefined) continue
    const key = responseSchemaKey(row) + ':' + question.id + ':' + question.type
    const group = groups.get(key)
    if (group) group.rows.push(row)
    else groups.set(key, { row, question, rows: [row] })
  }
  const out: QuestionAgg[] = []
  for (const [key, group] of groups) {
    const aggregate = aggregateChoiceQuestion(group.question, group.rows) ?? aggregateTextQuestion(group.question, group.rows)
    if (aggregate) out.push({ ...aggregate, questionId: key, title: group.question.title + ' · ' + responseSchemaLabel(group.row) })
  }
  return out
}
