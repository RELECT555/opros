import 'dotenv/config'
import { join } from 'node:path'
import Fastify, { type FastifyError } from 'fastify'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import rateLimit from '@fastify/rate-limit'
import websocket from '@fastify/websocket'
import fastifyJwt from '@fastify/jwt'
import multipart from '@fastify/multipart'
import fastifyStatic from '@fastify/static'
import { logger } from './logger.js'
import { surveysRoutes }  from './routes/surveys.js'
import { responsesRoutes } from './routes/responses.js'
import { tokensRoutes }    from './routes/tokens.js'
import { configRoutes }    from './routes/config.js'
import { uploadsRoutes }   from './routes/uploads.js'
import { authRoutes }      from './routes/auth.js'
import {
  handleConnection,
  setWsJwtVerifier,
  startHeartbeat,
  stopHeartbeat,
  getStats,
} from './ws/index.js'
import { runMigrations } from './db/migrate.js'
import { db } from './db/client.js'

// ── Миграции при старте ────────────────────────────────────
await runMigrations()

const app = Fastify({ loggerInstance: logger })

// ── Security headers ───────────────────────────────────────
await app.register(helmet, {
  contentSecurityPolicy: false,
})

// ── CORS ───────────────────────────────────────────────────
await app.register(cors, {
  origin: process.env.FRONTEND_URL ?? '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
})

// ── Rate limiting ──────────────────────────────────────────
await app.register(rateLimit, {
  max: 100,
  timeWindow: '1 minute',
  allowList: ['127.0.0.1', '::1'],
})

// ── JWT ────────────────────────────────────────────────────
const jwtSecret = process.env.JWT_SECRET ?? process.env.ADMIN_API_KEY
const JWT_DEV_FALLBACK = 'INSECURE-dev-only-fixed-do-not-use-in-production'
const jwtSecretEffective =
  jwtSecret && jwtSecret.length >= 16 ? jwtSecret : JWT_DEV_FALLBACK

if (!jwtSecret || jwtSecret.length < 16) {
  logger.warn(
    'JWT_SECRET не задан или слишком короткий (< 16 символов) — используется статический dev-фоллбэк (токены переживут перезапуск)',
  )
}

await app.register(fastifyJwt, {
  secret: jwtSecretEffective,
})

setWsJwtVerifier((token) => {
  try {
    const payload = app.jwt.verify<{ role?: string }>(token)
    return payload.role === 'admin'
  } catch {
    return false
  }
})

// ── Multipart (загрузка файлов) ────────────────────────────
await app.register(multipart, { limits: { fileSize: 2 * 1024 * 1024 } })

// ── Статика — раздача загруженных файлов ───────────────────
const uploadsDir = process.env.UPLOAD_DIR ?? join(process.cwd(), 'uploads')
await app.register(fastifyStatic, {
  root: uploadsDir,
  prefix: '/uploads/',
  decorateReply: false,
})

// ── WebSocket ──────────────────────────────────────────────
await app.register(websocket)

app.get('/ws', { websocket: true }, (socket) => {
  handleConnection(socket)
})

startHeartbeat()

// ── API роуты ──────────────────────────────────────────────
await app.register(async (api) => {
  // Жёсткий лимит на логин — 5 попыток в минуту
  await api.register(authRoutes)
  await api.register(surveysRoutes)
  await api.register(responsesRoutes)
  await api.register(tokensRoutes)
  await api.register(configRoutes)
  await api.register(uploadsRoutes)
}, { prefix: '/api' })

// ── Глобальный обработчик ошибок (не утекают стектрейсы) ──
app.setErrorHandler((error: FastifyError, _request, reply) => {
  if (error.validation) {
    return reply.code(400).send({
      error: 'Validation error',
      details: error.validation,
    })
  }

  if (error.statusCode && error.statusCode < 500) {
    return reply.code(error.statusCode).send({ error: error.message })
  }

  logger.error({ err: error }, 'unhandled error')
  reply.code(500).send({ error: 'Internal server error' })
})

// ── Health check ───────────────────────────────────────────
app.get('/health', async () => ({
  status: 'ok',
  ts: new Date().toISOString(),
  ws: getStats(),
}))

// ── Graceful shutdown ──────────────────────────────────────
async function shutdown(signal: string) {
  logger.info({ signal }, 'завершение работы...')
  stopHeartbeat()
  await app.close()
  await db.end()
  logger.info('✅ Сервер остановлен')
  process.exit(0)
}

process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT',  () => shutdown('SIGINT'))

// ── Старт ──────────────────────────────────────────────────
const port = Number(process.env.PORT ?? 3001)
await app.listen({ port, host: '0.0.0.0' })

logger.info({ port }, '✅ API запущен (HTTP + WebSocket)')
