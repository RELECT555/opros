/** Общие серверные модели — зеркало фронтовых типов из survey/src/lib/supabase.ts */

export type ResponseStatus = 'new' | 'called' | 'in_progress' | 'closed'

export type QuestionType = 'checkbox' | 'radio' | 'text' | 'scale'

export type SurveyQuestion = {
  id: string
  type: QuestionType
  title: string
  subtitle?: string
  options: string[]
  hasOther?: boolean
  scaleMin?: number
  scaleMax?: number
  optionsLayout?: 'grid' | 'list'
}

export type SurveyTypeScale = 'compact' | 'normal' | 'large'
export type SurveyCtaStyle = 'gradient' | 'solid' | 'outline'
export type SurveyOrbIntensity = 'off' | 'low' | 'medium' | 'high'
export type SurveyRadiusPreset = 'sm' | 'md' | 'lg'

export type SurveyDesign = {
  accent?: string
  accent2?: string
  bg?: string
  orb1?: string
  orb2?: string
  text?: string
  text2?: string
  logo_url?: string
  btn_label?: string
  preset?: string
  welcome_badge?: string
  welcome_hint_1?: string
  welcome_hint_2?: string
  type_scale?: SurveyTypeScale
  cta_style?: SurveyCtaStyle
  radius?: SurveyRadiusPreset
  orb_intensity?: SurveyOrbIntensity
}

export type SurveyLegacyAnalytics = {
  purpose_title?: string
  used_before_title?: string
  current_title?: string
  current_value_labels?: Record<string, string>
}

export type SurveyEditorMode = 'classic' | 'canvas'
export type SurveyCanvasPageRole = 'welcome' | 'content'
export type SurveyCanvasBlock =
  | {
      id: string
      type: 'text'
      body: string
      align?: 'left' | 'center' | 'right'
      minHeightPx?: number
    }
  | { id: string; type: 'spacer'; height: number }
  | { id: string; type: 'divider' }
  | { id: string; type: 'question'; questionId: string }
export type SurveyCanvasPage = {
  id: string
  role: SurveyCanvasPageRole
  title: string
  layout?: { maxWidth?: 'sm' | 'md' | 'lg' | 'full' }
  blocks: SurveyCanvasBlock[]
}
export type SurveyCanvas = { pages: SurveyCanvasPage[] }

export type SurveyConfigData = {
  welcome_title?: string
  welcome_sub?: string
  questions: SurveyQuestion[]
  design?: SurveyDesign
  sticker?: string
  legacy_analytics?: SurveyLegacyAnalytics
  editor_mode?: SurveyEditorMode
  canvas?: SurveyCanvas
}

export type Survey = {
  id: number
  slug: string
  title: string
  description?: string
  config: SurveyConfigData
  is_active: boolean
  created_at: string
}

export type SurveyRecord = {
  id: number
  created_at: string
  survey_id: number | null
  name: string
  phone: string
  email?: string
  comment?: string
  token?: string
  answers?: Record<string, string | string[]>
  status: ResponseStatus
  manager_note?: string
  crm_purpose: string[]
  crm_used_before: string[]
  current_crm: string
}

export type TokenRecord = {
  token: string
  email: string
  survey_id: number | null
  created_at: string
  opened_at: string | null
  used_at: string | null
}
