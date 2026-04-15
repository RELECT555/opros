import { query, queryOne } from '../db/client.js'
import type { AuthContext } from '../types/auth.js'
import { isFullAccess } from '../types/auth.js'

export async function accessibleSurveyIds(
  ctx: AuthContext,
): Promise<number[] | 'all'> {
  if (isFullAccess(ctx)) return 'all'
  if (ctx.kind !== 'oauth') return []
  const rows = await query<{ id: number }>(
    `select id from surveys where owner_id = $1
     union
     select survey_id as id from survey_access where user_id = $1`,
    [ctx.userId],
  )
  return rows.map((r) => r.id)
}

export async function canAccessSurvey(
  ctx: AuthContext,
  surveyId: number,
): Promise<boolean> {
  if (isFullAccess(ctx)) return true
  if (ctx.kind !== 'oauth') return false

  const row = await queryOne<{ owner_id: string | null }>(
    `select owner_id from surveys where id = $1`,
    [surveyId],
  )
  if (!row) return false
  if (row.owner_id === ctx.userId) return true

  const grant = await queryOne<{ ok: number }>(
    `select 1 as ok from survey_access where survey_id = $1 and user_id = $2`,
    [surveyId, ctx.userId],
  )
  if (grant) return true

  /* Наследие: owner_id null — только полный доступ или явная выдача (уже проверили grant). */
  return false
}

export async function canAccessResponse(
  ctx: AuthContext,
  responseId: number,
): Promise<boolean> {
  const row = await queryOne<{ survey_id: number | null }>(
    `select survey_id from survey_responses where id = $1`,
    [responseId],
  )
  if (!row?.survey_id) return isFullAccess(ctx)
  return canAccessSurvey(ctx, row.survey_id)
}
