import type { FastifyInstance } from 'fastify'
import { query, queryOne } from '../db/client.js'
import { requireAdminKey, requireGlobalAdmin } from '../middleware/auth.js'
import { accessibleSurveyIds, canAccessSurvey } from '../lib/access.js'
import { getProfileByEmail } from '../lib/profile-sync.js'
import { emitSurveyCreated, emitSurveyUpdated } from '../ws/index.js'
import type { Survey } from '../types/models.js'
import type { AuthContext } from '../types/auth.js'
import { isFullAccess } from '../types/auth.js'
import { validateSurveyConfig } from '../lib/survey-config-validation.js'

const ID_PARAMS = {
  type: 'object',
  properties: { id: { type: 'string', pattern: '^[0-9]+$' } },
} as const

const SLUG_PARAMS = {
  type: 'object',
  properties: { slug: { type: 'string', pattern: '^[a-zA-Z0-9_-]{1,100}$' } },
} as const

const SURVEY_SELECT = `
  id, revision, slug, title, description, config, is_active, created_at, owner_id
`

async function canDeleteSurvey(ctx: AuthContext, surveyId: number): Promise<boolean> {
  if (isFullAccess(ctx)) return true
  if (ctx.kind !== 'oauth') return false
  const row = await queryOne<{ owner_id: string | null }>(
    `select owner_id from surveys where id = $1`,
    [surveyId],
  )
  return row?.owner_id === ctx.userId
}

