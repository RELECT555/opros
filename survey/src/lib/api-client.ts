import type {
  Survey,
  SurveyConfigData,
  SurveyRecord,
  TokenRecord,
  ResponseStatus,
  GenericSurveyResponse,
} from './supabase'
import {
  supabase,
  getSurveys          as db_getSurveys,
  getSurveyBySlug     as db_getSurveyBySlug,
  getSurveyById       as db_getSurveyById,
  createSurvey        as db_createSurvey,
  updateSurveyConfig  as db_updateSurveyConfig,
  updateSurveyMeta    as db_updateSurveyMeta,
  deleteSurvey        as db_deleteSurvey,
  uploadSurveyLogo    as db_uploadSurveyLogo,
  getResponsesPaged   as db_getResponsesPaged,
  getResponses        as db_getResponses,
  updateResponseStatus as db_updateResponseStatus,
  updateManagerNote   as db_updateManagerNote,
  saveSurveyResponseGeneric as db_saveSurveyResponseGeneric,
  getTokens           as db_getTokens,
  createTokens        as db_createTokens,
  deleteToken         as db_deleteToken,
  regenerateToken     as db_regenerateToken,
  resolveToken        as db_resolveToken,
  markTokenOpened     as db_markTokenOpened,
  getConfig           as db_getConfig,
  setConfig           as db_setConfig,
  getGlobalTheme      as db_getGlobalTheme,
  setGlobalTheme      as db_setGlobalTheme,
} from './supabase'
import { ADMIN_JWT_STORAGE_KEY, clearAdminAuthenticated, markAdminAuthenticated } from './adminSession'
import { API_BASE_URL } from './apiBaseUrl'
import {
  CLIENT_ONLY_TOKEN,
  passwordMatchesClientOnly,
  readClientOnlyMe,
} from './clientOnlyAdmin'

export type { Survey, SurveyConfigData, SurveyRecord, TokenRecord, ResponseStatus }
export { PAGE_SIZE } from './supabase'

export type AuthMe =
  | { auth: 'password_admin' }
  | { auth: 'oauth'; user: { id: string; email: string; is_global_admin: boolean } }

function _direct(): boolean {
  if (!API_BASE_URL) return true
  try {
    return localStorage.getItem(ADMIN_JWT_STORAGE_KEY) === CLIENT_ONLY_TOKEN
  } catch {
    return !API_BASE_URL
  }
}

async function authHeaders(): Promise<Record<string, string>> {
  try {
    const admin = localStorage.getItem(ADMIN_JWT_STORAGE_KEY)
    if (admin && admin !== CLIENT_ONLY_TOKEN) {
      return { Authorization: `Bearer ${admin}` }
    }
  } catch {
    /* ignore */
  }
  try {
    const { data: { session } } = await supabase.auth.getSession()
    const t = session?.access_token
    if (t) return { Authorization: `Bearer ${t}` }
  } catch {
    /* Safari/WebKit may throw here */
  }
  return {}
}

async function _fetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(await authHeaders()),
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

async function attemptSilentLogin(password: string): Promise<string | null> {
  if (!API_BASE_URL) return null
  try {
    const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    })
    const text = await res.text()
    let body: { error?: string; token?: string }
    try {
      body = text ? (JSON.parse(text) as { error?: string; token?: string }) : {}
    } catch {
      return null
    }
    if (!res.ok || typeof body.token !== 'string' || !body.token) return null
    return body.token
  } catch {
    return null
  }
}

export async function login(password: string): Promise<string> {
  if (passwordMatchesClientOnly(password)) {
    const jwt = await attemptSilentLogin(password)
    if (jwt) {
      localStorage.setItem(ADMIN_JWT_STORAGE_KEY, jwt)
      markAdminAuthenticated()
      return jwt
    }
    localStorage.setItem(ADMIN_JWT_STORAGE_KEY, CLIENT_ONLY_TOKEN)
    markAdminAuthenticated()
    return CLIENT_ONLY_TOKEN
  }
  if (!API_BASE_URL) {
    throw new Error('Неверный пароль')
  }
  const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  })
  const text = await res.text()
  let body: { error?: string; token?: string }
  try {
    body = text ? (JSON.parse(text) as { error?: string; token?: string }) : {}
  } catch {
    if (!res.ok) {
      throw new Error(res.status === 502 || res.status === 503 || res.status === 504
        ? `HTTP ${res.status}`
        : 'Invalid response from server (expected JSON)')
    }
    throw new Error('Invalid response from server (expected JSON)')
  }
  if (!res.ok) {
    throw new Error(typeof body.error === 'string' ? body.error : `HTTP ${res.status}`)
  }
  const token = body.token
  if (!token) throw new Error('Server did not return token')
  localStorage.setItem(ADMIN_JWT_STORAGE_KEY, token)
  markAdminAuthenticated()
  return token
}

