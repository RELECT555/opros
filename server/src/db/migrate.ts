import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Pool, PoolClient } from 'pg'
import { db } from './client.js'
import { dbLog } from '../logger.js'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const MIGRATIONS_DIR = join(__dirname, '..', '..', 'migrations')
// Session lock shared by API instances; retain the same connection until unlock.
const MIGRATION_LOCK = [1095977804, 1498237255]

async function ensureMigrationsTable(client: PoolClient): Promise<void> {
  await client.query(`
    create table if not exists _migrations (
      id         serial primary key,
      filename   text unique not null,
      applied_at timestamptz not null default now()
    )
  `)
}

export async function runMigrations({
  pool = db,
  migrationsDir = MIGRATIONS_DIR,
}: { pool?: Pool; migrationsDir?: string } = {}): Promise<void> {
  // Missing build artifacts must stop startup rather than report a ready API.
  const sqlFiles = (await readdir(migrationsDir)).filter(file => file.endsWith('.sql')).sort()
  if (!sqlFiles.length) throw new Error('No SQL migrations found')

  const client = await pool.connect()
  let locked = false
  let releaseError: Error | undefined
  try {
    await client.query('select pg_advisory_lock($1, $2)', MIGRATION_LOCK)
    locked = true
    await ensureMigrationsTable(client)
    // Read history after acquiring the lock; a concurrent process may have applied it.
    const { rows } = await client.query<{ filename: string }>('select filename from _migrations order by id')
    const applied = new Set(rows.map(row => row.filename))
    let count = 0
    for (const file of sqlFiles) {
      if (applied.has(file)) continue
      const sql = await readFile(join(migrationsDir, file), 'utf-8')
      try {
        await client.query('begin')
        await client.query(sql)
        await client.query('insert into _migrations (filename) values ($1)', [file])
        await client.query('commit')
        dbLog.info({ file }, 'миграция применена')
        count++
      } catch (error) {
        try { await client.query('rollback') } catch (rollbackError) {
          releaseError = rollbackError instanceof Error ? rollbackError : new Error('Migration rollback failed')
        }
        dbLog.fatal({ err: error, file }, 'миграция провалилась — запуск остановлен')
        throw error
      }
    }
    dbLog.info({ count }, count ? 'миграции завершены' : 'все миграции уже применены')
  } finally {
    if (locked) {
      try { await client.query('select pg_advisory_unlock($1, $2)', MIGRATION_LOCK) } catch (error) {
        releaseError = error instanceof Error ? error : new Error('Migration unlock failed')
      }
    }
    // Destroy a broken session so a session-level lock can never return to the pool.
    client.release(releaseError)
  }
}
