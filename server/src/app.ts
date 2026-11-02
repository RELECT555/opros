import 'dotenv/config'
import { randomBytes } from 'node:crypto'
import { join } from 'node:path'
import Fastify, { type FastifyError, type FastifyInstance } from 'fastify'
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
import { manualLeadsRoutes } from './routes/manualLeads.js'
import { leadProjectsRoutes } from './routes/leadProjects.js'
import { authRoutes }      from './routes/auth.js'
import { setAuthApp }      from './middleware/auth.js'
import {
  handleConnection,
  setWsJwtVerifier,
  startHeartbeat,
  stopHeartbeat,
  getStats,
} from './ws/index.js'
import { queryOne } from './db/client.js'

export async function buildApp({ hosted = false }: { hosted?: boolean } = {}) {

  const app = Fastify({ loggerInstance: logger })

  // ── Security headers ───────────────────────────────────────
  await app.register(helmet, {
    contentSecurityPolicy: false,
  })

  // ── CORS ───────────────────────────────────────────────────
  function corsOrigin(): boolean | string | string[] {
    const raw = process.env.FRONTEND_URL?.trim()
    if (raw) {
      if (raw.includes(',')) {
        return raw.split(',').map((s) => s.trim()).filter(Boolean)
      }
      return raw
    }
    /* Без FRONTEND_URL в dev отражаем Origin — иначе Vite (:5173) и другие порты не попадут в allow list */
    if (process.env.NODE_ENV !== 'production') {
      return true
    }
    return '*'
  }

  await app.register(cors, {
    origin: corsOrigin(),
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    maxAge: 86400,
  })

  // ── Rate limiting ──────────────────────────────────────────
  await app.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
    allowList: process.env.NODE_ENV === 'production' ? [] : ['127.0.0.1', '::1'],
  })

  // ── JWT ────────────────────────────────────────────────────
  const storedSecret = hosted
    ? await queryOne<{ value: string }>("select value from opros_private.settings where key = 'jwt_secret'")
    : null
  const jwtSecret = process.env.JWT_SECRET ?? storedSecret?.value
  if (process.env.NODE_ENV === 'production' && (!jwtSecret || jwtSecret.length < 32)) {
    throw new Error('A JWT secret of at least 32 characters is required in production')
  }

  await app.register(fastifyJwt, {
    secret: jwtSecret && jwtSecret.length >= 32 ? jwtSecret : randomBytes(32).toString('hex'),
  })

  setAuthApp(app as unknown as FastifyInstance)

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
  if (!hosted) {
    const uploadsDir = process.env.UPLOAD_DIR ?? join(process.cwd(), 'uploads')
    await app.register(fastifyStatic, {
      root: uploadsDir,
      prefix: '/uploads/',
      decorateReply: false,
    })
  }

  // ── WebSocket ──────────────────────────────────────────────
  if (!hosted) {
    await app.register(websocket, { options: { maxPayload: 4096 } })
    app.get('/ws', { websocket: true }, (socket) => {
      handleConnection(socket)
    })
    startHeartbeat()
    app.addHook('onClose', async () => stopHeartbeat())
  }

  // ── API роуты ──────────────────────────────────────────────
  await app.register(async (api) => {
    // Жёсткий лимит на логин — 5 попыток в минуту
    await api.register(authRoutes)
    await api.register(surveysRoutes)
    await api.register(responsesRoutes)
    await api.register(tokensRoutes)
    await api.register(configRoutes)
    await api.register(uploadsRoutes)
    await api.register(manualLeadsRoutes)
    await api.register(leadProjectsRoutes)
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

  await app.ready()
  return app
}
