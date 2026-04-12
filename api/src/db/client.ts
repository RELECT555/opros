import pg from 'pg'
import 'dotenv/config'
import { dbLog } from '../logger.js'

const { Pool } = pg

if (!process.env.DATABASE_URL) {
  dbLog.fatal('DATABASE_URL не задан в .env — выход')
  process.exit(1)
}

export const db = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30_000,
})

db.on('connect', () => dbLog.debug('новое соединение из пула'))
db.on('error', (err) => dbLog.error({ err }, 'PostgreSQL pool error'))

/** Простой хелпер для типизированных запросов */
export async function query<T = Record<string, unknown>>(
  sql: string,
  params?: unknown[],
): Promise<T[]> {
  const result = await db.query(sql, params)
  return result.rows as T[]
}

export async function queryOne<T = Record<string, unknown>>(
  sql: string,
  params?: unknown[],
): Promise<T | null> {
  const rows = await query<T>(sql, params)
  return rows[0] ?? null
}