export async function fetchMe(): Promise<AuthMe | null> {
  const local = readClientOnlyMe()
  if (local) return local
  if (_direct()) return null
  try {
    return await _fetch<AuthMe>('/api/auth/me')
  } catch {
    return null
  }
}

export async function fetchMeOrThrow(): Promise<AuthMe> {
  const local = readClientOnlyMe()
  if (local) return local
  if (_direct()) throw new Error('No API server configured')
  const res = await fetch(`${API_BASE_URL}/api/auth/me`, {
    headers: {
      'Content-Type': 'application/json',
      ...(await authHeaders()),
    },
  })
  const text = await res.text()
  if (!res.ok) {
    let errMsg = `HTTP ${res.status}`
    try {
      const body = text ? (JSON.parse(text) as { error?: string }) : {}
      if (typeof body.error === 'string') errMsg = body.error
    } catch {
      /* keep errMsg */
    }
    throw new Error(errMsg)
  }
  try {
    return JSON.parse(text) as AuthMe
  } catch {
    throw new Error('Invalid response from server (expected JSON)')
  }
}

export async function checkAuth(): Promise<boolean> {
  const me = await fetchMe()
  return me !== null
}

export async function logout(): Promise<void> {
  try {
    localStorage.removeItem(ADMIN_JWT_STORAGE_KEY)
  } catch {
    /* ignore */
  }
  clearAdminAuthenticated()
  await supabase.auth.signOut()
}

// ── Surveys CRUD ────────────────────────────────────────────

export async function getSurveys(): Promise<Survey[]> {
  if (_direct()) return db_getSurveys()
  return _fetch('/api/admin/surveys')
}

export async function getSurveyBySlug(slug: string): Promise<Survey | null> {
  if (_direct()) return db_getSurveyBySlug(slug)
  try {
    return await _fetch(`/api/surveys/${encodeURIComponent(slug)}`)
  } catch {
    return null
  }
}

