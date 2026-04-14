import type { FastifyRequest, FastifyReply } from 'fastify'

/**
 * Проверяет заголовок Authorization: Bearer <jwt>
 * Единственный механизм — JWT, выданный POST /api/auth/login.
 */
export async function requireAdminKey(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const header = request.headers.authorization ?? ''
  const token  = header.startsWith('Bearer ') ? header.slice(7) : ''

  if (!token) {
    return reply.code(401).send({ error: 'Unauthorized' })
  }

  try {
    await request.jwtVerify()
  } catch {
    return reply.code(401).send({ error: 'Unauthorized' })
  }
}
