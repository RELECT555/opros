import { test } from 'node:test'
import assert from 'node:assert/strict'
import { canUseWelcomeFixture } from '../src/lib/devFixtureAccess.ts'
import { questionLabel, welcomeCopy } from '../src/lib/welcomeCopy.ts'

test('fixture requires development, explicit opt-in, loopback host and reserved slug', () => {
  assert.equal(canUseWelcomeFixture(true, 'true', '127.0.0.1', '__preview_crm'), true)
  assert.equal(canUseWelcomeFixture(false, 'true', '127.0.0.1', '__preview_crm'), false)
  assert.equal(canUseWelcomeFixture(true, undefined, '127.0.0.1', '__preview_crm'), false)
  assert.equal(canUseWelcomeFixture(true, 'true', 'example.com', '__preview_crm'), false)
  assert.equal(canUseWelcomeFixture(true, 'true', '127.0.0.1', 'crm'), false)
})

test('question count follows Russian plurals including teens', () => {
  for (const [n, label] of [[1, 'вопрос'], [3, 'вопроса'], [5, 'вопросов'], [11, 'вопросов'], [21, 'вопрос'], [24, 'вопроса'], [114, 'вопросов']] as const) {
    assert.equal(questionLabel(n), `${n} ${label}`)
  }
})

test('authored copy and intentionally hidden hints are preserved', () => {
  const input = { title: 'Расскажите о команде', sub: 'Ваш текст', btnLabel: 'Продолжить', hintLeft: '', hintRight: '', questionCount: 5 }
  assert.deepEqual(welcomeCopy(input), {
    title: input.title, sub: input.sub, btnLabel: input.btnLabel, hintLeft: '', hintRight: '', count: '5 вопросов',
  })
})

test('original CRM template gets useful copy and actual question count', () => {
  const copy = welcomeCopy({
    title: 'Помогите нам стать лучше для вас',
    sub: 'Пройдите короткий опрос из 4 вопросов — и мы подберём лучшее CRM-решение для вас.',
    btnLabel: 'Начать опрос', hintLeft: '2 минуты', hintRight: 'данные в безопасности', questionCount: 3,
  })
  assert.equal(copy.title, 'Подберём CRM под задачи бизнеса')
  assert.equal(copy.count, '3 вопроса')
  assert.equal(copy.btnLabel, 'Начать подбор')
  assert.doesNotMatch(copy.sub, /4 вопрос/)
})
