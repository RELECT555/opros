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

export interface SurveyResponse {
  crm_purpose: string[]
  crm_used_before: string[]
  current_crm: string
  name: string
  phone: string
  comment?: string
  token?: string
}

export interface SurveyRecord extends SurveyResponse {
  id: number
  created_at: string
}

export interface TokenRecord {
  token: string
  email: string
  created_at: string
  used_at: string | null
}

export async function getTokens(): Promise<TokenRecord[]> {
  const { data, error } = await supabase
    .from('survey_tokens')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data as TokenRecord[]
}

export async function createTokens(emails: string[]): Promise<TokenRecord[]> {
  const records = emails.map(email => ({
    token: Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 10),
    email,
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

export async function resolveToken(token: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('survey_tokens')
    .select('email')
    .eq('token', token)
    .single()
  if (error || !data) return null
  return (data as { email: string }).email
}

export async function getResponses(): Promise<SurveyRecord[]> {
  const { data, error } = await supabase
    .from('survey_responses')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data as SurveyRecord[]
}

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

export async function saveSurveyResponse(data: SurveyResponse, attempts = 3): Promise<void> {
  for (let i = 0; i < attempts; i++) {
    const { error } = await supabase.from('survey_responses').insert([data])
    if (!error) {
      if (data.token) {
        await supabase
          .from('survey_tokens')
          .update({ used_at: new Date().toISOString() })
          .eq('token', data.token)
      }
      return
    }
    if (i < attempts - 1) await new Promise(r => setTimeout(r, 800 * (i + 1)))
    else throw error
  }
}