export async function getSurveyById(id: number): Promise<Survey | null> {
  if (_direct()) return db_getSurveyById(id)
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
  if (_direct()) return db_createSurvey(input)
  return _fetch('/api/admin/surveys', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export async function updateSurveyConfig(id: number, config: SurveyConfigData): Promise<void> {
  if (_direct()) return db_updateSurveyConfig(id, config)
  await _fetch(`/api/admin/surveys/${id}/config`, {
    method: 'PUT',
    body: JSON.stringify({ config }),
  })
}

export async function updateSurveyMeta(
  id: number,
  meta: { slug?: string; title?: string; description?: string; is_active?: boolean },
): Promise<Survey> {
  if (_direct()) {
    await db_updateSurveyMeta(id, meta)
    const updated = await db_getSurveyById(id)
    if (!updated) throw new Error('Survey not found after update')
    return updated
  }
  return _fetch(`/api/admin/surveys/${id}`, {
    method: 'PUT',
    body: JSON.stringify(meta),
  })
}

export async function deleteSurvey(id: number): Promise<void> {
  if (_direct()) return db_deleteSurvey(id)
  await _fetch(`/api/admin/surveys/${id}`, { method: 'DELETE' })
}

export async function grantSurveyAccess(_surveyId: number, _email: string): Promise<void> {
  if (_direct()) return
  await _fetch(`/api/admin/surveys/${_surveyId}/share`, {
    method: 'POST',
    body: JSON.stringify({ email: _email }),
  })
}

// ── Logo upload ─────────────────────────────────────────────

export async function uploadSurveyLogo(surveyId: number, file: File): Promise<string> {
  if (_direct()) return db_uploadSurveyLogo(surveyId, file)
  if (!file.type.startsWith('image/')) {
    throw new Error('Select an image file')
  }
  if (file.size > 2 * 1024 * 1024) {
    throw new Error('Max file size 2 MB')
  }

  const form = new FormData()
  form.append('file', file)

  const res = await fetch(`${API_BASE_URL}/api/admin/uploads/logo?survey_id=${surveyId}`, {
    method: 'POST',
    headers: await authHeaders(),
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
  if (_direct()) return db_getResponsesPaged(page, _pageSize, surveyId, status)
  const params = new URLSearchParams({ page: String(page) })
  if (surveyId !== undefined) params.set('survey_id', String(surveyId))
  if (status && status !== 'all') params.set('status', status)
  return _fetch(`/api/admin/responses?${params}`)
}

export async function getResponses(surveyId?: number): Promise<SurveyRecord[]> {
  if (_direct()) return db_getResponses(surveyId)
  const out: SurveyRecord[] = []
  let offset = 0
  const EXPORT_PAGE = 5_000
  for (;;) {
    const qs = new URLSearchParams({
      limit: String(EXPORT_PAGE),
      offset: String(offset),
    })
    if (surveyId !== undefined) qs.set('survey_id', String(surveyId))
    const chunk = await _fetch<{ data: SurveyRecord[]; has_more: boolean }>(`/api/admin/responses/export?${qs}`)
    out.push(...chunk.data)
    if (!chunk.has_more) break
    offset += chunk.data.length
    if (chunk.data.length === 0) break
  }
  return out
}

export async function updateResponseStatus(id: number, status: ResponseStatus): Promise<void> {
  if (_direct()) return db_updateResponseStatus(id, status)
  await _fetch(`/api/admin/responses/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  })
}

export async function updateManagerNote(id: number, note: string): Promise<void> {
  if (_direct()) return db_updateManagerNote(id, note)
  await _fetch(`/api/admin/responses/${id}/note`, {
    method: 'PATCH',
    body: JSON.stringify({ note }),
  })
}

export async function saveSurveyResponseGeneric(data: GenericSurveyResponse): Promise<void> {
  if (_direct()) return db_saveSurveyResponseGeneric(data)
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
  if (_direct()) return db_getTokens(surveyId)
  const params = surveyId !== undefined ? `?survey_id=${surveyId}` : ''
  return _fetch(`/api/admin/tokens${params}`)
}

export async function createTokens(emails: string[], surveyId?: number): Promise<TokenRecord[]> {
  if (_direct()) return db_createTokens(emails, surveyId)
  return _fetch('/api/admin/tokens', {
    method: 'POST',
    body: JSON.stringify({ emails, survey_id: surveyId }),
  })
}

export async function deleteToken(token: string): Promise<void> {
  if (_direct()) return db_deleteToken(token)
  await _fetch(`/api/admin/tokens/${token}`, { method: 'DELETE' })
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function regenerateToken(oldToken: string, _email: string, _surveyId?: number): Promise<TokenRecord> {
  if (_direct()) return db_regenerateToken(oldToken, _email, _surveyId)
  return _fetch(`/api/admin/tokens/${oldToken}/regenerate`, { method: 'POST' })
}

export async function resolveToken(token: string): Promise<string | null> {
  if (_direct()) return db_resolveToken(token)
  try {
    const data = await _fetch<{ email: string }>(`/api/tokens/${token}`)
    return data.email
  } catch {
    return null
  }
}

export async function markTokenOpened(token: string): Promise<void> {
  if (_direct()) return db_markTokenOpened(token)
  await _fetch(`/api/tokens/${token}/opened`, { method: 'PATCH' })
}

// ── Config (legacy) ─────────────────────────────────────────

export async function getConfig(): Promise<Record<string, unknown> | null> {
  if (_direct()) return db_getConfig()
  try {
    return await _fetch('/api/config/1')
  } catch {
    return null
  }
}

export async function setConfig(config: unknown): Promise<void> {
  if (_direct()) return db_setConfig(config)
  await _fetch('/api/admin/config/1', {
    method: 'PUT',
    body: JSON.stringify({ config }),
  })
}

// ── Global admin theme ──────────────────────────────────────

export async function getGlobalTheme(): Promise<Record<string, unknown> | null> {
  if (_direct()) return db_getGlobalTheme()
  try {
    return await _fetch('/api/admin/theme')
  } catch {
    return null
  }
}

export async function setGlobalTheme(theme: unknown): Promise<void> {
  if (_direct()) return db_setGlobalTheme(theme)
  await _fetch('/api/admin/theme', {
    method: 'PUT',
    body: JSON.stringify({ theme }),
  })
}
