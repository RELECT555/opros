import type { FastifyInstance } from 'fastify'
import { query, queryOne } from '../db/client.js'
import { requireAdminKey } from '../middleware/auth.js'

export async function surveysRoutes(app: FastifyInstance) {

  // GET /api/surveys — список всех опросников (публичный: только активные)
  app.get('/surveys', async (_req, reply) => {
    const rows = await query(`
      select id, slug, title, description, config, is_active, created_at
      from surveys
      where is_active = true
      order by created_at asc
    `)
    reply.send(rows)
  })

  // GET /api/admin/surveys — все опросники для админки
  app.get('/admin/surveys', { preHandler: requireAdminKey }, async (_req, reply) => {
    const rows = await query(`
      select id, slug, title, description, config, is_active, created_at
      from surveys
      order by created_at asc
    `)
    reply.send(rows)
  })

  // GET /api/surveys/:slug — опросник по slug (для публичной страницы)
  app.get<{ Params: { slug: string } }>('/surveys/:slug', async (req, reply) => {
    const row = await queryOne(
      `select id, slug, title, description, config, is_active, created_at
       from surveys where slug = $1 and is_active = true`,
      [req.params.slug],
    )
    if (!row) return reply.code(404).send({ error: 'Опрос не найден' })
    reply.send(row)
  })

  // POST /api/admin/surveys — создать опросник
  app.post<{ Body: { slug: string; title: string; description?: string; config: unknown } }>(
    '/admin/surveys',
    { preHandler: requireAdminKey },
    async (req, reply) => {
      const { slug, title, description, config } = req.body
      if (!slug || !title) return reply.code(400).send({ error: 'slug и title обязательны' })

      const row = await queryOne(
        `insert into surveys (slug, title, description, config)
         values ($1, $2, $3, $4)
         returning *`,
        [slug, title, description ?? null, JSON.stringify(config ?? {})],
      )
      reply.code(201).send(row)
    },
  )

  // PUT /api/admin/surveys/:id/config — обновить конфиг опросника
  app.put<{ Params: { id: string }; Body: { config: unknown } }>(
    '/admin/surveys/:id/config',
    { preHandler: requireAdminKey },
    async (req, reply) => {
      const row = await queryOne(
        `update surveys set config = $1 where id = $2 returning *`,
        [JSON.stringify(req.body.config), req.params.id],
      )
      if (!row) return reply.code(404).send({ error: 'Опрос не найден' })
      reply.send(row)
    },
  )

  // PUT /api/admin/surveys/:id — обновить мета (title, description, is_active)
  app.put<{ Params: { id: string }; Body: { title?: string; description?: string; is_active?: boolean } }>(
    '/admin/surveys/:id',
    { preHandler: requireAdminKey },
    async (req, reply) => {
      const { title, description, is_active } = req.body
      const row = await queryOne(
        `update surveys
         set title       = coalesce($1, title),
             description = coalesce($2, description),
             is_active   = coalesce($3, is_active)
         where id = $4
         returning *`,
        [title ?? null, description ?? null, is_active ?? null, req.params.id],
      )
      if (!row) return reply.code(404).send({ error: 'Опрос не найден' })
      reply.send(row)
    },
  )

  // DELETE /api/admin/surveys/:id
  app.delete<{ Params: { id: string } }>(
    '/admin/surveys/:id',
    { preHandler: requireAdminKey },
    async (req, reply) => {
      await query('delete from surveys where id = $1', [req.params.id])
      reply.code(204).send()
    },
  )
}
