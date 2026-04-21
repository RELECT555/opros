import type { FastifyInstance } from 'fastify'
import { query, queryOne } from '../db/client.js'
import { requireAdminKey } from '../middleware/auth.js'
import { isFullAccess } from '../types/auth.js'
import type { LeadProjectRecord } from '../types/models.js'

const ID_PARAMS = {
  type: 'object',
  properties: { id: { type: 'string', pattern: '^[0-9]+$' } },
} as const

export async function leadProjectsRoutes(app: FastifyInstance) {
  // GET /admin/lead-projects — список всех проектов
  app.get('/admin/lead-projects', { preHandler: requireAdminKey }, async (req, reply) => {
    const ctx = req.authCtx!
    if (!isFullAccess(ctx)) return reply.code(403).send({ error: 'Недостаточно прав' })

    const rows = await query<LeadProjectRecord & { lead_count: string }>(
      `select p.*,
              count(l.id) as lead_count
         from lead_projects p
         left join manual_leads l on l.project_id = p.id
        group by p.id
        order by p.created_at desc`,
      [],
    )
    reply.send(rows)
  })

  // POST /admin/lead-projects — создать проект
  app.post<{ Body: { name: string; description?: string } }>(
    '/admin/lead-projects',
    {
      preHandler: requireAdminKey,
      schema: {
        body: {
          type: 'object',
          required: ['name'],
          properties: {
            name:        { type: 'string', minLength: 1, maxLength: 200 },
            description: { type: 'string', maxLength: 2000 },
          },
          additionalProperties: false,
        },
      },
    },
    async (req, reply) => {
      const ctx = req.authCtx!
      if (!isFullAccess(ctx)) return reply.code(403).send({ error: 'Недостаточно прав' })

      const { name, description } = req.body
      const row = await queryOne<LeadProjectRecord>(
        `insert into lead_projects (name, description) values ($1, $2) returning *`,
        [name.trim(), description?.trim() || null],
      )
      if (!row) return reply.code(500).send({ error: 'Insert failed' })
      reply.code(201).send(row)
    },
  )

  // PATCH /admin/lead-projects/:id — обновить проект
  app.patch<{ Params: { id: string }; Body: { name?: string; description?: string | null } }>(
    '/admin/lead-projects/:id',
    {
      preHandler: requireAdminKey,
      schema: {
        params: ID_PARAMS,
        body: {
          type: 'object',
          properties: {
            name:        { type: 'string', minLength: 1, maxLength: 200 },
            description: { type: ['string', 'null'], maxLength: 2000 },
          },
          additionalProperties: false,
        },
      },
    },
    async (req, reply) => {
      const ctx = req.authCtx!
      if (!isFullAccess(ctx)) return reply.code(403).send({ error: 'Недостаточно прав' })

      const id = Number(req.params.id)
      const b = req.body
      const sets: string[] = []
      const params: unknown[] = []

      if (b.name !== undefined) { params.push(b.name.trim()); sets.push(`name = $${params.length}`) }
      if (b.description !== undefined) {
        params.push(b.description === null ? null : b.description.trim() || null)
        sets.push(`description = $${params.length}`)
      }
      if (sets.length === 0) return reply.code(400).send({ error: 'Empty body' })

      params.push(id)
      const row = await queryOne<LeadProjectRecord>(
        `update lead_projects set ${sets.join(', ')} where id = $${params.length} returning *`,
        params,
      )
      if (!row) return reply.code(404).send({ error: 'Not found' })
      reply.send(row)
    },
  )

  // DELETE /admin/lead-projects/:id — удалить проект
  app.delete<{ Params: { id: string } }>(
    '/admin/lead-projects/:id',
    { preHandler: requireAdminKey, schema: { params: ID_PARAMS } },
    async (req, reply) => {
      const ctx = req.authCtx!
      if (!isFullAccess(ctx)) return reply.code(403).send({ error: 'Недостаточно прав' })

      const id = Number(req.params.id)
      const result = await queryOne<{ id: number }>(
        `delete from lead_projects where id = $1 returning id`,
        [id],
      )
      if (!result) return reply.code(404).send({ error: 'Not found' })
      reply.code(204).send()
    },
  )
}
