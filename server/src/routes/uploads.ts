import type { FastifyInstance } from 'fastify'
import { randomUUID } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import { join, extname, basename } from 'node:path'
import { requireAdminKey } from '../middleware/auth.js'
import { canAccessSurvey } from '../lib/access.js'
import { isFullAccess } from '../types/auth.js'
import { httpLog } from '../logger.js'

const ALLOWED_EXT = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif'])
const ALLOWED_MIME = new Set([
  'image/png', 'image/jpeg', 'image/webp', 'image/gif',
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

      if (file.file.truncated) {
        return reply.code(413).send({ error: 'Максимальный размер файла 2 МБ' })
      }
      if (size === 0) {
        return reply.code(400).send({ error: 'Файл пустой' })
      }

      const ctx = req.authCtx!
      const surveyIdRaw = req.query.survey_id ?? 'general'
      const surveyId = String(surveyIdRaw).replace(/[^a-zA-Z0-9_-]/g, '')
      if (!surveyId) {
        return reply.code(400).send({ error: 'Некорректный survey_id' })
      }
      const numericId = /^\d+$/.test(surveyId) ? Number(surveyId) : NaN
      if (Number.isFinite(numericId)) {
        if (!(await canAccessSurvey(ctx, numericId))) {
          return reply.code(403).send({ error: 'Нет доступа к опросу' })
        }
      } else if (!isFullAccess(ctx)) {
        return reply.code(403).send({ error: 'Нет доступа' })
      }

      if (process.env.OPROS_HOSTED === 'true') {
        const path = `${surveyId}/${randomUUID()}${ext}`
        const base = process.env.SUPABASE_URL!
        const response = await fetch(`${base}/storage/v1/object/survey-logos/${path}`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY!}`,
            'Content-Type': file.mimetype,
          },
          body: new Uint8Array(Buffer.concat(chunks)),
          signal: AbortSignal.timeout(15000),
        })
        if (!response.ok) return reply.code(502).send({ error: 'Не удалось загрузить файл' })
        return reply.send({ url: `${base}/storage/v1/object/public/survey-logos/${path}` })
      }
      const dir = join(_uploadsDir(), 'logos', surveyId)
      await mkdir(dir, { recursive: true })

      const filename = `${randomUUID()}${ext}`
      const filepath = join(dir, filename)
      await writeFile(filepath, Buffer.concat(chunks))

      const baseUrl = (process.env.PUBLIC_URL ?? '').replace(/\/+$/, '')
      const publicUrl = `${baseUrl}/uploads/logos/${surveyId}/${filename}`

      httpLog.debug({ filepath, publicUrl, size }, 'файл загружен')
      reply.send({ url: publicUrl })
    },
  )
}
