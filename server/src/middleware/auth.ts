import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { ensureProfile } from '../lib/profile-sync.js'
import { verifySupabaseAccessToken } from '../lib/supabase-jwt.js'
import type { AuthContext } from '../types/auth.js'

declare module 'fastify' {
  interface FastifyRequest {
    authCtx?: AuthContext
  }
}

let _app: FastifyInstance | null = null

/** Вызвать из index.ts после register(fastifyJwt). */
export function setAuthApp(instance: FastifyInstance): void {
  _app = instance
}

function _bearerToken(request: FastifyRequest): string {
  const header = request.headers.authorization ?? ''
  return header.startsWith('Bearer ') ? header.slice(7) : ''
}

export async function attachAuthContext(
  app: FastifyInstance,
  request: FastifyRequest,
): Promise<AuthContext | null> {
  const token = _bearerToken(request)
  if (!token) return null

  try {
    const payload = app.jwt.verify<{ role?: string }>(token)
    if (payload.role === 'admin') {
      return { kind: 'password_admin' }
    }
  } catch {
    /* не JWT админки */
  }

  const secret = process.env.SUPABASE_JWT_SECRET
  if (!secret) return null

  const claims = await verifySupabaseAccessToken(token, secret)
  if (!claims) return null

  const { isGlobalAdmin } = await ensureProfile(claims.sub, claims.email)
  return {
    kind: 'oauth',
    userId: claims.sub,
    email: claims.email,
    isGlobalAdmin,
  }
}

/**
 * Любой валидный вход: пароль админки или OAuth Supabase (профиль синхронизируется).
 */
export async function requireAdminKey(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  if (!_app) {
    return reply.code(500).send({ error: 'Auth: приложение не инициализировано' })
  }
  const ctx = await attachAuthContext(_app, request)
  if (!ctx) {
    return reply.code(401).send({ error: 'Unauthorized' })
  }
  request.authCtx = ctx
}

/** Пароль админки или OAuth с is_global_admin (или email из GLOBAL_ADMIN_EMAILS). */
export async function requireGlobalAdmin(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  await requireAdminKey(request, reply)
  if (reply.sent) return
  const ctx = request.authCtx!
  if (ctx.kind === 'password_admin') return
  if (ctx.kind === 'oauth' && ctx.isGlobalAdmin) return
  return reply.code(403).send({ error: 'Недостаточно прав' })
}
