import type { FastifyInstance } from 'fastify'
import { timingSafeEqual } from 'node:crypto'
import { httpLog } from '../logger.js'
import { attachAuthContext } from '../middleware/auth.js'

function _safeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  return timingSafeEqual(Buffer.from(a), Buffer.from(b))
}

export async function authRoutes(app: FastifyInstance) {

  app.post<{ Body: { password: string } }>(
    '/auth/login',
    {
      config: { rateLimit: { max: 5, timeWindow: '1 minute' } },
      schema: {
        body: {
          type: 'object',
          required: ['password'],
          properties: {
            password: { type: 'string', minLength: 1, maxLength: 200 },
          },
          additionalProperties: false,
        },
      },
    },
    async (req, reply) => {
      const { password } = req.body
      const expected = process.env.ADMIN_PASSWORD
      if (!expected) {
        httpLog.error('ADMIN_PASSWORD не задан в .env')
        return reply.code(500).send({ error: 'Сервер не настроен для аутентификации' })
      }

      if (!_safeCompare(password, expected)) {
        return reply.code(401).send({ error: 'Неверный пароль' })
      }

      const token = app.jwt.sign(
        { role: 'admin' },
        { expiresIn: '24h' },
      )

      reply.send({ token })
    },
  )

  app.get('/auth/me', async (req, reply) => {
    const ctx = await attachAuthContext(app, req)
    if (!ctx) {
      return reply.code(401).send({ error: 'Token invalid or expired' })
    }

    if (ctx.kind === 'password_admin') {
      return reply.send({
        auth: 'password_admin',
      })
    }

    return reply.send({
      auth: 'oauth',
      user: {
        id: ctx.userId,
        email: ctx.email,
        is_global_admin: ctx.isGlobalAdmin,
      },
    })
  })
}
