import type { FastifyInstance } from 'fastify'
import { query, queryOne } from '../db/client.js'
import { requireAdminKey } from '../middleware/auth.js'
import { isFullAccess } from '../types/auth.js'
import type { ManualLeadRecord } from '../types/models.js'

const PAGE_SIZE = 20
const ALLOWED_STATUSES = ['new', 'called', 'in_progress', 'closed'] as const

const ID_PARAMS = {
  type: 'object',
  properties: { id: { type: 'string', pattern: '^[0-9]+$' } },
} as const

export async function manualLeadsRoutes(app: FastifyInstance) {
  app.get<{
    Querystring: { page?: string; status?: string; project_id?: string }
  }>('/admin/manual-leads', {
    preHandler: requireAdminKey,
    schema: {
      querystring: {
        type: 'object',
        properties: {
          page:       { type: 'string', pattern: '^[0-9]+$' },
          status:     { type: 'string', enum: ['all', ...ALLOWED_STATUSES] },
          project_id: { type: 'string', pattern: '^[0-9]+$' },
        },
      },
    },
  }, async (req, reply) => {
    const ctx = req.authCtx!
    if (!isFullAccess(ctx)) {
      return reply.code(403).send({ error: 'Недостаточно прав' })
    }

    const page = Math.max(0, Number(req.query.page ?? 0))
    const status = req.query.status ?? null
    const projectId = req.query.project_id ? Number(req.query.project_id) : null

    const conditions: string[] = []
    const params: unknown[] = []

    if (projectId !== null) {
      params.push(projectId)
      conditions.push(`project_id = $${params.length}`)
    }

    if (status && status !== 'all') {
      params.push(status)
      conditions.push(`status = $${params.length}`)
    }

    const where = conditions.length ? `where ${conditions.join(' and ')}` : ''

    const countResult = await queryOne<{ count: string }>(
      `select count(*) from manual_leads ${where}`,
      params,
    )
    const total = parseInt(countResult?.count ?? '0', 10)

    const limitIdx = params.length + 1
    const offsetIdx = params.length + 2
    params.push(PAGE_SIZE, page * PAGE_SIZE)
    const data = await query<ManualLeadRecord>(
      `select * from manual_leads ${where}
       order by created_at desc
       limit $${limitIdx} offset $${offsetIdx}`,
      params,
    )

    reply.send({ data, total, page, page_size: PAGE_SIZE })
  })

  app.post<{
    Body: {
      full_name: string
      project_id?: number
      email?: string
      organization?: string
      phone?: string
      comment?: string
      status?: string
      manager_note?: string
    }
  }>('/admin/manual-leads', {
    preHandler: requireAdminKey,
    schema: {
      body: {
        type: 'object',
        required: ['full_name'],
        properties: {
          full_name:     { type: 'string', minLength: 1, maxLength: 300 },
          project_id:    { type: 'number' },
          email:         { type: 'string', maxLength: 320 },
          organization:  { type: 'string', maxLength: 500 },
          phone:         { type: 'string', maxLength: 50 },
          comment:       { type: 'string', maxLength: 4000 },
          status:        { type: 'string', enum: [...ALLOWED_STATUSES] },
          manager_note:  { type: 'string', maxLength: 4000 },
        },
        additionalProperties: false,
      },
    },
  }, async (req, reply) => {
    const ctx = req.authCtx!
    if (!isFullAccess(ctx)) {
      return reply.code(403).send({ error: 'Недостаточно прав' })
    }

    const b = req.body
    const row = await queryOne<ManualLeadRecord>(
      `insert into manual_leads
        (project_id, full_name, email, organization, phone, comment, status, manager_note)
       values ($1,$2,$3,$4,$5,$6,$7,$8)
       returning *`,
      [
        b.project_id ?? null,
        b.full_name.trim(),
        (b.email ?? '').trim(),
        (b.organization ?? '').trim(),
        (b.phone ?? '').trim(),
        b.comment?.trim() || null,
        b.status && ALLOWED_STATUSES.includes(b.status as typeof ALLOWED_STATUSES[number])
          ? b.status
          : 'new',
        b.manager_note?.trim() || null,
      ],
    )
    if (!row) return reply.code(500).send({ error: 'Insert failed' })
    reply.code(201).send(row)
  })

  app.patch<{
    Params: { id: string }
    Body: {
      full_name?: string
      email?: string
      organization?: string
      phone?: string
      comment?: string | null
      status?: string
      manager_note?: string | null
    }
  }>('/admin/manual-leads/:id', {
    preHandler: requireAdminKey,
    schema: {
      params: ID_PARAMS,
      body: {
        type: 'object',
        properties: {
          full_name:     { type: 'string', minLength: 1, maxLength: 300 },
          email:         { type: 'string', maxLength: 320 },
          organization:  { type: 'string', maxLength: 500 },
          phone:         { type: 'string', maxLength: 50 },
          comment:       { type: ['string', 'null'], maxLength: 4000 },
          status:        { type: 'string', enum: [...ALLOWED_STATUSES] },
          manager_note:  { type: ['string', 'null'], maxLength: 4000 },
        },
        additionalProperties: false,
      },
    },
  }, async (req, reply) => {
    const ctx = req.authCtx!
    if (!isFullAccess(ctx)) {
      return reply.code(403).send({ error: 'Недостаточно прав' })
    }

    const id = Number(req.params.id)
    const b = req.body
    const keys = Object.keys(b) as (keyof typeof b)[]
    if (keys.length === 0) {
      return reply.code(400).send({ error: 'Empty body' })
    }

    const sets: string[] = []
    const params: unknown[] = []

    const push = (col: string, val: unknown) => {
      params.push(val)
      sets.push(`${col} = $${params.length}`)
    }

    if (b.full_name !== undefined) push('full_name', b.full_name.trim())
    if (b.email !== undefined) push('email', b.email.trim())
    if (b.organization !== undefined) push('organization', b.organization.trim())
    if (b.phone !== undefined) push('phone', b.phone.trim())
    if (b.comment !== undefined) push('comment', b.comment === null ? null : b.comment.trim() || null)
    if (b.status !== undefined) push('status', b.status)
    if (b.manager_note !== undefined) {
      push('manager_note', b.manager_note === null ? null : b.manager_note.trim() || null)
    }

    params.push(id)
    const row = await queryOne<ManualLeadRecord>(
      `update manual_leads set ${sets.join(', ')} where id = $${params.length} returning *`,
      params,
    )
    if (!row) return reply.code(404).send({ error: 'Not found' })
    reply.send(row)
  })

  app.delete<{ Params: { id: string } }>(
    '/admin/manual-leads/:id',
    { preHandler: requireAdminKey, schema: { params: ID_PARAMS } },
    async (req, reply) => {
      const ctx = req.authCtx!
      if (!isFullAccess(ctx)) {
        return reply.code(403).send({ error: 'Недостаточно прав' })
      }

      const id = Number(req.params.id)
      const result = await queryOne<{ id: number }>(
        `delete from manual_leads where id = $1 returning id`,
        [id],
      )
      if (!result) return reply.code(404).send({ error: 'Not found' })
      reply.code(204).send()
    },
  )
}
