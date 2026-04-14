import type { FastifyInstance } from 'fastify'
import { db, query, queryOne } from '../db/client.js'
import { requireAdminKey } from '../middleware/auth.js'
import { sendTelegramNotification } from '../services/telegram.js'
import { emitResponseNew, emitResponseStatus } from '../ws/index.js'
import { httpLog } from '../logger.js'
import type { SurveyRecord } from '../types/models.js'

const PAGE_SIZE = 20
const EXPORT_DEFAULT_LIMIT = 5_000
const EXPORT_MAX_LIMIT = 10_000
const ALLOWED_STATUSES = ['new', 'called', 'in_progress', 'closed'] as const

const ID_PARAMS = {
  type: 'object',
  properties: { id: { type: 'string', pattern: '^[0-9]+$' } },
} as const

export async function responsesRoutes(app: FastifyInstance) {

  app.post<{
    Body: {
      survey_id: number
      answers?: Record<string, unknown>
      name: string
      phone: string
      email?: string
      comment?: string
      token?: string
      crm_purpose?: string[]
      crm_used_before?: string[]
      current_crm?: string
    }
  }>('/responses', {
    config: { rateLimit: { max: 10, timeWindow: '1 minute' } },
    schema: {
      body: {
        type: 'object',
        required: ['survey_id', 'name', 'phone'],
        properties: {
          survey_id:       { type: 'integer', minimum: 1 },
          answers:         { type: 'object' },
          name:            { type: 'string', minLength: 1, maxLength: 200 },
          phone:           { type: 'string', minLength: 5, maxLength: 30 },
          email:           { type: 'string', maxLength: 200 },
          comment:         { type: 'string', maxLength: 2000 },
          token:           { type: 'string', maxLength: 100 },
          crm_purpose:     { type: 'array', items: { type: 'string', maxLength: 200 }, maxItems: 20 },
          crm_used_before: { type: 'array', items: { type: 'string', maxLength: 200 }, maxItems: 20 },
          current_crm:     { type: 'string', maxLength: 200 },
        },
        additionalProperties: false,
      },
    },
  }, async (req, reply) => {
    const { survey_id, answers, name, phone, email, comment, token,
            crm_purpose, crm_used_before, current_crm } = req.body

    const client = await db.connect()
    let row: SurveyRecord | null = null
    try {
      await client.query('begin')
      const insert = await client.query<SurveyRecord>(
        `insert into survey_responses
           (survey_id, answers, name, phone, email, comment, token,
            crm_purpose, crm_used_before, current_crm)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
         returning *`,
        [
          survey_id,
          JSON.stringify(answers ?? {}),
          name, phone,
          email ?? null,
          comment ?? null,
          token ?? null,
          crm_purpose ?? [],
          crm_used_before ?? [],
          current_crm ?? '',
        ],
      )
      row = insert.rows[0] ?? null
      if (!row) {
        await client.query('rollback')
        return reply.code(500).send({ error: 'Insert failed' })
      }
      if (token) {
        await client.query(
          `update survey_tokens set used_at = now() where token = $1`,
          [token],
        )
      }
      await client.query('commit')
    } catch (err) {
      await client.query('rollback')
      httpLog.error({ err }, 'responses: insert / token update')
      return reply.code(500).send({ error: 'Insert failed' })
    } finally {
      client.release()
    }

    if (!row) {
      return reply.code(500).send({ error: 'Insert failed' })
    }

    sendTelegramNotification({ type: 'new_response', data: row }).catch((err) =>
      httpLog.error({ err }, 'telegram: ошибка'))

    emitResponseNew({
      id: row.id,
      survey_id: row.survey_id,
      name: row.name,
      phone: row.phone,
      created_at: row.created_at,
    })

    reply.code(201).send(row)
  })

  app.get<{
    Querystring: { survey_id?: string; page?: string; status?: string }
  }>('/admin/responses', {
    preHandler: requireAdminKey,
    schema: {
      querystring: {
        type: 'object',
        properties: {
          survey_id: { type: 'string', pattern: '^[0-9]+$' },
          page:      { type: 'string', pattern: '^[0-9]+$' },
          status:    { type: 'string', enum: ['all', ...ALLOWED_STATUSES] },
        },
      },
    },
  }, async (req, reply) => {
    const surveyId = req.query.survey_id ? Number(req.query.survey_id) : null
    const page     = Math.max(0, Number(req.query.page ?? 0))
    const status   = req.query.status ?? null

    const conditions: string[] = []
    const params: unknown[]   = []

    if (surveyId !== null) {
      params.push(surveyId)
      conditions.push(`survey_id = $${params.length}`)
    }
    if (status && status !== 'all') {
      params.push(status)
      conditions.push(`status = $${params.length}`)
    }

    const where = conditions.length ? `where ${conditions.join(' and ')}` : ''

    const countResult = await queryOne<{ count: string }>(
      `select count(*) from survey_responses ${where}`,
      params,
    )
    const total = parseInt(countResult?.count ?? '0', 10)

    const limitIdx = params.length + 1
    const offsetIdx = params.length + 2
    params.push(PAGE_SIZE, page * PAGE_SIZE)
    const data = await query<SurveyRecord>(
      `select * from survey_responses ${where}
       order by created_at desc
       limit $${limitIdx} offset $${offsetIdx}`,
      params,
    )

    reply.send({ data, total, page, page_size: PAGE_SIZE })
  })

  app.patch<{ Params: { id: string }; Body: { status: string } }>(
    '/admin/responses/:id/status',
    {
      preHandler: requireAdminKey,
      schema: {
        params: ID_PARAMS,
        body: {
          type: 'object',
          required: ['status'],
          properties: {
            status: { type: 'string', enum: [...ALLOWED_STATUSES] },
          },
          additionalProperties: false,
        },
      },
    },
    async (req, reply) => {
      const row = await queryOne<SurveyRecord>(
        `update survey_responses set status = $1 where id = $2 returning *`,
        [req.body.status, Number(req.params.id)],
      )
      if (!row) return reply.code(404).send({ error: 'Ответ не найден' })

      sendTelegramNotification({ type: 'status_change', data: row }).catch((err) =>
        httpLog.error({ err }, 'telegram: ошибка'))

      emitResponseStatus({
        id: row.id,
        status: row.status,
      })

      reply.send(row)
    },
  )

  app.patch<{ Params: { id: string }; Body: { note: string } }>(
    '/admin/responses/:id/note',
    {
      preHandler: requireAdminKey,
      schema: {
        params: ID_PARAMS,
        body: {
          type: 'object',
          required: ['note'],
          properties: {
            note: { type: 'string', maxLength: 5000 },
          },
          additionalProperties: false,
        },
      },
    },
    async (req, reply) => {
      const row = await queryOne<SurveyRecord>(
        `update survey_responses set manager_note = $1 where id = $2 returning *`,
        [req.body.note, Number(req.params.id)],
      )
      if (!row) return reply.code(404).send({ error: 'Ответ не найден' })
      reply.send(row)
    },
  )

  app.get<{
    Querystring: { survey_id?: string; limit?: string; offset?: string }
  }>(
    '/admin/responses/export',
    {
      preHandler: requireAdminKey,
      schema: {
        querystring: {
          type: 'object',
          properties: {
            survey_id: { type: 'string', pattern: '^[0-9]+$' },
            limit:     { type: 'string', pattern: '^[0-9]+$' },
            offset:    { type: 'string', pattern: '^[0-9]+$' },
          },
        },
      },
    },
    async (req, reply) => {
      const surveyId = req.query.survey_id ? Number(req.query.survey_id) : null
      const limitParsed = req.query.limit !== undefined ? Number(req.query.limit) : EXPORT_DEFAULT_LIMIT
      const offset = Math.max(0, Number(req.query.offset ?? 0))
      const limit = Math.min(
        EXPORT_MAX_LIMIT,
        Math.max(1, Number.isFinite(limitParsed) ? limitParsed : EXPORT_DEFAULT_LIMIT),
      )

      const params: unknown[] = []
      const where = surveyId !== null ? 'where survey_id = $1' : ''
      if (surveyId !== null) params.push(surveyId)

      const limitIdx = params.length + 1
      const offsetIdx = params.length + 2
      params.push(limit, offset)

      const rows = await query<SurveyRecord>(
        `select * from survey_responses ${where}
         order by created_at desc
         limit $${limitIdx} offset $${offsetIdx}`,
        params,
      )

      reply.send({
        data: rows,
        limit,
        offset,
        has_more: rows.length === limit,
      })
    },
  )
}
