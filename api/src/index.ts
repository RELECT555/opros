import 'dotenv/config'
import Fastify from 'fastify'
import cors from '@fastify/cors'
import { surveysRoutes }  from './routes/surveys.js'
import { responsesRoutes } from './routes/responses.js'
import { tokensRoutes }    from './routes/tokens.js'

const app = Fastify({ logger: true })

// CORS — разрешаем фронтенду обращаться к API
await app.register(cors, {
  origin: process.env.FRONTEND_URL ?? '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
})

// Все роуты под /api
await app.register(async (api) => {
  await api.register(surveysRoutes)
  await api.register(responsesRoutes)
  await api.register(tokensRoutes)
}, { prefix: '/api' })

// Health check
app.get('/health', async () => ({ status: 'ok', ts: new Date().toISOString() }))

const port = Number(process.env.PORT ?? 3001)
await app.listen({ port, host: '0.0.0.0' })

console.log(`✅ API запущен на http://localhost:${port}`)
