import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

if (!url || !key) {
  console.error(
    '❌ Supabase не настроен. Создайте файл survey/.env:\n' +
    'VITE_SUPABASE_URL=https://xxxx.supabase.co\n' +
    'VITE_SUPABASE_ANON_KEY=eyJ...'
  )
}

export const supabase = createClient(url ?? 'https://placeholder.supabase.co', key ?? 'placeholder')

// ── Survey types ────────────────────────────────────────────

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

export const PAGE_SIZE = 20

// ── Surveys CRUD ────────────────────────────────────────────

export async function getSurveys(): Promise<Survey[]> {
  const { data, error } = await supabase
    .from('surveys')
    .select('*')
    .order('created_at', { ascending: true })
  if (error) throw error
  return data as Survey[]
}

export async function getSurveyBySlug(slug: string): Promise<Survey | null> {
  const { data, error } = await supabase
    .from('surveys')
    .select('*')
    .eq('slug', slug)
    .eq('is_active', true)
    .single()
  if (error || !data) return null
  return data as Survey
}

export async function getSurveyById(id: number): Promise<Survey | null> {
  const { data, error } = await supabase
    .from('surveys')
    .select('*')
    .eq('id', id)
    .single()
  if (error || !data) return null
  return data as Survey
}

export async function createSurvey(input: {
  slug: string
  title: string
  description?: string
  config: SurveyConfigData
}): Promise<Survey> {
  const { data, error } = await supabase
    .from('surveys')
    .insert([input])
    .select()
    .single()
  if (error) throw error
  return data as Survey
}

export async function updateSurveyConfig(id: number, config: SurveyConfigData): Promise<void> {
  const { error } = await supabase
    .from('surveys')
    .update({ config })
    .eq('id', id)
  if (error) throw error
}

const LOGO_BUCKET =
  (import.meta.env.VITE_SUPABASE_LOGO_BUCKET as string | undefined) ?? 'survey-logos'

/** Загрузка логотипа в Supabase Storage (публичный bucket). Политики и bucket нужно создать в проекте. */
export async function uploadSurveyLogo(surveyId: number, file: File): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Выберите файл изображения')
  }
  if (file.size > 2 * 1024 * 1024) {
    throw new Error('Максимальный размер файла 2 МБ')
  }
  const raw = file.name.split('.').pop()?.toLowerCase() || 'png'
  const ext = ['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg'].includes(raw) ? raw : 'png'
  const path = `${surveyId}/${crypto.randomUUID()}.${ext}`
  const { error } = await supabase.storage.from(LOGO_BUCKET).upload(path, file, {
    cacheControl: '3600',
    upsert: false,
  })
  if (error) {
    throw new Error(
      error.message.includes('Bucket not found')
        ? `Bucket «${LOGO_BUCKET}» не найден. Создайте его в Supabase Storage или задайте VITE_SUPABASE_LOGO_BUCKET.`
        : error.message,
    )
  }
  const { data } = supabase.storage.from(LOGO_BUCKET).getPublicUrl(path)
  return data.publicUrl
}

export async function updateSurveyMeta(id: number, meta: { title?: string; description?: string; is_active?: boolean }): Promise<void> {
  const { error } = await supabase
    .from('surveys')
    .update(meta)
    .eq('id', id)
  if (error) throw error
}

export async function deleteSurvey(id: number): Promise<void> {
  const { error } = await supabase.from('surveys').delete().eq('id', id)
  if (error) throw error
}

// ── Responses ──────────────────────────────────────────────

export async function getResponsesPaged(
  page: number,
  pageSize = PAGE_SIZE,
  surveyId?: number,
  status?: ResponseStatus | 'all',
): Promise<{ data: SurveyRecord[]; total: number }> {
  const from = page * pageSize
  const to   = from + pageSize - 1
  let q = supabase
    .from('survey_responses')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to)
  if (surveyId !== undefined) q = q.eq('survey_id', surveyId)
  if (status && status !== 'all') q = q.eq('status', status)
  const { data, error, count } = await q
  if (error) throw error
  return { data: data as SurveyRecord[], total: count ?? 0 }
}

export async function getResponses(surveyId?: number): Promise<SurveyRecord[]> {
  let q = supabase
    .from('survey_responses')
    .select('*')
    .order('created_at', { ascending: false })
  if (surveyId !== undefined) q = q.eq('survey_id', surveyId)
  const { data, error } = await q
  if (error) throw error
  return data as SurveyRecord[]
}

export async function updateResponseStatus(id: number, status: ResponseStatus): Promise<void> {
  const { error } = await supabase
    .from('survey_responses')
    .update({ status })
    .eq('id', id)
  if (error) throw error
}

