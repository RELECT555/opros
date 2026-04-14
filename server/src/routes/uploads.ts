import type { FastifyInstance } from 'fastify'
import { randomUUID } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import { join, extname, basename } from 'node:path'
import { requireAdminKey } from '../middleware/auth.js'
import { httpLog } from '../logger.js'

const ALLOWED_EXT = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg'])
const ALLOWED_MIME = new Set([
  'image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/svg+xml',
])
const MAX_SIZE = 2 * 1024 * 1024

function _uploadsDir(): string {
  return process.env.UPLOAD_DIR ?? join(process.cwd(), 'uploads')
}

function _sanitizeFilename(raw: string): string {
  return basename(raw).replace(/[^a-zA-Z0-9._-]/g, '_')
}

export async function uploadsRoutes(app: FastifyInstance) {

  app.post<{ Querystring: { survey_id?: string } }>(
    '/admin/uploads/logo',
    { preHandler: requireAdminKey },
    async (req, reply) => {
      const file = await req.file()
      if (!file) {
        return reply.code(400).send({ error: 'Файл не передан' })
      }

      const safe = _sanitizeFilename(file.filename)
      const ext = extname(safe).toLowerCase()

      if (!ALLOWED_EXT.has(ext)) {
        return reply.code(400).send({ error: `Допустимые форматы: ${[...ALLOWED_EXT].join(', ')}` })
      }
      if (!ALLOWED_MIME.has(file.mimetype)) {
        return reply.code(400).send({ error: 'Недопустимый MIME-тип файла' })
      }

      const chunks: Buffer[] = []
      let size = 0
      for await (const chunk of file.file) {
        size += chunk.length
        if (size > MAX_SIZE) {
          return reply.code(413).send({ error: 'Максимальный размер файла 2 МБ' })
        }
        chunks.push(chunk)
      }

      if (size === 0) {
        return reply.code(400).send({ error: 'Файл пустой' })
      }

      const surveyIdRaw = req.query.survey_id ?? 'general'
      const surveyId = String(surveyIdRaw).replace(/[^a-zA-Z0-9_-]/g, '')
      if (!surveyId) {
        return reply.code(400).send({ error: 'Некорректный survey_id' })
      }

      const dir = join(_uploadsDir(), 'logos', surveyId)
      await mkdir(dir, { recursive: true })

      const filename = `${randomUUID()}${ext}`
      const filepath = join(dir, filename)
      await writeFile(filepath, Buffer.concat(chunks))

      const baseUrl = process.env.PUBLIC_URL ?? `http://localhost:${process.env.PORT ?? 3001}`
      const publicUrl = `${baseUrl}/uploads/logos/${surveyId}/${filename}`

      httpLog.debug({ filepath, publicUrl, size }, 'файл загружен')
      reply.send({ url: publicUrl })
    },
  )
}
