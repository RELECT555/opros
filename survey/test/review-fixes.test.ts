import { test } from 'node:test'
import assert from 'node:assert/strict'
import { ConfigAutosave } from '../src/lib/configAutosave.ts'
import { buildResponsesCsv } from '../src/lib/responsesCsv.ts'
import { appendSurveyQuestion, orderedQuestionsFromCanvas } from '../src/lib/surveyCanvas.ts'
import type { SurveyConfigData, SurveyRecord } from '../src/lib/supabase.ts'

test('adding a question to canvas places it on a rendered page; orphan questions are excluded', () => {
  const cfg: SurveyConfigData = { editor_mode: 'canvas', questions: [{ id: 'orphan', type: 'text', title: 'Hidden', options: [] }],
    canvas: { pages: [{ id: 'welcome', title: 'Welcome', role: 'welcome', blocks: [] }] } }
  const question = { id: 'new', type: 'text' as const, title: 'Visible', options: [] }
  const next = appendSurveyQuestion(cfg, question)
  assert.deepEqual(orderedQuestionsFromCanvas(next).map(q => q.id), ['new'])
  assert.equal(next.canvas!.pages[1].blocks[0].type, 'question')
})

test('CSV preserves dynamic/historical/other answers, escapes delimiters and formulas', () => {
  const config: SurveyConfigData = { questions: [{ id: 'q', title: 'Вопрос; "один"', type: 'checkbox', options: ['A'], hasOther: true }] }
  const row = { id: 1, created_at: '2026-01-01', name: '=1+1', phone: '+79990000000', status: 'new',
    answers: { q: ['A', '__other__'], q__other: 'Custom; value', deleted: 'Historical' } } as unknown as SurveyRecord
  const csv = buildResponsesCsv([row], [], config)
  assert.ok(csv.startsWith('\uFEFF'))
  assert.ok(csv.includes('"Вопрос; ""один"""'))
  assert.ok(csv.includes('"A, Custom; value"'))
  assert.ok(csv.includes('"Historical"'))
  assert.ok(csv.includes('"\'=1+1"'))
})

test('autosave serializes edits and flush waits for the latest pending config', async () => {
  let release!: () => void
  const gate = new Promise<void>(resolve => { release = resolve })
  const calls: string[] = []
  const queue = new ConfigAutosave(async config => { calls.push(config.welcome_title!); if (calls.length === 1) await gate })
  queue.schedule({ questions: [], welcome_title: 'first' })
  const flush = queue.flush()
  queue.schedule({ questions: [], welcome_title: 'latest' })
  assert.deepEqual(calls, ['first'])
  const pending = queue.flush()
  release()
  await Promise.all([flush, pending])
  assert.deepEqual(calls, ['first', 'latest'])
  assert.equal(queue.getSnapshot().status, 'idle')
})

test('failed autosave retains the edit and exposes an error until retry succeeds', async () => {
  let attempts = 0
  const queue = new ConfigAutosave(async () => { if (++attempts === 1) throw new Error('offline') })
  queue.schedule({ questions: [] })
  await queue.flush()
  assert.deepEqual(queue.getSnapshot(), { status: 'error', error: 'offline' })
  await queue.flush()
  assert.equal(attempts, 2)
  assert.equal(queue.getSnapshot().status, 'idle')
})
