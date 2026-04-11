import type { FastifyInstance } from 'fastify'
import { query, queryOne } from '../db/client.js'
import { requireAdminKey } from '../middleware/auth.js'

function generateToken(): string {
  return Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 10)
}

export async function tokensRoutes(app: FastifyInstance) {

  // GET /api/admin/tokens?survey_id=1
  app.get<{ Querystring: { survey_id?: string } }>(
    '/admin/tokens',
    { preHandler: requireAdminKey },
    async (req, reply) => {
      const surveyId = req.query.survey_id ? Number(req.query.survey_id) : null
      const rows = await query(
        `select * from survey_tokens
         ${surveyId !== null ? 'where survey_id = $1' : ''}
         order by created_at desc`,
        surveyId !== null ? [surveyId] : [],
      )
      reply.send(rows)
    },
  )

  // POST /api/admin/tokens — создать токены для списка email-ов
  app.post<{ Body: { emails: string[]; survey_id?: number } }>(
    '/admin/tokens',
    { preHandler: requireAdminKey },
    async (req, reply) => {
      const { emails, survey_id } = req.body
      if (!Array.isArray(emails) || emails.length === 0) {
        return reply.code(400).send({ error: 'emails обязателен' })
      }

      const records = emails.map(email => ({
        token: generateToken(),
        email: email.trim(),
        survey_id: survey_id ?? null,
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

  // PATCH /api/tokens/:token/opened — пометить токен открытым (публичный)
  app.patch<{ Params: { token: string } }>(
    '/tokens/:token/opened',
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

  // DELETE /api/admin/tokens/:token
  app.delete<{ Params: { token: string } }>(
    '/admin/tokens/:token',
    { preHandler: requireAdminKey },
    async (req, reply) => {
      await query('delete from survey_tokens where token = $1', [req.params.token])
      reply.code(204).send()
    },
  )

  // POST /api/admin/tokens/:token/regenerate
  app.post<{ Params: { token: string } }>(
    '/admin/tokens/:token/regenerate',
    { preHandler: requireAdminKey },
    async (req, reply) => {
      const old = await queryOne<{ email: string; survey_id: number | null }>(
        'select email, survey_id from survey_tokens where token = $1',
        [req.params.token],
      )
      if (!old) return reply.code(404).send({ error: 'Токен не найден' })

      await query('delete from survey_tokens where token = $1', [req.params.token])

      const newToken = generateToken()
      const row = await queryOne(
        `insert into survey_tokens (token, email, survey_id)
         values ($1, $2, $3) returning *`,
        [newToken, old.email, old.survey_id],
      )
      reply.send(row)
    },
  )
}
