import type { FastifyInstance } from 'fastify'
import { query, queryOne } from '../db/client.js'
import { requireAdminKey } from '../middleware/auth.js'
import { emitSurveyCreated, emitSurveyUpdated } from '../ws/index.js'
import type { Survey } from '../types/models.js'

const ID_PARAMS = {
  type: 'object',
  properties: { id: { type: 'string', pattern: '^[0-9]+$' } },
} as const

const SLUG_PARAMS = {
  type: 'object',
  properties: { slug: { type: 'string', pattern: '^[a-zA-Z0-9_-]{1,100}$' } },
} as const

export async function surveysRoutes(app: FastifyInstance) {

  app.get('/surveys', async (_req, reply) => {
    const rows = await query<Survey>(`
      select id, slug, title, description, config, is_active, created_at
      from surveys
      where is_active = true
      order by created_at asc
    `)
    reply.send(rows)
  })

  app.get('/admin/surveys', { preHandler: requireAdminKey }, async (_req, reply) => {
    const rows = await query<Survey>(`
      select id, slug, title, description, config, is_active, created_at
      from surveys
      order by created_at asc
    `)
    reply.send(rows)
  })

  app.get<{ Params: { id: string } }>(
    '/admin/surveys/:id',
    {
      preHandler: requireAdminKey,
      schema: { params: ID_PARAMS },
    },
    async (req, reply) => {
      const row = await queryOne<Survey>(
        `select id, slug, title, description, config, is_active, created_at
         from surveys where id = $1`,
        [Number(req.params.id)],
      )
      if (!row) return reply.code(404).send({ error: 'Опрос не найден' })
      reply.send(row)
    },
  )

  app.get<{ Params: { slug: string } }>('/surveys/:slug', {
    schema: { params: SLUG_PARAMS },
  }, async (req, reply) => {
    const row = await queryOne<Survey>(
      `select id, slug, title, description, config, is_active, created_at
       from surveys where slug = $1 and is_active = true`,
      [req.params.slug],
    )
    if (!row) return reply.code(404).send({ error: 'Опрос не найден' })
    reply.send(row)
  })

  app.post<{ Body: { slug: string; title: string; description?: string; config: unknown } }>(
    '/admin/surveys',
    {
      preHandler: requireAdminKey,
      schema: {
        body: {
          type: 'object',
          required: ['slug', 'title'],
          properties: {
            slug:        { type: 'string', pattern: '^[a-zA-Z0-9_-]{1,100}$' },
            title:       { type: 'string', minLength: 1, maxLength: 300 },
            description: { type: 'string', maxLength: 2000 },
            config:      { type: 'object' },
          },
          additionalProperties: false,
        },
      },
    },
    async (req, reply) => {
      const { slug, title, description, config } = req.body

      const row = await queryOne<Survey>(
        `insert into surveys (slug, title, description, config)
         values ($1, $2, $3, $4)
         returning *`,
        [slug, title, description ?? null, JSON.stringify(config ?? {})],
      )
      if (!row) return reply.code(500).send({ error: 'Insert failed' })

      emitSurveyCreated({
        id: row.id,
        slug: row.slug,
        title: row.title,
      })

      reply.code(201).send(row)
    },
  )

  app.put<{ Params: { id: string }; Body: { config: unknown } }>(
    '/admin/surveys/:id/config',
    {
      preHandler: requireAdminKey,
      schema: {
        params: ID_PARAMS,
        body: {
          type: 'object',
          required: ['config'],
          properties: { config: { type: 'object' } },
          additionalProperties: false,
        },
      },
    },
    async (req, reply) => {
      const row = await queryOne<Survey>(
        `update surveys set config = $1 where id = $2 returning *`,
        [JSON.stringify(req.body.config), Number(req.params.id)],
      )
      if (!row) return reply.code(404).send({ error: 'Опрос не найден' })

      emitSurveyUpdated({
        id: row.id,
        slug: row.slug,
        title: row.title,
      })

      reply.send(row)
    },
  )

  app.put<{ Params: { id: string }; Body: { title?: string; description?: string; is_active?: boolean } }>(
    '/admin/surveys/:id',
    {
      preHandler: requireAdminKey,
      schema: {
        params: ID_PARAMS,
        body: {
          type: 'object',
          properties: {
            title:       { type: 'string', minLength: 1, maxLength: 300 },
            description: { type: 'string', maxLength: 2000 },
            is_active:   { type: 'boolean' },
          },
          additionalProperties: false,
        },
      },
    },
    async (req, reply) => {
      const { title, description, is_active } = req.body
      const row = await queryOne<Survey>(
        `update surveys
         set title       = coalesce($1, title),
             description = coalesce($2, description),
             is_active   = coalesce($3, is_active)
         where id = $4
         returning *`,
        [title ?? null, description ?? null, is_active ?? null, Number(req.params.id)],
      )
      if (!row) return reply.code(404).send({ error: 'Опрос не найден' })

      emitSurveyUpdated({
        id: row.id,
        slug: row.slug,
        title: row.title,
      })

      reply.send(row)
    },
  )

  app.delete<{ Params: { id: string } }>(
    '/admin/surveys/:id',
    {
      preHandler: requireAdminKey,
      schema: { params: ID_PARAMS },
    },
    async (req, reply) => {
      await query('delete from surveys where id = $1', [Number(req.params.id)])
      reply.code(204).send()
    },
  )
}
