import { query, queryOne } from '../db/client.js'

function _parseGlobalAdminEmails(): Set<string> {
  const raw = process.env.GLOBAL_ADMIN_EMAILS ?? ''
  const set = new Set<string>()
  for (const part of raw.split(',')) {
    const e = part.trim().toLowerCase()
    if (e) set.add(e)
  }
  return set
}

/**
 * Создаёт/обновляет профиль и флаг глобального админа по списку GLOBAL_ADMIN_EMAILS.
 */
export async function ensureProfile(
  userId: string,
  email: string,
  displayName?: string | null,
): Promise<{ isGlobalAdmin: boolean }> {
  const admins = _parseGlobalAdminEmails()
  const isGlobalAdmin = admins.has(email.trim().toLowerCase())

  await query(
    `insert into profiles (id, email, display_name, is_global_admin, updated_at)
     values ($1, lower(trim($2)), $3, $4, now())
     on conflict (id) do update set
       email = lower(trim(excluded.email)),
       display_name = coalesce(excluded.display_name, profiles.display_name),
       is_global_admin = excluded.is_global_admin,
       updated_at = now()`,
    [userId, email, displayName ?? null, isGlobalAdmin],
  )

  return { isGlobalAdmin }
}

export async function getProfileByEmail(
  email: string,
): Promise<{ id: string; email: string } | null> {
  return queryOne<{ id: string; email: string }>(
    `select id, email from profiles where lower(trim(email)) = lower(trim($1)) limit 1`,
    [email],
  )
}
