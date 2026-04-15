import type { FastifyInstance } from 'fastify'
import { queryOne } from '../db/client.js'
import { requireAdminKey, requireGlobalAdmin } from '../middleware/auth.js'

const ID_SCHEMA = { type: 'object', properties: { id: { type: 'string', pattern: '^[0-9]+$' } } } as const

export async function configRoutes(app: FastifyInstance) {

  app.get<{ Params: { id: string } }>('/config/:id', {
    schema: { params: ID_SCHEMA },
  }, async (req, reply) => {
    const id = Number(req.params.id)
    const row = await queryOne<{ config: unknown }>(
      'select config from survey_config where id = $1',
      [id],
    )
    if (!row) return reply.code(404).send({ error: 'Конфиг не найден' })
    reply.send(row.config)
  })

  app.put<{ Params: { id: string }; Body: { config: unknown } }>(
    '/admin/config/:id',
    {
      preHandler: requireGlobalAdmin,
      schema: {
        params: ID_SCHEMA,
        body: {
          type: 'object',
          required: ['config'],
          properties: { config: {} },
        },
      },
    },
    async (req, reply) => {
      const id = Number(req.params.id)
      const row = await queryOne(
        `insert into survey_config (id, config)
         values ($1, $2)
         on conflict (id) do update set config = excluded.config
         returning *`,
        [id, JSON.stringify(req.body.config)],
      )
      reply.send(row)
    },
  )

  app.get('/admin/theme', { preHandler: requireAdminKey }, async (_req, reply) => {
    const row = await queryOne<{ config: unknown }>(
      'select config from survey_config where id = 2',
    )
    reply.send(row?.config ?? null)
  })

  app.put<{ Body: { theme: unknown } }>(
    '/admin/theme',
    {
      preHandler: requireGlobalAdmin,
      schema: {
        body: {
          type: 'object',
          required: ['theme'],
          properties: { theme: {} },
        },
      },
    },
    async (req, reply) => {
      const row = await queryOne(
        `insert into survey_config (id, config)
         values (2, $1)
         on conflict (id) do update set config = excluded.config
         returning *`,
        [JSON.stringify(req.body.theme)],
      )
      reply.send(row)
    },
  )
}