export async function surveysRoutes(app: FastifyInstance) {

  app.get('/surveys', async (_req, reply) => {
    const rows = await query<Survey>(`
      select ${SURVEY_SELECT}
      from surveys
      where is_active = true
      order by created_at asc
    `)
    reply.send(rows)
  })

  app.get('/admin/surveys', { preHandler: requireAdminKey }, async (req, reply) => {
    const ctx = req.authCtx!

    if (isFullAccess(ctx)) {
      const rows = await query<Survey>(`
        select ${SURVEY_SELECT}
        from surveys
        order by created_at asc
      `)
      return reply.send(rows)
    }

    const ids = await accessibleSurveyIds(ctx)
    if (ids.length === 0) return reply.send([])

    const rows = await query<Survey>(
      `select ${SURVEY_SELECT}
       from surveys
       where id = any($1::bigint[])
       order by created_at asc`,
      [ids],
    )
    reply.send(rows)
  })

  app.get<{ Params: { id: string } }>(
    '/admin/surveys/:id',
    {
      preHandler: requireAdminKey,
      schema: { params: ID_PARAMS },
    },
    async (req, reply) => {
      const ctx = req.authCtx!
      const id = Number(req.params.id)
      const row = await queryOne<Survey>(
        `select ${SURVEY_SELECT}
         from surveys where id = $1`,
        [id],
      )
      if (!row) return reply.code(404).send({ error: 'Опрос не найден' })
      if (!(await canAccessSurvey(ctx, id))) {
        return reply.code(403).send({ error: 'Нет доступа к опросу' })
      }
      reply.send(row)
    },
  )

  app.get<{ Params: { slug: string } }>('/surveys/:slug', {
    schema: { params: SLUG_PARAMS },
  }, async (req, reply) => {
    const row = await queryOne<Survey>(
      `select ${SURVEY_SELECT}
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
      const ctx = req.authCtx!
      const { slug, title, description, config = { questions: [] } } = req.body
      const configError = validateSurveyConfig(config)
      if (configError) return reply.code(400).send({ error: configError, code: 'INVALID_SURVEY_CONFIG' })
      const ownerId = ctx.kind === 'oauth' ? ctx.userId : null

      const row = await queryOne<Survey>(
        `insert into surveys (slug, title, description, config, owner_id)
         values ($1, $2, $3, $4, $5)
         returning *`,
        [slug, title, description ?? null, JSON.stringify(config ?? {}), ownerId],
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

  app.put<{ Params: { id: string }; Body: { config: unknown; expected_revision: number } }>(
    '/admin/surveys/:id/config',
    {
      preHandler: requireAdminKey,
      schema: {
        params: ID_PARAMS,
        body: {
          type: 'object',
          required: ['config', 'expected_revision'],
          properties: {
            config: { type: 'object' },
            expected_revision: { type: 'integer', minimum: 1, maximum: 2_147_483_646 },
          },
          additionalProperties: false,
        },
      },
    },
    async (req, reply) => {
      const ctx = req.authCtx!
      const id = Number(req.params.id)
      if (!(await canAccessSurvey(ctx, id))) {
        return reply.code(403).send({ error: 'Нет доступа к опросу' })
      }
      const configError = validateSurveyConfig(req.body.config)
      if (configError) return reply.code(400).send({ error: configError, code: 'INVALID_SURVEY_CONFIG' })
      const row = await queryOne<Survey>(
        `update surveys set config = $1, revision = revision + 1
         where id = $2 and revision = $3 returning *`,
        [JSON.stringify(req.body.config), id, req.body.expected_revision],
      )
      if (!row) {
        const current = await queryOne<{ revision: number }>('select revision from surveys where id = $1', [id])
        if (!current) return reply.code(404).send({ error: 'Опрос не найден' })
        return reply.code(409).send({ error: 'Опрос изменён другим редактором. Загрузите актуальную версию перед сохранением.',
          code: 'SURVEY_REVISION_CONFLICT', current_revision: current.revision })
      }

      emitSurveyUpdated({
        id: row.id,
        slug: row.slug,
        title: row.title,
      })

      reply.send(row)
    },
  )

  app.put<{ Params: { id: string }; Body: { title?: string; description?: string; is_active?: boolean; slug?: string } }>(
    '/admin/surveys/:id',
    {
      preHandler: requireAdminKey,
      schema: {
        params: ID_PARAMS,
        body: {
          type: 'object',
          properties: {
            slug:        { type: 'string', pattern: '^[a-zA-Z0-9_-]{1,100}$' },
            title:       { type: 'string', minLength: 1, maxLength: 300 },
            description: { type: 'string', maxLength: 2000 },
            is_active:   { type: 'boolean' },
          },
          additionalProperties: false,
        },
      },
    },
    async (req, reply) => {
      const ctx = req.authCtx!
      const id = Number(req.params.id)
      if (!(await canAccessSurvey(ctx, id))) {
        return reply.code(403).send({ error: 'Нет доступа к опросу' })
      }
      const { title, description, is_active, slug: slugRaw } = req.body
      const slug = slugRaw?.trim()
      if (slug !== undefined && slug.length > 0) {
        const taken = await queryOne<{ id: number }>(
          `select id from surveys where slug = $1 and id <> $2`,
          [slug, id],
        )
        if (taken) {
          return reply.code(409).send({ error: 'Такой URL (slug) уже занят' })
        }
      }
      const row = await queryOne<Survey>(
        `update surveys
         set slug        = coalesce($1, slug),
             title       = coalesce($2, title),
             description = coalesce($3, description),
             is_active   = coalesce($4, is_active)
         where id = $5
         returning *`,
        [slug ?? null, title ?? null, description ?? null, is_active ?? null, id],
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
      const ctx = req.authCtx!
      const id = Number(req.params.id)
      if (!(await canDeleteSurvey(ctx, id))) {
        return reply.code(403).send({ error: 'Удалить может только владелец или администратор' })
      }
      const deleted = await queryOne<{ id: number }>(
        `delete from surveys where id = $1 returning id`,
        [id],
      )
      if (!deleted) return reply.code(404).send({ error: 'Опрос не найден' })
      reply.code(204).send()
    },
  )

  app.post<{ Params: { id: string }; Body: { email: string } }>(
    '/admin/surveys/:id/share',
    {
      preHandler: requireGlobalAdmin,
      schema: {
        params: ID_PARAMS,
        body: {
          type: 'object',
          required: ['email'],
          properties: {
            email: { type: 'string', format: 'email', maxLength: 320 },
          },
          additionalProperties: false,
        },
      },
    },
    async (req, reply) => {
      const ctx = req.authCtx!
      const surveyId = Number(req.params.id)
      const survey = await queryOne<{ id: number }>(
        `select id from surveys where id = $1`,
        [surveyId],
      )
      if (!survey) return reply.code(404).send({ error: 'Опрос не найден' })

      const profile = await getProfileByEmail(req.body.email)
      if (!profile) {
        return reply.code(404).send({
          error: 'Пользователь с таким email ещё не заходил в систему',
        })
      }

      const grantedBy = ctx.kind === 'oauth' ? ctx.userId : null

      await query(
        `insert into survey_access (survey_id, user_id, granted_by)
         values ($1, $2, $3)
         on conflict (survey_id, user_id) do update set
           granted_by = excluded.granted_by,
           granted_at = now()`,
        [surveyId, profile.id, grantedBy],
      )

      reply.send({ ok: true, user_id: profile.id, email: profile.email })
    },
  )
}
