export type QuestionMediaKind = 'image' | 'video' | 'embed'

export type QuestionMedia = {
  kind: QuestionMediaKind
  /** Публичный URL (картинка, mp4/webm или страница для встраивания) */
  url: string
  /** Подпись к изображению / заголовок для iframe */
  alt?: string
}

export interface SurveyQuestion {
  id: string
  type: 'checkbox' | 'radio' | 'text' | 'scale'
  title: string
  subtitle?: string
  options: string[]
  hasOther?: boolean
  scaleMin?: number
  scaleMax?: number
  optionsLayout?: 'grid' | 'list'
  media?: QuestionMedia
}

export type SurveyTypeScale = 'compact' | 'normal' | 'large'
export type SurveyCtaStyle = 'gradient' | 'solid' | 'outline'
export type SurveyOrbIntensity = 'off' | 'low' | 'medium' | 'high'
export type SurveyRadiusPreset = 'sm' | 'md' | 'lg'

export interface SurveyDesign {
  accent?:    string
  accent2?:   string
  bg?:        string
  orb1?:      string
  orb2?:      string
  text?:      string
  text2?:     string
  logo_url?:  string
  btn_label?: string
  preset?:    string
  /** Пустая строка = скрыть бейдж на welcome. */
  welcome_badge?: string
  welcome_hint_1?: string
  welcome_hint_2?: string
  type_scale?: SurveyTypeScale
  cta_style?: SurveyCtaStyle
  radius?: SurveyRadiusPreset
  orb_intensity?: SurveyOrbIntensity
}

/**
 * Подписи аналитики для ответов в колонках crm_purpose / crm_used_before / current_crm
 * (формат без JSON answers). Задаётся в конфиге опроса — без привязки к теме «CRM».
 */
export type SurveyLegacyAnalytics = {
  purpose_title?: string
  used_before_title?: string
  current_title?: string
  /** Ключ — значение current_crm в БД, значение — подпись в графиках */
  current_value_labels?: Record<string, string>
}

/** Режим редактирования: классический список вопросов или конструктор страниц. */
export type SurveyEditorMode = 'classic' | 'canvas'

export type SurveyCanvasPageRole = 'welcome' | 'content'

export type SurveyCanvasBlock =
  | {
      id: string
      type: 'text'
      body: string
      align?: 'left' | 'center' | 'right'
      /** Минимальная высота блока текста на экране (px), для визуального «растягивания». */
      minHeightPx?: number
      /** Свободное позиционирование на welcome-полотне (в процентах по X и px по Y). */
      xPct?: number
      yPx?: number
      /** Ширина блока на welcome-полотне в процентах. */
      widthPct?: number
      /** Размер шрифта текста, px (для живой настройки). */
      fontSizePx?: number
    }
  | {
      id: string
      type: 'spacer'
      height: number
      xPct?: number
      yPx?: number
      widthPct?: number
    }
  | {
      id: string
      type: 'divider'
      xPct?: number
      yPx?: number
      widthPct?: number
    }
  | {
      id: string
      type: 'cta'
      label?: string
      xPct?: number
      yPx?: number
      widthPct?: number
    }
  | { id: string; type: 'question'; questionId: string }

export interface SurveyCanvasPage {
  id: string
  role: SurveyCanvasPageRole
  title: string
  layout?: { maxWidth?: 'sm' | 'md' | 'lg' | 'full' }
  blocks: SurveyCanvasBlock[]
}

export interface SurveyCanvas {
  pages: SurveyCanvasPage[]
}

/** Одна галочка согласия (текст, опционально ссылка на PDF / политику). */
export type SurveyConsentItem = {
  id: string
  title: string
  description: string
  linkUrl?: string
  linkLabel?: string
  required: boolean
}

export type ContactsFieldPartial = {
  enabled?: boolean
  required?: boolean
  label?: string
  placeholder?: string
  /** Для необязательных полей — подпись «(необязательно)» в карточке */
  show_optional_hint?: boolean
}

/** Настройка финального блока «контакты + согласия» (редактируется в админке). */
export type ContactsBlockConfig = {
  /** Если true — блок контактов полностью отключён, опрос отправляется без шага контактов */
  disabled?: boolean
  step_pill_label?: string
  step_pill_done_label?: string
  title?: string
  subtitle?: string
  /** Если false — при персональной ссылке с токеном поле email всё равно показывается */
  hide_email_when_token?: boolean
  name?: ContactsFieldPartial
  phone?: ContactsFieldPartial
  email?: ContactsFieldPartial
  comment?: ContactsFieldPartial
  consents?: SurveyConsentItem[]
  submit_hint_need_consents?: string
  submit_hint_need_contacts?: string
}

export interface SurveyConfigData {
  welcome_title?: string
  welcome_sub?: string
  questions: SurveyQuestion[]
  design?: SurveyDesign
  /** Emoji / короткий символ для карточки в списке опросников (админка). */
  sticker?: string
  /** Заголовки блоков для legacy-колонок и подписи значений current_crm */
  legacy_analytics?: SurveyLegacyAnalytics
  editor_mode?: SurveyEditorMode
  /** Схема страниц и блоков для режима canvas. */
  canvas?: SurveyCanvas
  /** Блок контактов и согласий в конце опроса */
  contacts_block?: ContactsBlockConfig
}

export interface Survey {
  revision: number
  id: number
  slug: string
  title: string
  description?: string
  config: SurveyConfigData
  is_active: boolean
  created_at: string
  /** Владелец (OAuth); нет — наследие / создано пароль-админом */
  owner_id?: string | null
}

// ── Response types ──────────────────────────────────────────

export interface SurveyResponse {
  crm_purpose: string[]
  crm_used_before: string[]
  current_crm: string
  name: string
  phone: string
  email?: string
  comment?: string
  token?: string
}

export interface GenericSurveyResponse {
  surveyRevision: number
  surveyId: number
  answers: Record<string, string | string[]>
  name: string
  phone: string
  email?: string
  comment?: string
  token?: string
}

export type ResponseStatus = 'new' | 'called' | 'in_progress' | 'closed'

export interface SurveyRecord {
  survey_revision?: number | null
  config_snapshot?: SurveyConfigData | null
  snapshot_source?: 'submission' | 'legacy_backfill' | 'unavailable' | null
  id: number
  created_at: string
  survey_id: number | null
  crm_purpose: string[]
  crm_used_before: string[]
  current_crm: string
  name: string
  phone: string
  email?: string
  comment?: string
  token?: string
  answers?: Record<string, string | string[]>
  status: ResponseStatus
  manager_note?: string
}

export interface TokenRecord {
  token: string
  email: string
  survey_id: number | null
  created_at: string
  opened_at: string | null
  used_at: string | null
}

export interface LeadProjectRecord {
  id: number
  created_at: string
  updated_at: string
  name: string
  description: string | null
  lead_count?: number
}

export interface ManualLeadRecord {
  id: number
  created_at: string
  updated_at: string
  project_id: number | null
  full_name: string
  email: string
  organization: string
  phone: string
  comment: string | null
  status: ResponseStatus
  manager_note: string | null
}

export const PAGE_SIZE = 20

