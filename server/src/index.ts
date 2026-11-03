import 'dotenv/config'
import { buildApp } from './app.js'
import { runMigrations } from './db/migrate.js'
import { db } from './db/client.js'
import { logger } from './logger.js'

await runMigrations()
const app = await buildApp()
const port = Number(process.env.PORT ?? 3001)
await app.listen({ port, host: '0.0.0.0' })
logger.info({ port }, 'API started')

async function shutdown() {
  await app.close()
  await db.end()
  process.exit(0)
}
process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)
