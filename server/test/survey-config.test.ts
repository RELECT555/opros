import assert from 'node:assert/strict'
import { before, after, test } from 'node:test'
import { readFileSync } from 'node:fs'
import type { Survey, SurveyConfigData } from '../src/types/models.js'
import { validateSurveyConfig } from '../src/lib/survey-config-validation.js'
import { surveyConfigSnapshot } from '../src/lib/survey-config-snapshot.js'

process.env.LOG_LEVEL = 'silent'
process.env.NODE_ENV = 'test'
process.env.DATABASE_URL = 'postgresql://test:test@127.0.0.1:1/test'
process.env.JWT_SECRET = 'config-test-secret-at-least-32-characters'
process.env.OPROS_HOSTED = 'false'
const { buildApp } = await import('../src/app.js')
const { db } = await import('../src/db/client.js')
let app: Awaited<ReturnType<typeof buildApp>>
let current: Survey
let writes = 0
let headers: { authorization: string }

const valid = (): SurveyConfigData => ({
  questions: [{ id: 'q', title: 'Question', type: 'radio', options: ['A', 'B'] }],
  contacts_block: { disabled: true },
})

before(async () => {
  db.query = (async (sql: string, values: unknown[] = []) => {
    if (sql.includes('update surveys set config')) {
      if (current.revision !== values[2]) return { rows: [] }
      current = { ...current, config: JSON.parse(values[0] as string), revision: current.revision + 1 }
      writes++
      return { rows: [current] }
    }
    if (sql.includes('select revision')) return { rows: [{ revision: current.revision }] }
    if (sql.includes('insert into surveys')) {
      current = { ...current, config: JSON.parse(values[3] as string) }
      writes++
      return { rows: [current] }
    }
    if (sql.includes('from surveys')) return { rows: [current] }
    return { rows: [] }
  }) as unknown as typeof db.query
  app = await buildApp()
  headers = { authorization: `Bearer ${app.jwt.sign({ role: 'admin' })}` }
})
test.beforeEach(() => {
  current = { id: 1, revision: 1, slug: 'test', title: 'Survey', config: valid(), is_active: true, created_at: '' }
  writes = 0
})

test('draft empty questions and the real CRM seed are valid', () => {
  assert.equal(validateSurveyConfig({ questions: [] }), null)
  const sql = readFileSync(new URL('../migrations/002_multi_survey.sql', import.meta.url), 'utf8')
  const match = sql.match(/'(\{\s*"welcome_title"[\s\S]*?\})'::jsonb/)
  assert.ok(match)
  assert.equal(validateSurveyConfig(JSON.parse(match[1])), null)
})

test('malformed, duplicate, empty-choice and unsafe nested config values are rejected', () => {
  const q = valid().questions[0]
  const invalid: unknown[] = [
    { questions: 'invalid' }, { questions: null }, { questions: [{ ...q, title: '  ' }] },
    { questions: [q, q] }, { questions: [{ ...q, id: '__proto__' }] },
    { questions: [{ ...q, options: [] }] }, { questions: [{ ...q, options: ['A', ' A'] }] },
    { questions: [{ ...q, type: 'unknown' }] },
    { questions: [{ ...q, type: 'scale', scaleMin: 10, scaleMax: 1 }] },
    { questions: [{ ...q, type: 'scale', scaleMin: 1, scaleMax: 1000 }] },
    { questions: [{ ...q, type: 'scale', scaleMin: 0.5, scaleMax: 1 }] },
    { questions: [{ ...q, media: { kind: 'image', url: 'javascript:alert(1)' } }] },
    { questions: [], contacts_block: { name: { required: 'yes' } } },
    { questions: [], contacts_block: { consents: [null] } },
    { questions: [], design: { type_scale: 'huge' } },
    { questions: [], canvas: { pages: [] } },
    { questions: [], unknown: true },
  ]
  for (const config of invalid) assert.equal(typeof validateSurveyConfig(config), 'string', JSON.stringify(config))
})

test('canvas accepts CTA/geometry but rejects dangling references and duplicate IDs', () => {
  const config: SurveyConfigData = { ...valid(), editor_mode: 'canvas', canvas: { pages: [
    { id: 'welcome', role: 'welcome', title: '', blocks: [
      { id: 'text', type: 'text', body: '', fontSizePx: 54, widthPct: 80, xPct: 10, yPx: 20 },
      { id: 'cta', type: 'cta', label: 'Start', xPct: 30, yPx: 300, widthPct: 40 },
    ] },
    { id: 'content', role: 'content', title: '', blocks: [{ id: 'question', type: 'question', questionId: 'q' }] },
  ] } }
  assert.equal(validateSurveyConfig(config), null)
  const dangling = structuredClone(config)
  dangling.questions = []
  assert.match(validateSurveyConfig(dangling)!, /существующий вопрос/)
  const duplicate = structuredClone(config)
  duplicate.canvas!.pages.push(duplicate.canvas!.pages[0])
  assert.match(validateSurveyConfig(duplicate)!, /страниц.*уникальными/)
})

test('snapshots include only rendered questions and retain independent historical labels', () => {
  const config: SurveyConfigData = { ...valid(), editor_mode: 'canvas', legacy_analytics: { purpose_title: 'Original title' }, canvas: {
    pages: [{ id: 'p', role: 'content', title: '', blocks: [] }],
  } }
  const snapshot = surveyConfigSnapshot(config)
  assert.deepEqual(snapshot.questions, [])
  assert.equal(snapshot.canvas, undefined)
  config.legacy_analytics!.purpose_title = 'Renamed'
  assert.equal(snapshot.legacy_analytics!.purpose_title, 'Original title')
})

test('invalid configuration is rejected by both create and update before persistence', async () => {
  const config = { questions: 'invalid' }
  for (const [method, url, payload] of [
    ['POST', '/api/admin/surveys', { slug: 'new', title: 'New', config }],
    ['PUT', '/api/admin/surveys/1/config', { config, expected_revision: 1 }],
  ] as const) {
    const response = await app.inject({ method, url, headers, payload })
    assert.equal(response.statusCode, 400)
    assert.equal(response.json().code, 'INVALID_SURVEY_CONFIG')
  }
  assert.equal(writes, 0)
})

test('two editors with the same revision cannot silently overwrite one another', async () => {
  const first = valid()
  first.questions[0].title = 'First editor'
  const second = valid()
  second.design = { accent: '#abcdef' }
  const responses = await Promise.all([first, second].map(config => app.inject({
    method: 'PUT', url: '/api/admin/surveys/1/config', headers, payload: { config, expected_revision: 1 },
  })))
  assert.deepEqual(responses.map(response => response.statusCode).sort(), [200, 409])
  assert.equal(current.revision, 2)
  assert.equal(writes, 1)
  const conflict = responses.find(response => response.statusCode === 409)!.json()
  assert.equal(conflict.code, 'SURVEY_REVISION_CONFLICT')
  assert.equal(conflict.current_revision, 2)
})

test('revision is required, returned by reads, and incremented after a successful save', async () => {
  const missing = await app.inject({ method: 'PUT', url: '/api/admin/surveys/1/config', headers, payload: { config: valid() } })
  assert.equal(missing.statusCode, 400)
  const read = await app.inject({ method: 'GET', url: '/api/admin/surveys/1', headers })
  assert.equal(read.json().revision, 1)
  const save = await app.inject({ method: 'PUT', url: '/api/admin/surveys/1/config', headers, payload: { config: valid(), expected_revision: 1 } })
  assert.equal(save.statusCode, 200)
  assert.equal(save.json().revision, 2)
})

after(async () => { await app?.close(); await db.end() })
