import type { FastifyRequest, FastifyReply } from 'fastify'

/**
 * Проверяет заголовок Authorization: Bearer <ADMIN_API_KEY>
 * Используется на всех admin-роутах (/api/admin/*)
 */
export async function requireAdminKey(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const header = request.headers.authorization ?? ''
  const token  = header.startsWith('Bearer ') ? header.slice(7) : ''

  if (!token || token !== process.env.ADMIN_API_KEY) {
    reply.code(401).send({ error: 'Unauthorized' })
  }
}
