import type {
  Survey,
  SurveyConfigData,
  SurveyRecord,
  TokenRecord,
  ResponseStatus,
  GenericSurveyResponse,
  ManualLeadRecord,
  LeadProjectRecord,
} from './supabase'
import { supabase } from './supabase'
import { ADMIN_JWT_STORAGE_KEY, clearAdminAuthenticated, markAdminAuthenticated } from './adminSession'
import { API_BASE_URL } from './apiBaseUrl'
import { canUseWelcomeFixture } from './devFixtureAccess'

export type { Survey, SurveyConfigData, SurveyRecord, TokenRecord, ResponseStatus, ManualLeadRecord, LeadProjectRecord }
export { PAGE_SIZE } from './supabase'

export type AuthMe =
  | { auth: 'password_admin' }
  | { auth: 'oauth'; user: { id: string; email: string; is_global_admin: boolean } }



async function authHeaders(): Promise<Record<string, string>> {
  // Prefer OAuth session token from Supabase. A stale password-admin JWT in localStorage
  // must not shadow a valid OAuth session after redirect back from provider.
  try {
    const { data: { session } } = await supabase.auth.getSession()
    const t = session?.access_token
    if (t) return { Authorization: `Bearer ${t}` }
  } catch {
    /* Safari/WebKit may throw here */
  }
  try {
    const admin = localStorage.getItem(ADMIN_JWT_STORAGE_KEY)
    if (admin && admin !== '__askly_client_only_v1__') {
      return { Authorization: `Bearer ${admin}` }
    }
  } catch {
    /* ignore */
  }
  return {}
}

async function _fetch<T>(path: string, init?: RequestInit): Promise<T> {
  const ctrl = new AbortController()
  const timeoutMs = 7000
  const timer = setTimeout(() => ctrl.abort(), timeoutMs)
  let res: Response
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      signal: ctrl.signal,
      headers: {
        ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
        ...(await authHeaders()),
        ...init?.headers,
      },
    })
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error(`API timeout after ${timeoutMs}ms`)
    }
    throw err
  } finally {
    clearTimeout(timer)
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(body.error ?? `HTTP ${res.status}`)
  }

  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

// ── Auth ────────────────────────────────────────────────────



export async function login(password: string): Promise<string> {
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
  try {
    return await _fetch<AuthMe>('/api/auth/me')
  } catch {
    return null
  }
}

export async function fetchMeOrThrow(): Promise<AuthMe> {
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
  return _fetch('/api/admin/surveys')
}

/**
 * Публичная страница опроса: сначала Supabase (быстро, без бэкенда).
 * Если с клиента Supabase недоступен (нет VITE_* на билде, RLS, сеть) или строка не найдена —
 * при наличии VITE_API_URL пробуем GET /api/surveys/:slug.
 */
export async function getSurveyBySlug(slug: string): Promise<Survey | null> {
  if (!slug.trim()) return null
  if (import.meta.env.DEV && canUseWelcomeFixture(
    import.meta.env.DEV, import.meta.env.VITE_ENABLE_UI_FIXTURES, window.location.hostname, slug,
  )) {
    return (await import('../fixtures/welcomeSurvey')).welcomeSurvey
  }
  return _fetch(`/api/surveys/${encodeURIComponent(slug.trim())}`)
}

export async function getSurveyById(id: number): Promise<Survey | null> {
  return _fetch(`/api/admin/surveys/${id}`)
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
  meta: { slug?: string; title?: string; description?: string; is_active?: boolean },
): Promise<Survey> {

  return _fetch(`/api/admin/surveys/${id}`, {
    method: 'PUT',
    body: JSON.stringify(meta),
  })
}

export async function deleteSurvey(id: number): Promise<void> {
  await _fetch(`/api/admin/surveys/${id}`, { method: 'DELETE' })
}

export async function grantSurveyAccess(_surveyId: number, _email: string): Promise<void> {
  await _fetch(`/api/admin/surveys/${_surveyId}/share`, {
    method: 'POST',
    body: JSON.stringify({ email: _email }),
  })
}

// ── Logo upload ─────────────────────────────────────────────

export async function uploadSurveyLogo(surveyId: number, file: File): Promise<string> {
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
  return new URL(url, API_BASE_URL || window.location.origin).href
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

export async function getResponses(surveyId?: number): Promise<SurveyRecord[]> {
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

export async function getLeadProjects(): Promise<LeadProjectRecord[]> {
  return _fetch('/api/admin/lead-projects')
}

export async function createLeadProject(input: { name: string; description?: string }): Promise<LeadProjectRecord> {
  return _fetch('/api/admin/lead-projects', { method: 'POST', body: JSON.stringify(input) })
}

export async function updateLeadProject(
  id: number,
  patch: { name?: string; description?: string | null },
): Promise<LeadProjectRecord> {
  return _fetch(`/api/admin/lead-projects/${id}`, { method: 'PATCH', body: JSON.stringify(patch) })
}

export async function deleteLeadProject(id: number): Promise<void> {
  await _fetch(`/api/admin/lead-projects/${id}`, { method: 'DELETE' })
}

export async function getManualLeadsPaged(
  page: number,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _pageSize = 20,
  status?: ResponseStatus | 'all',
  projectId?: number,
): Promise<{ data: ManualLeadRecord[]; total: number }> {
  const params = new URLSearchParams({ page: String(page) })
  if (status && status !== 'all') params.set('status', status)
  if (projectId !== undefined) params.set('project_id', String(projectId))
  return _fetch(`/api/admin/manual-leads?${params}`)
}

export async function createManualLead(input: {
  full_name: string
  project_id?: number
  email?: string
  organization?: string
  phone?: string
  comment?: string
  status?: ResponseStatus
  manager_note?: string
}): Promise<ManualLeadRecord> {
  return _fetch('/api/admin/manual-leads', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export async function updateManualLead(
  id: number,
  patch: Partial<{
    full_name: string
    email: string
    organization: string
    phone: string
    comment: string | null
    status: ResponseStatus
    manager_note: string | null
  }>,
): Promise<ManualLeadRecord> {
  return _fetch(`/api/admin/manual-leads/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  })
}

export async function deleteManualLead(id: number): Promise<void> {
  await _fetch(`/api/admin/manual-leads/${id}`, { method: 'DELETE' })
}

export async function saveSurveyResponseGeneric(data: GenericSurveyResponse): Promise<void> {
  if (data.surveyId === -1) throw new Error('Локальный пример: ответы не отправляются и не сохраняются.')
  await _fetch('/api/responses', {
    method: 'POST',
    body: JSON.stringify({ survey_id: data.surveyId, answers: data.answers,
      name: data.name, phone: data.phone, email: data.email,
      comment: data.comment, token: data.token }),
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

export async function getInvitation(token: string, surveyId: number): Promise<{ email: string }> {
  const invitation = await _fetch<{ email: string; survey_id: number | null; used_at: string | null }>(`/api/tokens/${encodeURIComponent(token)}`)
  if (invitation.survey_id !== null && Number(invitation.survey_id) !== Number(surveyId)) {
    throw new Error('Приглашение относится к другому опросу')
  }
  if (invitation.used_at) throw new Error('Это приглашение уже использовано')
  return invitation
}

export async function markTokenOpened(token: string): Promise<void> {
  try {
    await _fetch(`/api/tokens/${token}/opened`, { method: 'PATCH' })
  } catch {
    // Statistics must not bypass the API on failure.
  }
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
