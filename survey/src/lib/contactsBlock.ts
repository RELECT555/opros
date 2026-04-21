import type { ContactsBlockConfig, SurveyConsentItem } from './supabase'
import { phoneRegex } from '../components/survey/dynamic-form/utils'

/** Поля формы, нужные для шага контактов и галочек согласия */
export type ContactsFormSlice = {
  name: string
  phone: string
  email: string
  comment: string
  consentChecks: Record<string, boolean>
}

export type ContactFieldKey = 'name' | 'phone' | 'email' | 'comment'

export type ResolvedContactField = {
  enabled: boolean
  required: boolean
  label: string
  placeholder: string
  showOptionalHint: boolean
}

export type ResolvedContactsBlock = {
  disabled: boolean
  stepPillLabel: string
  stepPillDoneLabel: string
  title: string
  subtitle: string
  hideEmailWhenToken: boolean
  fields: Record<ContactFieldKey, ResolvedContactField>
  consents: SurveyConsentItem[]
  submitHintNeedConsents: string
  submitHintNeedContacts: string
}

const DEFAULT_CONSENTS: SurveyConsentItem[] = [
  {
    id: 'consent_pd',
    title: 'Согласие на обработку данных',
    description: 'Нажимая «Отправить», вы соглашаетесь с',
    linkUrl: '',
    linkLabel: 'политикой конфиденциальности',
    required: true,
  },
]

function pickStr(s: string | undefined): string | undefined {
  const t = s?.trim()
  return t ? t : undefined
}

function defaultField(
  key: ContactFieldKey,
  partial?: Partial<ResolvedContactField>,
): ResolvedContactField {
  const base: Record<ContactFieldKey, Omit<ResolvedContactField, 'showOptionalHint'> & { showOptionalHint: boolean }> = {
    name: {
      enabled: true,
      required: true,
      label: 'Ваше имя',
      placeholder: 'Иван Петров',
      showOptionalHint: false,
    },
    phone: {
      enabled: true,
      required: true,
      label: 'Телефон',
      placeholder: '+7 999 000 00 00',
      showOptionalHint: false,
    },
    email: {
      enabled: true,
      required: false,
      label: 'Email',
      placeholder: 'ivan@company.ru',
      showOptionalHint: true,
    },
    comment: {
      enabled: true,
      required: false,
      label: 'Комментарий',
      placeholder: 'Опишите задачу или вопрос...',
      showOptionalHint: true,
    },
  }
  const b = base[key]
  if (!partial) return { ...b }
  return {
    enabled: partial.enabled ?? b.enabled,
    required: partial.required ?? b.required,
    label: partial.label ?? b.label,
    placeholder: partial.placeholder ?? b.placeholder,
    showOptionalHint: partial.showOptionalHint ?? b.showOptionalHint,
  }
}

function normalizeConsent(raw: SurveyConsentItem): SurveyConsentItem {
  return {
    id: raw.id?.trim() || `consent_${Date.now()}`,
    title: raw.title?.trim() || 'Согласие',
    description: raw.description?.trim() ?? '',
    linkUrl: raw.linkUrl?.trim() || undefined,
    linkLabel: raw.linkLabel?.trim() || undefined,
    required: raw.required !== false,
  }
}

export function mergeContactsBlockConfig(raw?: ContactsBlockConfig): ResolvedContactsBlock {
  const consentsRaw =
    raw?.consents !== undefined ? raw.consents.map(normalizeConsent) : DEFAULT_CONSENTS.map(normalizeConsent)

  return {
    disabled: raw?.disabled === true,
    stepPillLabel: pickStr(raw?.step_pill_label) || 'Контакты',
    stepPillDoneLabel: pickStr(raw?.step_pill_done_label) || 'Готово',
    title: pickStr(raw?.title) || 'Оставьте контакты',
    subtitle: pickStr(raw?.subtitle) || 'Перезвоним в удобное время',
    hideEmailWhenToken: raw?.hide_email_when_token !== false,
    fields: {
      name: defaultField('name', {
        enabled: raw?.name?.enabled,
        required: raw?.name?.required,
        label: pickStr(raw?.name?.label),
        placeholder: pickStr(raw?.name?.placeholder),
      }),
      phone: defaultField('phone', {
        enabled: raw?.phone?.enabled,
        required: raw?.phone?.required,
        label: pickStr(raw?.phone?.label),
        placeholder: pickStr(raw?.phone?.placeholder),
      }),
      email: defaultField('email', {
        enabled: raw?.email?.enabled,
        required: raw?.email?.required,
        label: pickStr(raw?.email?.label),
        placeholder: pickStr(raw?.email?.placeholder),
        showOptionalHint: raw?.email?.show_optional_hint,
      }),
      comment: defaultField('comment', {
        enabled: raw?.comment?.enabled,
        required: raw?.comment?.required,
        label: pickStr(raw?.comment?.label),
        placeholder: pickStr(raw?.comment?.placeholder),
        showOptionalHint: raw?.comment?.show_optional_hint,
      }),
    },
    consents: consentsRaw,
    submitHintNeedConsents: raw?.submit_hint_need_consents?.trim() || 'Подтвердите согласие',
    submitHintNeedContacts: raw?.submit_hint_need_contacts?.trim() || 'Заполните контакты',
  }
}

export function emptyConsentChecks(resolved: ResolvedContactsBlock): Record<string, boolean> {
  const out: Record<string, boolean> = {}
  for (const c of resolved.consents) {
    out[c.id] = false
  }
  return out
}

function simpleEmailOk(v: string): boolean {
  const t = v.trim()
  return t.length > 2 && t.includes('@') && t.includes('.')
}

export function contactsStepComplete(form: ContactsFormSlice, block: ResolvedContactsBlock): boolean {
  if (block.disabled) return true
  const { fields } = block
  const keys = ['name', 'phone', 'email', 'comment'] as const
  if (!keys.some(k => fields[k].enabled)) return true

  for (const k of keys) {
    const f = fields[k]
    if (!f.enabled) continue
    const val = k === 'name' ? form.name : k === 'phone' ? form.phone : k === 'email' ? form.email : form.comment
    const t = val.trim()
    if (f.required) {
      if (k === 'phone') {
        if (!phoneRegex.test(t)) return false
      } else if (k === 'email') {
        if (!simpleEmailOk(val)) return false
      } else if (!t) {
        return false
      }
    } else {
      if (k === 'phone' && t && !phoneRegex.test(t)) return false
      if (k === 'email' && t && !simpleEmailOk(val)) return false
    }
  }
  return true
}

export function allRequiredConsentsChecked(form: ContactsFormSlice, block: ResolvedContactsBlock): boolean {
  if (block.disabled) return true
  for (const c of block.consents) {
    if (c.required && !form.consentChecks[c.id]) return false
  }
  return true
}

export function defaultConsentItemsForEditor(): SurveyConsentItem[] {
  return DEFAULT_CONSENTS.map(c => ({ ...c }))
}