export async function updateManagerNote(id: number, note: string): Promise<void> {
  const { error } = await supabase
    .from('survey_responses')
    .update({ manager_note: note })
    .eq('id', id)
  if (error) throw error
}

/** Сохранить ответ по старому CRM-опроснику (обратная совместимость) */
export async function saveSurveyResponse(data: SurveyResponse, attempts = 3): Promise<void> {
  for (let i = 0; i < attempts; i++) {
    const { error } = await supabase.from('survey_responses').insert([{ ...data, survey_id: 1 }])
    if (!error) {
      if (data.token) {
        await supabase
          .from('survey_tokens')
          .update({ used_at: new Date().toISOString() })
          .eq('token', data.token)
      }
      return
    }
    console.error('saveSurveyResponse error:', error)
    if (i < attempts - 1) await new Promise(r => setTimeout(r, 800 * (i + 1)))
    else throw new Error(error.message ?? 'Ошибка отправки данных')
  }
}

/** Сохранить ответ для динамического опросника */
export async function saveSurveyResponseGeneric(data: GenericSurveyResponse, attempts = 3): Promise<void> {
  const record = {
    survey_id: data.surveyId,
    answers: data.answers,
    name: data.name,
    phone: data.phone,
    email: data.email,
    comment: data.comment,
    token: data.token,
    // legacy columns — пустые для новых опросов
    crm_purpose: [],
    crm_used_before: [],
    current_crm: '',
  }
  for (let i = 0; i < attempts; i++) {
    const { error } = await supabase.from('survey_responses').insert([record])
    if (!error) {
      if (data.token) {
        await supabase
          .from('survey_tokens')
          .update({ used_at: new Date().toISOString() })
          .eq('token', data.token)
      }
      return
    }
    console.error('saveSurveyResponseGeneric error:', error)
    if (i < attempts - 1) await new Promise(r => setTimeout(r, 800 * (i + 1)))
    else throw new Error(error.message ?? 'Ошибка отправки данных')
  }
}

// ── Tokens ─────────────────────────────────────────────────

export async function getTokens(surveyId?: number): Promise<TokenRecord[]> {
  let q = supabase
    .from('survey_tokens')
    .select('*')
    .order('created_at', { ascending: false })
  if (surveyId !== undefined) q = q.eq('survey_id', surveyId)
  const { data, error } = await q
  if (error) throw error
  return data as TokenRecord[]
}

export async function createTokens(emails: string[], surveyId?: number): Promise<TokenRecord[]> {
  const records = emails.map(email => ({
    token: Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 10),
    email,
    survey_id: surveyId ?? null,
  }))
  const { data, error } = await supabase
    .from('survey_tokens')
    .insert(records)
    .select()
  if (error) throw error
  return data as TokenRecord[]
}

export async function deleteToken(token: string): Promise<void> {
  const { error } = await supabase.from('survey_tokens').delete().eq('token', token)
  if (error) throw error
}

export async function regenerateToken(oldToken: string, email: string, surveyId?: number): Promise<TokenRecord> {
  await deleteToken(oldToken)
  const [record] = await createTokens([email], surveyId)
  return record
}

export async function resolveToken(token: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('survey_tokens')
    .select('email')
    .eq('token', token)
    .single()
  if (error || !data) return null
  return (data as { email: string }).email
}

export async function markTokenOpened(token: string): Promise<void> {
  await supabase
    .from('survey_tokens')
    .update({ opened_at: new Date().toISOString() })
    .eq('token', token)
    .is('opened_at', null)
}

// ── Config (legacy, используется только для CRM-опроса через старый App.tsx) ──

export async function getConfig(): Promise<Record<string, unknown> | null> {
  const { data, error } = await supabase
    .from('survey_config')
    .select('config')
    .eq('id', 1)
    .single()
  if (error) return null
  return (data as { config: Record<string, unknown> }).config
}

export async function setConfig(config: unknown): Promise<void> {
  const { error } = await supabase
    .from('survey_config')
    .upsert({ id: 1, config })
  if (error) throw error
}

// ── Global admin theme (id=2 in survey_config) ──

export async function getGlobalTheme(): Promise<Record<string, unknown> | null> {
  const { data, error } = await supabase
    .from('survey_config')
    .select('config')
    .eq('id', 2)
    .single()
  if (error || !data) return null
  return (data as { config: Record<string, unknown> }).config
}

export async function setGlobalTheme(theme: unknown): Promise<void> {
  const { error } = await supabase
    .from('survey_config')
    .upsert({ id: 2, config: theme })
  if (error) throw error
}
