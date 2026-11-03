import type { SurveyConfigData, SurveyQuestion } from '../types/models.js'

type ContactValues = { name?: string; phone?: string; email?: string; comment?: string }

/** Validate only questions actually rendered to the respondent. */
export function respondentQuestions(config: SurveyConfigData): SurveyQuestion[] {
  const questions = config.questions ?? []
  if (config.editor_mode !== 'canvas' || !config.canvas?.pages?.length) return questions
  const byId = new Map(questions.map(question => [question.id, question]))
  const ids = new Set<string>()
  for (const page of config.canvas.pages) {
    if (page.role !== 'content') continue
    for (const block of page.blocks) {
      if (block.type === 'question' && byId.has(block.questionId)) ids.add(block.questionId)
    }
  }
  return [...ids].map(id => byId.get(id)!)
}

export function validateResponse(
  config: SurveyConfigData,
  answers: Record<string, unknown>,
  contacts: ContactValues,
): string | null {
  const questions = respondentQuestions(config)
  const allowed = new Set(questions.flatMap(q => q.hasOther ? [q.id, `${q.id}__other`] : [q.id]))
  if (Object.keys(answers).some(key => !allowed.has(key))) return 'Ответ содержит неизвестный вопрос'
  for (const q of questions) {
    const answer = answers[q.id]
    const invalid = `Проверьте ответ на вопрос «${q.title}»`
    if (q.type === 'checkbox') {
      if (!Array.isArray(answer) || !answer.length || answer.length > q.options.length + (q.hasOther ? 1 : 0)) return invalid
      if (new Set(answer).size !== answer.length || answer.some(value => typeof value !== 'string' || !(q.options.includes(value) || (q.hasOther && value === '__other__')))) return invalid
    } else {
      if (typeof answer !== 'string' || !answer.trim() || answer.length > 10_000) return invalid
      if (q.type === 'radio' && !(q.options.includes(answer) || (q.hasOther && answer === '__other__'))) return invalid
      if (q.type === 'scale') {
        const value = Number(answer)
        if (!Number.isInteger(value) || value < (q.scaleMin ?? 1) || value > (q.scaleMax ?? 10)) return invalid
      }
    }
    const other = answers[`${q.id}__other`]
    if (other !== undefined && (typeof other !== 'string' || other.length > 10_000)) return invalid
  }

  const block = config.contacts_block
  if (block?.disabled) return null
  for (const key of ['name', 'phone', 'email', 'comment'] as const) {
    const field = block?.[key]
    if (field?.enabled === false) continue
    const value = contacts[key]?.trim() ?? ''
    const required = field?.required ?? (key === 'name' || key === 'phone')
    if (required && !value) return 'Заполните обязательные контактные данные'
    if (value && key === 'phone' && !/^[\d\s+\-()]{7,}$/.test(value)) return 'Проверьте номер телефона'
    if (value && key === 'email' && !(value.length > 2 && value.includes('@') && value.includes('.'))) return 'Проверьте email'
  }
  return null
}
