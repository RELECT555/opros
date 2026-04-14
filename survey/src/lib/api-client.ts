/**
 * api-client.ts — HTTP-клиент для собственного бэкенда.
 *
 * Drop-in замена Supabase-функций из supabase.ts.
 * Экспортирует TE ЖЕ имена и сигнатуры — при миграции достаточно
 * сменить import с './supabase' на './api-client'.
 *
 * Для подключения:
 *   1. В survey/.env добавить VITE_API_URL=http://localhost:3001
 *   2. В компонентах сменить импорт:
 *      - import { getSurveys, ... } from '../lib/supabase'
 *      + import { getSurveys, ... } from '../lib/api-client'
 *
 * Типы реэкспортируются из supabase.ts — менять ничего не нужно.
 */

import type {
  Survey,
  SurveyConfigData,
  SurveyRecord,
  TokenRecord,
  ResponseStatus,
  GenericSurveyResponse,
} from './supabase'
import { ADMIN_JWT_STORAGE_KEY } from './adminSession'

export type { Survey, SurveyConfigData, SurveyRecord, TokenRecord, ResponseStatus }
export { PAGE_SIZE } from './supabase'

const API_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:3001'

function _getToken(): string | null {
  return localStorage.getItem(ADMIN_JWT_STORAGE_KEY)
}

function _authHeaders(): Record<string, string> {
  const token = _getToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}

async function _fetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ..._authHeaders(),
      ...init?.headers,
    },
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(body.error ?? `HTTP ${res.status}`)
  }

  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

// ── Auth ────────────────────────────────────────────────────

export async function login(password: string): Promise<string> {
  const { token } = await _fetch<{ token: string }>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ password }),
  })
  localStorage.setItem(ADMIN_JWT_STORAGE_KEY, token)
  return token
}

export async function checkAuth(): Promise<boolean> {
  try {
    await _fetch('/api/auth/me')
    return true
  } catch {
    return false
  }
}

export function logout(): void {
  localStorage.removeItem(ADMIN_JWT_STORAGE_KEY)
}

// ── Surveys CRUD ────────────────────────────────────────────

export async function getSurveys(): Promise<Survey[]> {
  return _fetch('/api/admin/surveys')
}

export async function getSurveyBySlug(slug: string): Promise<Survey | null> {
  try {
    return await _fetch(`/api/surveys/${encodeURIComponent(slug)}`)
  } catch {
    return null
  }
}

export async function getSurveyById(id: number): Promise<Survey | null> {
  try {
    return await _fetch(`/api/admin/surveys/${id}`)
  } catch {
    return null
  }
}

