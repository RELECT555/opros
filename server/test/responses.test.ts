import assert from 'node:assert/strict'
import { test, before, after } from 'node:test'
import { mkdtemp, readdir, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { SurveyConfigData } from '../src/types/models.js'

process.env.LOG_LEVEL = 'silent'
process.env.NODE_ENV = 'test'
process.env.DATABASE_URL = 'postgresql://test:test@127.0.0.1:1/test'
process.env.JWT_SECRET = 'review-test-secret-at-least-32-characters'
process.env.TELEGRAM_BOT_TOKEN = ''
process.env.OPROS_HOSTED = 'false'
process.env.TRUST_PROXY = '172.30.44.10'
const { buildApp } = await import('../src/app.js')
const { db } = await import('../src/db/client.js')
const { validateResponse } = await import('../src/lib/response-validation.js')

const choice = { id: 'q', title: 'Выберите вариант', type: 'radio' as const, options: ['A', 'B'] }
let config: SurveyConfigData
let invitation: { survey_id: number; used_at: string | null; email: string }
let inserts: unknown[][] = []
let tokenUpdates = 0
let uploadDir: string
let app: Awaited<ReturnType<typeof buildApp>>

before(async () => {
  uploadDir = await mkdtemp(join(tmpdir(), 'askly-tests-'))
  process.env.UPLOAD_DIR = uploadDir
  // Exercise the actual transaction/route while keeping real databases untouched.
  db.connect = (async () => ({
    query: async (sql: string, values?: unknown[]) => {
      if (sql.includes('select is_active')) return { rows: [{ is_active: true, config }] }
      if (sql.includes('select survey_id, used_at')) return { rows: [invitation] }
      if (sql.includes('insert into survey_responses')) {
        inserts.push(values!)
        return { rows: [{ id: 1, survey_id: 1, name: values![2], phone: values![3], email: values![4] }] }
      }
      if (sql.includes('update survey_tokens')) tokenUpdates++
      return { rows: [] }
    },
    release() {},
  })) as unknown as typeof db.connect
  app = await buildApp()
})

test.beforeEach(() => {
  config = { questions: [choice], contacts_block: { disabled: true } }
  invitation = { survey_id: 1, used_at: null, email: 'invite@example.com' }
  inserts = []
  tokenUpdates = 0
})

test('disabled or optional contacts can be submitted, default required contacts cannot', async () => {
  let response = await app.inject({ method: 'POST', url: '/api/responses', payload: { survey_id: 1, answers: { q: 'A' } } })
  assert.equal(response.statusCode, 201)
  assert.equal(inserts[0][2], '')
  config.contacts_block = { name: { required: false }, phone: { enabled: false } }
  response = await app.inject({ method: 'POST', url: '/api/responses', payload: { survey_id: 1, answers: { q: 'B' } } })
  assert.equal(response.statusCode, 201)
  delete config.contacts_block
  response = await app.inject({ method: 'POST', url: '/api/responses', payload: { survey_id: 1, answers: { q: 'A' }, name: ' ', phone: 'abcde' } })
  assert.equal(response.statusCode, 400)
  assert.equal(inserts.length, 2)
})

test('incomplete or forged answers are rejected before insert and token consumption', async () => {
  for (const answers of [{}, { q: 'forged' }, { q: ['A'] }, { q: 'A', unknown: 'x' }]) {
    const response = await app.inject({ method: 'POST', url: '/api/responses', payload: { survey_id: 1, answers, token: 'a'.repeat(32) } })
    assert.equal(response.statusCode, 400)
  }
  assert.equal(inserts.length, 0)
  assert.equal(tokenUpdates, 0)
})

test('invitation email satisfies a hidden required email field', async () => {
  config.contacts_block = { name: { enabled: false }, phone: { enabled: false }, email: { required: true } }
  const response = await app.inject({ method: 'POST', url: '/api/responses', payload: { survey_id: 1, answers: { q: 'A' }, token: 'a'.repeat(32) } })
  assert.equal(response.statusCode, 201)
  assert.equal(inserts[0][4], 'invite@example.com')
  assert.equal(tokenUpdates, 1)
})

test('foreign and used invitations are rejected without saving', async () => {
  for (const state of [{ survey_id: 2, used_at: null }, { survey_id: 1, used_at: '2026-01-01' }]) {
    Object.assign(invitation, state)
    const response = await app.inject({ method: 'POST', url: '/api/responses', payload: { survey_id: 1, answers: { q: 'A' }, token: 'a'.repeat(32) } })
    assert.equal(response.statusCode, 409)
  }
  assert.equal(inserts.length, 0)
})

test('only rendered canvas questions are validated; choice/scale/text types are checked', () => {
  config.editor_mode = 'canvas'
  config.canvas = { pages: [{ id: 'p', title: 'Page', role: 'content', blocks: [] }] }
  assert.equal(validateResponse(config, {}, {}), null)
  const questions = [
    { ...choice, type: 'checkbox' as const },
    { ...choice, type: 'scale' as const, scaleMin: 0, scaleMax: 5 },
    { ...choice, type: 'text' as const },
  ]
  for (const [index, question] of questions.entries()) {
    const cfg = { questions: [question], contacts_block: { disabled: true } }
    const good = [['A'], '0', 'text'][index]
    const bad = [['A', 'A'], '6', '  '][index]
    assert.equal(validateResponse(cfg, { q: good }, {}), null)
    assert.notEqual(validateResponse(cfg, { q: bad }, {}), null)
  }
})

test('oversized upload returns 413 and writes no file', async () => {
  const boundary = 'askly-test'
  const payload = Buffer.concat([
    Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="test.png"\r\nContent-Type: image/png\r\n\r\n`),
    Buffer.alloc(2 * 1024 * 1024 + 10, 65), Buffer.from(`\r\n--${boundary}--\r\n`),
  ])
  const response = await app.inject({ method: 'POST', url: '/api/admin/uploads/logo', payload,
    headers: { authorization: `Bearer ${app.jwt.sign({ role: 'admin' })}`, 'content-type': `multipart/form-data; boundary=${boundary}` } })
  assert.equal(response.statusCode, 413)
  assert.deepEqual(await readdir(uploadDir), [])
})

test('only the configured proxy can select the client IP for login limits', async () => {
  process.env.ADMIN_PASSWORD = 'test-only-password'
  const login = (remoteAddress: string, ip: string) => app.inject({ method: 'POST', url: '/api/auth/login', remoteAddress,
    headers: { 'x-forwarded-for': ip }, payload: { password: 'wrong' } })
  for (let i = 0; i < 5; i++) assert.equal((await login('172.30.44.10', '203.0.113.1')).statusCode, 401)
  assert.equal((await login('172.30.44.10', '203.0.113.1')).statusCode, 429)
  assert.equal((await login('172.30.44.10', '203.0.113.2')).statusCode, 401)
  for (let i = 0; i < 5; i++) assert.equal((await login('198.51.100.1', `203.0.113.${i + 10}`)).statusCode, 401)
  assert.equal((await login('198.51.100.1', '203.0.113.99')).statusCode, 429)
})

after(async () => { await app?.close(); await db.end(); await rm(uploadDir, { recursive: true, force: true }) })
