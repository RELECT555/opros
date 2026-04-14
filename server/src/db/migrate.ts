import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { db } from './client.js'
import { dbLog } from '../logger.js'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const MIGRATIONS_DIR = join(__dirname, '..', '..', 'migrations')

async function _ensureMigrationsTable(): Promise<void> {
  await db.query(`
    create table if not exists _migrations (
      id         serial primary key,
      filename   text unique not null,
      applied_at timestamptz not null default now()
    )
  `)
}

async function _getApplied(): Promise<Set<string>> {
  const { rows } = await db.query<{ filename: string }>(
    'select filename from _migrations order by id',
  )
  return new Set(rows.map(r => r.filename))
}

export async function runMigrations(): Promise<void> {
  let files: string[]
  try {
    files = await readdir(MIGRATIONS_DIR)
  } catch {
    dbLog.info('папка migrations/ не найдена — миграции пропущены')
    return
  }

  const sqlFiles = files
    .filter(f => f.endsWith('.sql'))
    .sort()

  if (sqlFiles.length === 0) {
    dbLog.info('нет SQL-миграций для применения')
    return
  }

  await _ensureMigrationsTable()
  const applied = await _getApplied()

  let count = 0
  for (const file of sqlFiles) {
    if (applied.has(file)) continue

    const sql = await readFile(join(MIGRATIONS_DIR, file), 'utf-8')
    const client = await db.connect()
    try {
      await client.query('begin')
      await client.query(sql)
      await client.query(
        'insert into _migrations (filename) values ($1)',
        [file],
      )
      await client.query('commit')
      dbLog.info({ file }, 'миграция применена')
      count++
    } catch (err) {
      await client.query('rollback')
      dbLog.fatal({ err, file }, 'миграция провалилась — откат')
      throw err
    } finally {
      client.release()
    }
  }

  if (count === 0) {
    dbLog.info('все миграции уже применены')
  } else {
    dbLog.info({ count }, 'миграции завершены')
  }
}