export async function createSurvey(input: {
  slug: string
  title: string
  description?: string
  config: SurveyConfigData
}): Promise<Survey> {
  return _fetch('/api/admin/surveys', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export async function updateSurveyConfig(id: number, config: SurveyConfigData): Promise<void> {
  await _fetch(`/api/admin/surveys/${id}/config`, {
    method: 'PUT',
    body: JSON.stringify({ config }),
  })
}

export async function updateSurveyMeta(
  id: number,
  meta: { title?: string; description?: string; is_active?: boolean },
): Promise<void> {
  await _fetch(`/api/admin/surveys/${id}`, {
    method: 'PUT',
    body: JSON.stringify(meta),
  })
}

export async function deleteSurvey(id: number): Promise<void> {
  await _fetch(`/api/admin/surveys/${id}`, { method: 'DELETE' })
}

// ── Logo upload ─────────────────────────────────────────────

export async function uploadSurveyLogo(surveyId: number, file: File): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Выберите файл изображения')
  }
  if (file.size > 2 * 1024 * 1024) {
    throw new Error('Максимальный размер файла 2 МБ')
  }

  const form = new FormData()
  form.append('file', file)

  const res = await fetch(`${API_URL}/api/admin/uploads/logo?survey_id=${surveyId}`, {
    method: 'POST',
    headers: _authHeaders(),
    body: form,
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(body.error ?? `HTTP ${res.status}`)
  }

  const { url } = await res.json() as { url: string }
  return url
}

// ── Responses ───────────────────────────────────────────────

export async function getResponsesPaged(
  page: number,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _pageSize = 20,
  surveyId?: number,
  status?: ResponseStatus | 'all',
): Promise<{ data: SurveyRecord[]; total: number }> {
  const params = new URLSearchParams({ page: String(page) })
  if (surveyId !== undefined) params.set('survey_id', String(surveyId))
  if (status && status !== 'all') params.set('status', status)
  return _fetch(`/api/admin/responses?${params}`)
}

type ExportChunk = {
  data: SurveyRecord[]
  limit: number
  offset: number
  has_more: boolean
}

const EXPORT_PAGE = 5_000

export async function getResponses(surveyId?: number): Promise<SurveyRecord[]> {
  const out: SurveyRecord[] = []
  let offset = 0
  for (;;) {
    const qs = new URLSearchParams({
      limit: String(EXPORT_PAGE),
      offset: String(offset),
    })
    if (surveyId !== undefined) qs.set('survey_id', String(surveyId))
    const chunk = await _fetch<ExportChunk>(`/api/admin/responses/export?${qs}`)
    out.push(...chunk.data)
    if (!chunk.has_more) break
    offset += chunk.data.length
    if (chunk.data.length === 0) break
  }
  return out
}

export async function updateResponseStatus(id: number, status: ResponseStatus): Promise<void> {
  await _fetch(`/api/admin/responses/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  })
}

export async function updateManagerNote(id: number, note: string): Promise<void> {
  await _fetch(`/api/admin/responses/${id}/note`, {
    method: 'PATCH',
    body: JSON.stringify({ note }),
  })
}

export async function saveSurveyResponseGeneric(data: GenericSurveyResponse): Promise<void> {
  await _fetch('/api/responses', {
    method: 'POST',
    body: JSON.stringify({
      survey_id: data.surveyId,
      answers: data.answers,
      name: data.name,
      phone: data.phone,
      email: data.email,
      comment: data.comment,
      token: data.token,
      crm_purpose: [],
      crm_used_before: [],
      current_crm: '',
    }),
  })
}

// ── Tokens ──────────────────────────────────────────────────

export async function getTokens(surveyId?: number): Promise<TokenRecord[]> {
  const params = surveyId !== undefined ? `?survey_id=${surveyId}` : ''
  return _fetch(`/api/admin/tokens${params}`)
}

export async function createTokens(emails: string[], surveyId?: number): Promise<TokenRecord[]> {
  return _fetch('/api/admin/tokens', {
    method: 'POST',
    body: JSON.stringify({ emails, survey_id: surveyId }),
  })
}

export async function deleteToken(token: string): Promise<void> {
  await _fetch(`/api/admin/tokens/${token}`, { method: 'DELETE' })
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function regenerateToken(oldToken: string, _email: string, _surveyId?: number): Promise<TokenRecord> {
  return _fetch(`/api/admin/tokens/${oldToken}/regenerate`, { method: 'POST' })
}

export async function resolveToken(token: string): Promise<string | null> {
  try {
    const data = await _fetch<{ email: string }>(`/api/tokens/${token}`)
    return data.email
  } catch {
    return null
  }
}

export async function markTokenOpened(token: string): Promise<void> {
  await _fetch(`/api/tokens/${token}/opened`, { method: 'PATCH' })
}

// ── Config (legacy) ─────────────────────────────────────────

export async function getConfig(): Promise<Record<string, unknown> | null> {
  try {
    return await _fetch('/api/config/1')
  } catch {
    return null
  }
}

export async function setConfig(config: unknown): Promise<void> {
  await _fetch('/api/admin/config/1', {
    method: 'PUT',
    body: JSON.stringify({ config }),
  })
}

// ── Global admin theme ──────────────────────────────────────

export async function getGlobalTheme(): Promise<Record<string, unknown> | null> {
  try {
    return await _fetch('/api/admin/theme')
  } catch {
    return null
  }
}

export async function setGlobalTheme(theme: unknown): Promise<void> {
  await _fetch('/api/admin/theme', {
    method: 'PUT',
    body: JSON.stringify({ theme }),
  })
}
