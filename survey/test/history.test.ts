import { test } from 'node:test'
import assert from 'node:assert/strict'
import { responseQuestions } from '../src/domain/responseHistory.ts'
import { buildQuestionSections, buildLegacySections } from '../src/features/responses/responseAnalytics.ts'
import { buildResponsesCsv } from '../src/lib/responsesCsv.ts'
import { scaleValues } from '../src/domain/scaleRange.ts'
import { isHostAllowedForIframeEmbed } from '../src/lib/questionMedia.ts'
import type { SurveyConfigData, SurveyRecord } from '../src/domain/models.ts'

const oldConfig: SurveyConfigData = { questions: [{ id: 'q', type: 'radio', title: 'Original question', options: ['A'] }] }
const current: SurveyConfigData = { questions: [{ id: 'q', type: 'radio', title: 'Renamed question', options: ['B'] }] }
const oldRow = { id: 1, created_at: '2026-01-01', survey_revision: 1, snapshot_source: 'submission', config_snapshot: oldConfig,
  answers: { q: 'A' }, status: 'new' } as SurveyRecord
const newRow = { ...oldRow, id: 2, survey_revision: 2, config_snapshot: current, answers: { q: 'B' } }

test('renamed and deleted questions retain their original historical title and answers', () => {
  assert.equal(responseQuestions(oldRow)[0].title, 'Original question')
  assert.equal(responseQuestions(oldRow)[0].title, 'Original question')
  const groups = buildQuestionSections(current, [oldRow, newRow])
  assert.deepEqual(groups.map(group => group.title), ['Original question · версия 1', 'Renamed question · версия 2'])
  assert.deepEqual(groups.map(group => group.items), [[['A', 1]], [['B', 1]]])
})

test('CSV separates answer versions instead of silently relabeling old responses', () => {
  const csv = buildResponsesCsv([oldRow, newRow], [], current)
  assert.ok(csv.includes('Original question · версия 1'))
  assert.ok(csv.includes('Renamed question · версия 2'))
  assert.ok(csv.includes('"версия 1";"A";""'))
  assert.ok(csv.includes('"версия 2";"";"B"'))
})

test('legacy answers missing from a backfilled schema remain visible by their key', () => {
  const row = { ...oldRow, config_snapshot: { questions: [] }, snapshot_source: 'legacy_backfill' as const }
  assert.equal(responseQuestions(row)[0].id, 'q')
  assert.ok(buildResponsesCsv([row], [], current).includes('схема при миграции'))
})

test('unknown historical answer types are not coerced to the current schema or dropped', () => {
  const arrayRow = { ...oldRow, config_snapshot: null, snapshot_source: 'unavailable' as const, answers: { q: ['A'] } }
  const textRow = { ...arrayRow, id: 2, answers: { q: 'Earlier text' } }
  const groups = buildQuestionSections(current, [arrayRow, textRow])
  assert.equal(groups.length, 2)
  assert.ok(groups.some(group => group.items.some(([label]) => label === 'Earlier text')))
  assert.ok(groups.every(group => !group.title.includes('Renamed question')))
})

test('legacy CRM labels come from the captured schema instead of the current config', () => {
  const row = { ...oldRow, current_crm: 'yes', config_snapshot: { ...oldConfig, legacy_analytics: {
    current_title: 'Original situation', current_value_labels: { yes: 'Original answer' },
  } } }
  const sections = buildLegacySections([row])
  assert.deepEqual(sections.current, [['Original situation · версия 1: Original answer', 1]])
})

test('scale previews bound allocation and preserve a valid zero minimum', () => {
  assert.deepEqual(scaleValues(0, 2), [0, 1, 2])
  for (const [min, max] of [[10, 1], [0, 1e9], [NaN, 5], [1, Infinity], [1.5, 3]]) assert.deepEqual(scaleValues(min, max), [])
})

test('iframe domains require an exact host or a real subdomain', () => {
  for (const host of ['notyoutube.com', 'youtube.com.evil.test', 'notvimeo.com', 'notrutube.ru']) {
    assert.equal(isHostAllowedForIframeEmbed(`https://${host}/embed/id`), false)
  }
  for (const host of ['youtube.com', 'www.youtube.com', 'www.youtube-nocookie.com', 'player.vimeo.com', 'rutube.ru']) {
    assert.equal(isHostAllowedForIframeEmbed(`https://${host}/embed/id`), true)
  }
  assert.equal(isHostAllowedForIframeEmbed('ftp://youtube.com/embed/id'), false)
})
