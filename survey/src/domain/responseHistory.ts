import type { SurveyQuestion, SurveyRecord } from './models'

export function responseQuestions(row: SurveyRecord): SurveyQuestion[] {
  // A current schema cannot establish the original type/title of an old answer.
  const source = row.config_snapshot?.questions ?? []
  const questions = new Map(source.map(question => [question.id, question]))
  for (const [id, answer] of Object.entries(row.answers ?? {})) {
    if (id.endsWith('__other') || questions.has(id)) continue
    questions.set(id, { id, title: `${id} (без описания)`, type: Array.isArray(answer) ? 'checkbox' : 'text', options: [] })
  }
  return [...questions.values()].map(question => {
    const answer = row.answers?.[question.id]
    if (row.snapshot_source !== 'submission' && answer !== undefined && (Array.isArray(answer) !== (question.type === 'checkbox'))) {
      return { ...question, type: Array.isArray(answer) ? 'checkbox' as const : 'text' as const }
    }
    return question
  })
}

export function responseSchemaKey(row: SurveyRecord): string {
  return `${row.snapshot_source ?? 'unavailable'}:${row.survey_revision ?? 'unknown'}`
}

export function responseSchemaLabel(row: SurveyRecord): string {
  if (row.snapshot_source === 'submission' && row.survey_revision) return `версия ${row.survey_revision}`
  return row.snapshot_source === 'legacy_backfill' ? 'схема при миграции' : 'исходная схема неизвестна'
}
