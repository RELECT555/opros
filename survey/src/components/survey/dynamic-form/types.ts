import type { SurveyQuestion } from '../../../lib/supabase'

export type DynamicAnswerValue = string | string[]

export interface DynamicFormData {
  answers: Record<string, DynamicAnswerValue>
  name: string
  phone: string
  email: string
  comment: string
  /** Состояние галочек согласия по id из contacts_block.consents */
  consentChecks: Record<string, boolean>
}

export type DynamicFormStatus = 'idle' | 'loading' | 'done' | 'error'

export type DynamicSetForm = (next: DynamicFormData) => void

export function emptyDynamicFormData(questions: SurveyQuestion[]): DynamicFormData {
  const answers: Record<string, DynamicAnswerValue> = {}
  for (const q of questions) {
    answers[q.id] = q.type === 'checkbox' ? [] : ''
    if (q.hasOther) answers[q.id + '__other'] = ''
  }
  return { answers, name: '', phone: '', email: '', comment: '', consentChecks: {} }
}
