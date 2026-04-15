import { jwtVerify, type JWTPayload } from 'jose'
import { httpLog } from '../logger.js'

type SupabaseClaims = JWTPayload & {
  sub?: string
  email?: string
}

/**
 * Проверка access_token пользователя Supabase (HS256, секрет проекта).
 * Секрет: Settings → API → JWT Secret (не anon key).
 */
export async function verifySupabaseAccessToken(
  token: string,
  secret: string,
): Promise<{ sub: string; email: string } | null> {
  try {
    const key = new TextEncoder().encode(secret)
    const { payload } = await jwtVerify(token, key, { algorithms: ['HS256'] })
    const p = payload as SupabaseClaims
    const sub = typeof p.sub === 'string' ? p.sub : ''
    const email = typeof p.email === 'string' ? p.email : ''
    if (!sub || !email) return null
    return { sub, email }
  } catch (err) {
    httpLog.debug({ err }, 'supabase jwt verify failed')
    return null
  }
}
