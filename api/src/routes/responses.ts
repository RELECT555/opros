import type { FastifyInstance } from 'fastify'
import { query, queryOne } from '../db/client.js'
import { requireAdminKey } from '../middleware/auth.js'
import { sendTelegramNotification } from '../services/telegram.js'
import { httpLog } from '../logger.js'

const PAGE_SIZE = 20

export async function responsesRoutes(app: FastifyInstance) {

  // POST /api/responses — сохранить ответ (публичный)
  app.post<{
    Body: {
      survey_id: number
      answers?: Record<string, unknown>
      name: string
      phone: string
      email?: string
      comment?: string
      token?: string
      // legacy CRM fields
      crm_purpose?: string[]
      crm_used_before?: string[]
      current_crm?: string
    }
  }>('/responses', async (req, reply) => {
    const { survey_id, answers, name, phone, email, comment, token,
            crm_purpose, crm_used_before, current_crm } = req.body

    if (!survey_id || !name || !phone) {
      return reply.code(400).send({ error: 'survey_id, name и phone обязательны' })
    }

    const row = await queryOne(
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

    // Помечаем токен как использованный
    if (token) {
      await query(
        `update survey_tokens set used_at = now() where token = $1`,
        [token],
      )
    }

    // Telegram уведомление
    sendTelegramNotification({ type: 'new_response', data: row }).catch((err) => httpLog.error({ err }, 'telegram: не удалось отправить уведомление о новом ответе'))

    reply.code(201).send(row)
  })

  // GET /api/admin/responses — список ответов с пагинацией
  app.get<{
    Querystring: { survey_id?: string; page?: string; status?: string }
  }>('/admin/responses', { preHandler: requireAdminKey }, async (req, reply) => {
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

    params.push(PAGE_SIZE, page * PAGE_SIZE)
    const data = await query(
      `select * from survey_responses ${where}
       order by created_at desc
       limit $${params.length - 1} offset $${params.length}`,
      params,
    )

    reply.send({ data, total, page, page_size: PAGE_SIZE })
  })

  // PATCH /api/admin/responses/:id/status
  app.patch<{ Params: { id: string }; Body: { status: string } }>(
    '/admin/responses/:id/status',
    { preHandler: requireAdminKey },
    async (req, reply) => {
      const allowed = ['new', 'called', 'in_progress', 'closed']
      if (!allowed.includes(req.body.status)) {
        return reply.code(400).send({ error: 'Недопустимый статус' })
      }
      const row = await queryOne(
        `update survey_responses set status = $1 where id = $2 returning *`,
        [req.body.status, req.params.id],
      )
      sendTelegramNotification({ type: 'status_change', data: row }).catch((err) => httpLog.error({ err }, 'telegram: не удалось отправить уведомление о смене статуса'))
      reply.send(row)
    },
  )

  // PATCH /api/admin/responses/:id/note
  app.patch<{ Params: { id: string }; Body: { note: string } }>(
    '/admin/responses/:id/note',
    { preHandler: requireAdminKey },
    async (req, reply) => {
      const row = await queryOne(
        `update survey_responses set manager_note = $1 where id = $2 returning *`,
        [req.body.note, req.params.id],
      )
      reply.send(row)
    },
  )

  // GET /api/admin/responses/export — все ответы для CSV
  app.get<{ Querystring: { survey_id?: string } }>(
    '/admin/responses/export',
    { preHandler: requireAdminKey },
    async (req, reply) => {
      const surveyId = req.query.survey_id ? Number(req.query.survey_id) : null
      const rows = await query(
        `select * from survey_responses ${surveyId !== null ? 'where survey_id = $1' : ''}
         order by created_at desc`,
        surveyId !== null ? [surveyId] : [],
      )
      reply.send(rows)
    },
  )
}
