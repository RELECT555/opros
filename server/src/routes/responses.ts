import type { FastifyInstance } from 'fastify'
import { db, query, queryOne } from '../db/client.js'
import { requireAdminKey } from '../middleware/auth.js'
import { accessibleSurveyIds, canAccessResponse, canAccessSurvey } from '../lib/access.js'
import { sendTelegramNotification } from '../services/telegram.js'
import { emitResponseNew, emitResponseStatus } from '../ws/index.js'
import { httpLog } from '../logger.js'
import type { SurveyRecord, SurveyConfigData } from '../types/models.js'
import { validateResponse } from '../lib/response-validation.js'
import { validateSurveyConfig } from '../lib/survey-config-validation.js'
import { surveyConfigSnapshot } from '../lib/survey-config-snapshot.js'

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
      survey_revision: number
      answers?: Record<string, unknown>
      name?: string
      phone?: string
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
        required: ['survey_id', 'survey_revision'],
        properties: {
          survey_id:       { type: 'integer', minimum: 1 },
          survey_revision: { type: 'integer', minimum: 1, maximum: 2_147_483_647 },
          answers:         { type: 'object' },
          name:            { type: 'string', maxLength: 200 },
          phone:           { type: 'string', maxLength: 30 },
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
    const { survey_id, survey_revision, answers, name, phone, email, comment, token,
            crm_purpose, crm_used_before, current_crm } = req.body

    const client = await db.connect()
    let row: SurveyRecord | null = null
    try {
      await client.query('begin')
      const survey = await client.query<{ is_active: boolean; config: SurveyConfigData; revision: number }>(
        'select is_active, config, revision from surveys where id = $1 for share', [survey_id],
      )
      if (!survey.rows[0]?.is_active) {
        await client.query('rollback')
        return reply.code(404).send({ error: 'Опрос недоступен' })
      }
      if (survey.rows[0].revision !== survey_revision) {
        await client.query('rollback')
        return reply.code(409).send({ error: 'Опрос изменился во время заполнения. Обновите страницу и проверьте ответы.',
          code: 'SURVEY_REVISION_CONFLICT', current_revision: survey.rows[0].revision })
      }
      if (validateSurveyConfig(survey.rows[0].config)) {
        await client.query('rollback')
        return reply.code(409).send({ error: 'Опрос некорректно настроен. Сообщите организатору опроса.', code: 'INVALID_SURVEY_CONFIG' })
      }
      let responseEmail = email?.trim() || null
      if (token) {
        const invitation = await client.query<{ survey_id: string | number | null; used_at: string | null; email: string }>(
          'select survey_id, used_at, email from survey_tokens where token = $1 for update', [token],
        )
        const found = invitation.rows[0]
        if (!found || (found.survey_id !== null && Number(found.survey_id) !== survey_id) || found.used_at) {
          await client.query('rollback')
          return reply.code(409).send({ error: 'Приглашение недействительно или уже использовано' })
        }
        if (survey.rows[0].config.contacts_block?.hide_email_when_token !== false) responseEmail = found.email
      }
      const validationError = validateResponse(survey.rows[0].config, answers ?? {}, {
        name, phone, email: responseEmail ?? undefined, comment,
      })
      if (validationError) {
        await client.query('rollback')
        return reply.code(400).send({ error: validationError })
      }
      const insert = await client.query<SurveyRecord>(
        `insert into survey_responses
           (survey_id, answers, name, phone, email, comment, token,
            crm_purpose, crm_used_before, current_crm,
            survey_revision, config_snapshot, snapshot_source)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'submission')
         returning *`,
        [
          survey_id,
          JSON.stringify(answers ?? {}),
          name?.trim() ?? '', phone?.trim() ?? '',
          responseEmail,
          comment ?? null,
          token ?? null,
          crm_purpose ?? [],
          crm_used_before ?? [],
          current_crm ?? '',
          survey.rows[0].revision,
          JSON.stringify(surveyConfigSnapshot(survey.rows[0].config)),
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
    const ctx = req.authCtx!
    const surveyId = req.query.survey_id ? Number(req.query.survey_id) : null
    const page     = Math.max(0, Number(req.query.page ?? 0))
    const status   = req.query.status ?? null

    const allowed = await accessibleSurveyIds(ctx)
    if (allowed !== 'all' && allowed.length === 0) {
      return reply.send({ data: [], total: 0, page, page_size: PAGE_SIZE })
    }

    const conditions: string[] = []
    const params: unknown[]   = []

    if (allowed !== 'all') {
      params.push(allowed)
      conditions.push(`survey_id = any($${params.length}::bigint[])`)
    }

    if (surveyId !== null) {
      if (!(await canAccessSurvey(ctx, surveyId))) {
        return reply.code(403).send({ error: 'Нет доступа к опросу' })
      }
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
      const ctx = req.authCtx!
      const rid = Number(req.params.id)
      if (!(await canAccessResponse(ctx, rid))) {
        return reply.code(403).send({ error: 'Нет доступа' })
      }
      const row = await queryOne<SurveyRecord>(
        `update survey_responses set status = $1 where id = $2 returning *`,
        [req.body.status, rid],
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
      const ctx = req.authCtx!
      const rid = Number(req.params.id)
      if (!(await canAccessResponse(ctx, rid))) {
        return reply.code(403).send({ error: 'Нет доступа' })
      }
      const row = await queryOne<SurveyRecord>(
        `update survey_responses set manager_note = $1 where id = $2 returning *`,
        [req.body.note, rid],
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
      const ctx = req.authCtx!
      const allowed = await accessibleSurveyIds(ctx)
      if (allowed !== 'all' && allowed.length === 0) {
        return reply.send({ data: [], limit: EXPORT_DEFAULT_LIMIT, offset: 0, has_more: false })
      }

      const surveyId = req.query.survey_id ? Number(req.query.survey_id) : null
      if (surveyId !== null && !(await canAccessSurvey(ctx, surveyId))) {
        return reply.code(403).send({ error: 'Нет доступа к опросу' })
      }
      const limitParsed = req.query.limit !== undefined ? Number(req.query.limit) : EXPORT_DEFAULT_LIMIT
      const offset = Math.max(0, Number(req.query.offset ?? 0))
      const limit = Math.min(
        EXPORT_MAX_LIMIT,
        Math.max(1, Number.isFinite(limitParsed) ? limitParsed : EXPORT_DEFAULT_LIMIT),
      )

      const params: unknown[] = []
      const conditions: string[] = []
      if (allowed !== 'all') {
        params.push(allowed)
        conditions.push(`survey_id = any($${params.length}::bigint[])`)
      }
      if (surveyId !== null) {
        params.push(surveyId)
        conditions.push(`survey_id = $${params.length}`)
      }
      const where = conditions.length ? `where ${conditions.join(' and ')}` : ''

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
