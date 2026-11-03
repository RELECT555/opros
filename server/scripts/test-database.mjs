import assert from 'node:assert/strict'
import { randomBytes, randomUUID } from 'node:crypto'
import { mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { basename, dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import pg from 'pg'

// Never fall back to DATABASE_URL or dotenv. Only an explicit, local test target is accepted.
const raw = process.env.TEST_DATABASE_URL
if (!raw) throw new Error('TEST_DATABASE_URL is required; use a disposable local PostgreSQL instance')
const target = new URL(raw)
if (!['postgres:', 'postgresql:'].includes(target.protocol) ||
    !['localhost', '127.0.0.1', '[::1]'].includes(target.hostname) ||
    !/^\/askly_test(?:_[a-z0-9_]+)?$/i.test(target.pathname) || target.search) {
  throw new Error('TEST_DATABASE_URL must address a loopback database named askly_test or askly_test_*')
}

const root = fileURLToPath(new URL('../../', import.meta.url))
const admin = new pg.Client({ connectionString: raw, connectionTimeoutMillis: 5_000 })
const databases = []
const pools = []
let app
let temp
const databaseUrl = name => {
  const url = new URL(target)
  url.pathname = `/${name}`
  return url.href
}
async function createDatabase(label) {
  const name = `askly_test_${label}_${randomBytes(8).toString('hex')}`
  await admin.query(`create database "${name}"`)
  databases.push(name)
  return name
}
const config = { questions: [{ id: 'q', type: 'radio', title: 'Original question', options: ['A', 'B'] }], contacts_block: { disabled: true } }

try {
  await admin.connect()
  const name = await createDatabase('server')
  process.env.DATABASE_URL = databaseUrl(name)
  process.env.NODE_ENV = 'test'
  process.env.LOG_LEVEL = 'silent'
  process.env.JWT_SECRET = 'test-database-secret-at-least-32-characters'
  process.env.OPROS_HOSTED = 'false'
  process.env.TELEGRAM_BOT_TOKEN = ''
  const { db } = await import('../src/db/client.ts')
  pools.push(db)
  const { runMigrations } = await import('../src/db/migrate.ts')
  const migrationFiles = (await readdir(resolve(root, 'server/migrations'))).filter(file => file.endsWith('.sql'))
  await Promise.all([runMigrations(), runMigrations()])
  await runMigrations()
  const applied = await db.query('select filename from _migrations')
  assert.equal(applied.rowCount, migrationFiles.length)
  assert.equal(new Set(applied.rows.map(row => row.filename)).size, migrationFiles.length)
  console.log('PASS: fresh server schema, concurrent startup and idempotent migration history')

  temp = await mkdtemp(join(tmpdir(), 'askly-migration-test-'))
  await writeFile(join(temp, '999_failed_test.sql'), 'create table rollback_probe(id int); select nonexistent_migration_probe();')
  await assert.rejects(runMigrations({ migrationsDir: temp }))
  assert.equal((await db.query("select to_regclass('public.rollback_probe') as name")).rows[0].name, null)
  assert.equal((await db.query("select count(*)::int as count from _migrations where filename='999_failed_test.sql'")).rows[0].count, 0)
  const independent = new pg.Client({ connectionString: databaseUrl(name), connectionTimeoutMillis: 5_000 })
  await independent.connect()
  try {
    assert.equal((await independent.query('select pg_try_advisory_lock($1, $2) as locked', [1095977804, 1498237255])).rows[0].locked, true)
    await independent.query('select pg_advisory_unlock($1, $2)', [1095977804, 1498237255])
  } finally { await independent.end() }
  console.log('PASS: failed DDL rolls back with no history entry and releases its lock')

  const { buildApp } = await import('../src/app.ts')
  app = await buildApp()
  const headers = { authorization: `Bearer ${app.jwt.sign({ role: 'admin' })}` }
  const created = await app.inject({ method: 'POST', url: '/api/admin/surveys', headers,
    payload: { slug: 'integration', title: 'Integration test', config } })
  assert.equal(created.statusCode, 201, created.body)
  const survey = created.json()
  const id = Number(survey.id)
  const token = randomBytes(16).toString('hex')
  await db.query('insert into survey_tokens(token,email,survey_id) values($1,$2,$3)', [token, 'test@example.com', id])
  const payload = { survey_id: id, survey_revision: survey.revision, answers: { q: 'A' }, token }
  const submissions = await Promise.all([1, 2].map(() => app.inject({ method: 'POST', url: '/api/responses', payload })))
  assert.deepEqual(submissions.map(response => response.statusCode).sort(), [201, 409])
  assert.equal((await db.query('select count(*)::int as count from survey_responses where survey_id=$1', [id])).rows[0].count, 1)
  assert.ok((await db.query('select used_at from survey_tokens where token=$1', [token])).rows[0].used_at)
  const configs = [structuredClone(config), structuredClone(config)]
  configs[0].questions[0].title = 'First editor'
  configs[1].questions[0].title = 'Second editor'
  const writes = await Promise.all(configs.map(next => app.inject({ method: 'PUT', url: `/api/admin/surveys/${id}/config`, headers,
    payload: { config: next, expected_revision: survey.revision } })))
  assert.deepEqual(writes.map(response => response.statusCode).sort(), [200, 409])
  const stored = (await db.query('select * from survey_responses where survey_id=$1', [id])).rows[0]
  assert.equal(stored.config_snapshot.questions[0].title, 'Original question')
  assert.equal(stored.survey_revision, survey.revision)
  assert.equal(stored.snapshot_source, 'submission')
  await assert.rejects(db.query("update survey_responses set config_snapshot='{}' where id=$1", [stored.id]))
  await db.query("update survey_responses set status='called', manager_note='test' where id=$1", [stored.id])
  console.log('PASS: concurrent token redemption, optimistic config writes and immutable response history')

  const { canAccessSurvey } = await import('../src/lib/access.ts')
  const owner = randomUUID(), other = randomUUID()
  await db.query('insert into profiles(id,email) values($1,$2),($3,$4)', [owner, 'owner@example.com', other, 'other@example.com'])
  await db.query('update surveys set owner_id=$1 where id=$2', [owner, id])
  const context = userId => ({ kind: 'oauth', userId, email: `${userId}@example.com`, isGlobalAdmin: false })
  assert.equal(await canAccessSurvey(context(owner), id), true)
  assert.equal(await canAccessSurvey(context(other), id), false)
  await db.query('insert into survey_access(survey_id,user_id,granted_by) values($1,$2,$3)', [id, other, owner])
  assert.equal(await canAccessSurvey(context(other), id), true)
  console.log('PASS: owner isolation and explicit access grants against real PostgreSQL')

  const hostedName = await createDatabase('hosted')
  const hosted = new pg.Pool({ connectionString: databaseUrl(hostedName), max: 1, connectionTimeoutMillis: 5_000 })
  pools.push(hosted)
  const roles = (await admin.query("select rolname from pg_roles where rolname in ('anon','authenticated','service_role')")).rows.map(row => row.rolname)
  for (const role of ['anon', 'authenticated', 'service_role']) {
    if (roles.includes(role)) continue
    if (process.env.TEST_ALLOW_ROLE_SETUP !== 'true') throw new Error('Hosted SQL test requires Supabase roles; on a disposable test cluster set TEST_ALLOW_ROLE_SETUP=true')
    await admin.query(`create role ${role} nologin`)
  }
  // Minimal managed-schema fixture: verifies our SQL chain, not Supabase gateway/storage runtime.
  await hosted.query(`create schema extensions; create extension pgcrypto with schema extensions;
    create schema storage; create table storage.buckets(id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);`)
  const hostedDir = resolve(root, 'supabase/migrations')
  const hostedFiles = (await readdir(hostedDir)).filter(file => file.endsWith('.sql')).sort((left, right) => {
    const a = left.split('_')[0], b = right.split('_')[0]
    return a < b ? -1 : a > b ? 1 : 0
  })
  for (const file of hostedFiles) {
    const sql = await readFile(join(hostedDir, file), 'utf8')
    await hosted.query('begin')
    try { await hosted.query(sql); await hosted.query('commit') } catch (error) { await hosted.query('rollback'); throw error }
  }
  for (const table of ['surveys', 'profiles', 'survey_access', 'manual_leads', 'lead_projects', '_migrations']) {
    assert.ok((await hosted.query('select to_regclass($1) as name', [`public.${table}`])).rows[0].name)
    assert.equal((await hosted.query("select has_table_privilege('anon',$1,'SELECT') as allowed", [`public.${table}`])).rows[0].allowed, false)
  }
  assert.equal((await hosted.query("select count(*)::int as count from information_schema.columns where table_schema='public' and table_name='manual_leads' and column_name='project_id'")).rows[0].count, 1)
  assert.equal((await hosted.query("select count(*)::int as count from information_schema.columns where table_schema='public' and table_name='survey_responses' and column_name='config_snapshot'")).rows[0].count, 1)
  console.log('PASS: fresh hosted migration chain and Data API privilege closure (managed-schema fixture)')
} finally {
  await app?.close()
  await Promise.all(pools.map(pool => pool.end()))
  if (temp) {
    const cleanupPath = resolve(temp)
    if (dirname(cleanupPath) !== resolve(tmpdir()) || !/^askly-migration-test-[a-zA-Z0-9]+$/.test(basename(cleanupPath))) {
      throw new Error('Refusing unexpected migration fixture cleanup target')
    }
    await rm(cleanupPath, { recursive: true, force: true })
  }
  for (const name of databases.reverse()) {
    // Names originate only from createDatabase, never from the user-supplied database name.
    if (!/^askly_test_(server|hosted)_[a-f0-9]{16}$/.test(name)) throw new Error('Refusing unexpected cleanup target')
    await admin.query(`drop database "${name}" with (force)`)
  }
  await admin.end()
}
