import type { FastifyInstance } from 'fastify'
import { randomBytes } from 'node:crypto'
import { db, query, queryOne } from '../db/client.js'
import { requireAdminKey } from '../middleware/auth.js'
import { accessibleSurveyIds, canAccessSurvey } from '../lib/access.js'
import { isFullAccess } from '../types/auth.js'

function generateToken(): string {
  return randomBytes(16).toString('hex')
}

const TOKEN_PARAMS = {
  type: 'object',
  properties: { token: { type: 'string', pattern: '^[a-fA-F0-9]{32}$' } },
} as const

export async function tokensRoutes(app: FastifyInstance) {

  app.get<{ Querystring: { survey_id?: string } }>(
    '/admin/tokens',
    {
      preHandler: requireAdminKey,
      schema: {
        querystring: {
          type: 'object',
          properties: {
            survey_id: { type: 'string', pattern: '^[0-9]+$' },
          },
        },
      },
    },
    async (req, reply) => {
      const ctx = req.authCtx!
      const surveyId = req.query.survey_id ? Number(req.query.survey_id) : null
      if (surveyId !== null && !(await canAccessSurvey(ctx, surveyId))) {
        return reply.code(403).send({ error: 'Нет доступа к опросу' })
      }

      const allowed = await accessibleSurveyIds(ctx)
      const params: unknown[] = []
      const parts: string[] = []

      if (!isFullAccess(ctx)) {
        if (allowed.length === 0) return reply.send([])
        params.push(allowed)
        parts.push(`survey_id = any($${params.length}::bigint[])`)
      }

      if (surveyId !== null) {
        params.push(surveyId)
        parts.push(`survey_id = $${params.length}`)
      }

      const where = parts.length ? `where ${parts.join(' and ')}` : ''
      const rows = await query(
        `select * from survey_tokens ${where} order by created_at desc`,
        params,
      )
      reply.send(rows)
    },
  )

  app.post<{ Body: { emails: string[]; survey_id?: number } }>(
    '/admin/tokens',
    {
      preHandler: requireAdminKey,
      schema: {
        body: {
          type: 'object',
          required: ['emails'],
          properties: {
            emails:    { type: 'array', items: { type: 'string', format: 'email', maxLength: 200 }, minItems: 1, maxItems: 500 },
            survey_id: { type: 'integer', minimum: 1 },
          },
          additionalProperties: false,
        },
      },
    },
    async (req, reply) => {
      const ctx = req.authCtx!
      const { emails, survey_id } = req.body

      const sid = survey_id ?? null
      if (sid !== null && !(await canAccessSurvey(ctx, sid))) {
        return reply.code(403).send({ error: 'Нет доступа к опросу' })
      }
      if (sid === null && !isFullAccess(ctx)) {
        return reply.code(403).send({ error: 'Укажите опрос для приглашений' })
      }

      const records = emails.map(email => ({
        token: generateToken(),
        email: email.trim().toLowerCase(),
        survey_id: sid,
      }))

      const placeholders = records
        .map((_, i) => `($${i * 3 + 1}, $${i * 3 + 2}, $${i * 3 + 3})`)
        .join(', ')

      const params = records.flatMap(r => [r.token, r.email, r.survey_id])

      const rows = await query(
        `insert into survey_tokens (token, email, survey_id)
         values ${placeholders}
         returning *`,
        params,
      )

      reply.code(201).send(rows)
    },
  )

  app.get<{ Params: { token: string } }>(
    '/tokens/:token',
    {
      config: { rateLimit: { max: 30, timeWindow: '1 minute' } },
      schema: { params: TOKEN_PARAMS },
    },
    async (req, reply) => {
      const row = await queryOne<{ email: string; survey_id: number | null }>(
        'select email, survey_id from survey_tokens where token = $1',
        [req.params.token],
      )
      if (!row) return reply.code(404).send({ error: 'Токен не найден' })
      reply.send(row)
    },
  )

  app.patch<{ Params: { token: string } }>(
    '/tokens/:token/opened',
    {
      config: { rateLimit: { max: 30, timeWindow: '1 minute' } },
      schema: { params: TOKEN_PARAMS },
    },
    async (req, reply) => {
      await query(
        `update survey_tokens
         set opened_at = now()
         where token = $1 and opened_at is null`,
        [req.params.token],
      )
      reply.code(204).send()
    },
  )

  app.delete<{ Params: { token: string } }>(
    '/admin/tokens/:token',
    {
      preHandler: requireAdminKey,
      schema: { params: TOKEN_PARAMS },
    },
    async (req, reply) => {
      const ctx = req.authCtx!
      const row = await queryOne<{ survey_id: number | null }>(
        `select survey_id from survey_tokens where token = $1`,
        [req.params.token],
      )
      if (!row) return reply.code(404).send({ error: 'Токен не найден' })
      if (row.survey_id !== null && !(await canAccessSurvey(ctx, row.survey_id))) {
        return reply.code(403).send({ error: 'Нет доступа' })
      }
      if (row.survey_id === null && !isFullAccess(ctx)) {
        return reply.code(403).send({ error: 'Нет доступа' })
      }
      await query('delete from survey_tokens where token = $1', [req.params.token])
      reply.code(204).send()
    },
  )

  app.post<{ Params: { token: string } }>(
    '/admin/tokens/:token/regenerate',
    {
      preHandler: requireAdminKey,
      schema: { params: TOKEN_PARAMS },
    },
    async (req, reply) => {
      const ctx = req.authCtx!
      const client = await db.connect()
      try {
        await client.query('begin')
        const oldResult = await client.query<{ email: string; survey_id: number | null }>(
          'select email, survey_id from survey_tokens where token = $1',
          [req.params.token],
        )
        const old = oldResult.rows[0]
        if (!old) {
          await client.query('rollback')
          return reply.code(404).send({ error: 'Токен не найден' })
        }
        if (old.survey_id !== null && !(await canAccessSurvey(ctx, old.survey_id))) {
          await client.query('rollback')
          return reply.code(403).send({ error: 'Нет доступа' })
        }
        if (old.survey_id === null && !isFullAccess(ctx)) {
          await client.query('rollback')
          return reply.code(403).send({ error: 'Нет доступа' })
        }

        await client.query('delete from survey_tokens where token = $1', [req.params.token])

        const newToken = generateToken()
        const inserted = await client.query(
          `insert into survey_tokens (token, email, survey_id)
           values ($1, $2, $3) returning *`,
          [newToken, old.email, old.survey_id],
        )
        await client.query('commit')
        reply.send(inserted.rows[0])
      } catch (error) {
        await client.query('rollback')
        throw error
      } finally {
        client.release()
      }
    },
  )
}
