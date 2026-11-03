import assert from 'node:assert/strict'
import { test } from 'node:test'
import { EditorDraft } from '../src/lib/editorDraft.ts'
import { removeSurveyQuestion } from '../src/lib/surveyCanvas.ts'
import type { SurveyConfigData } from '../src/domain/models.ts'

function memoryStorage() {
  const items = new Map<string, string>()
  return {
    getItem: (key: string) => items.get(key) ?? null,
    setItem: (key: string, value: string) => { items.set(key, value) },
    removeItem: (key: string) => { items.delete(key) },
  }
}

const original = { title: 'Original' }

test('edits made during a pending save remain dirty and survive navigation', async () => {
  const storage = memoryStorage()
  const editor = new EditorDraft('survey:1:questions', original, () => storage)
  editor.load(original, 4)
  editor.change({ title: 'First edit' })
  let finish!: () => void
  const response = new Promise<void>(resolve => { finish = resolve })
  const snapshot = structuredClone(editor.getSnapshot().value)
  const saving = response.then(() => editor.saved(snapshot, 4, 5))
  editor.change({ title: 'Second edit during request' })
  finish()
  await saving
  assert.equal(editor.getSnapshot().dirty, true)
  assert.equal(editor.getSnapshot().revision, 5)
  assert.equal(editor.getSnapshot().value.title, 'Second edit during request')
  const reopened = new EditorDraft('survey:1:questions', original, () => storage)
  reopened.load(snapshot, 5)
  assert.equal(reopened.getSnapshot().restored, true)
  assert.equal(reopened.getSnapshot().conflict, false)
  assert.equal(reopened.getSnapshot().value.title, 'Second edit during request')
})

test('successful save removes a draft only when the stored value matches the saved snapshot', () => {
  const storage = memoryStorage()
  const editor = new EditorDraft('q', original, () => storage)
  editor.load(original, 1)
  editor.change({ title: 'Saved' })
  editor.saved({ title: 'Saved' }, 1, 2)
  assert.equal(editor.getSnapshot().dirty, false)
  assert.equal(storage.getItem('q'), null)
})

test('stale draft retains its original revision and requires explicit discard before reload', () => {
  const storage = memoryStorage()
  const first = new EditorDraft('q', original, () => storage)
  first.load(original, 1)
  first.change({ title: 'Local unsaved edit' })
  const second = new EditorDraft('q', original, () => storage)
  second.load({ title: 'Changed on server' }, 2)
  assert.equal(second.getSnapshot().conflict, true)
  assert.equal(second.getSnapshot().revision, 1)
  assert.equal(second.getSnapshot().value.title, 'Local unsaved edit')
  second.discard()
  assert.notEqual(storage.getItem('q'), null)
  second.load({ title: 'Changed on server' }, 2, true)
  assert.equal(second.getSnapshot().conflict, false)
  assert.equal(second.getSnapshot().dirty, false)
  assert.equal(second.getSnapshot().value.title, 'Changed on server')
  assert.equal(storage.getItem('q'), null)
})

test('a late save acknowledgement cannot erase edits from a remounted editor', () => {
  const storage = memoryStorage()
  const previous = new EditorDraft('q', original, () => storage)
  previous.load(original, 1)
  previous.change({ title: 'Saved from old editor' })
  const reopened = new EditorDraft('q', original, () => storage)
  reopened.load(original, 1)
  reopened.change({ title: 'Newer local draft' })
  previous.saved({ title: 'Saved from old editor' }, 1, 2)
  const latest = new EditorDraft('q', original, () => storage)
  latest.load({ title: 'Saved from old editor' }, 2)
  assert.equal(latest.getSnapshot().value.title, 'Newer local draft')
  assert.equal(latest.getSnapshot().revision, 2)
  assert.equal(latest.getSnapshot().dirty, true)
})

test('an API conflict keeps the draft for recovery and does not mark it saved', () => {
  const storage = memoryStorage()
  const editor = new EditorDraft('q', original, () => storage)
  editor.load(original, 1)
  editor.change({ title: 'Rejected conflicting edit' })
  editor.markConflict()
  assert.equal(editor.getSnapshot().conflict, true)
  assert.equal(editor.getSnapshot().dirty, true)
  assert.equal(JSON.parse(storage.getItem('q')!).value.title, 'Rejected conflicting edit')
})

test('unavailable session storage preserves in-memory edits and exposes the failure', () => {
  const editor = new EditorDraft('q', original, () => null)
  editor.load(original, 1)
  assert.doesNotThrow(() => editor.change({ title: 'Keep this edit' }))
  assert.equal(editor.getSnapshot().dirty, true)
  assert.equal(editor.getSnapshot().value.title, 'Keep this edit')
  assert.equal(editor.getSnapshot().storageError, true)
  const snapshot = structuredClone(editor.getSnapshot().value)
  editor.change({ title: 'New edit while storage is unavailable' })
  editor.saved(snapshot, 1, 2)
  assert.equal(editor.getSnapshot().dirty, true)
  assert.equal(editor.getSnapshot().storageError, true)
})

test('draft keys isolate editors and surveys', () => {
  const storage = memoryStorage()
  const source = new EditorDraft('survey:1:questions', original, () => storage)
  source.load(original, 1)
  source.change({ title: 'Question edit' })
  for (const key of ['survey:1:design', 'survey:2:questions']) {
    const separate = new EditorDraft(key, original, () => storage)
    separate.load(original, 1)
    assert.equal(separate.getSnapshot().dirty, false)
    assert.equal(separate.getSnapshot().value.title, 'Original')
  }
})

test('malformed local drafts use the server value and expose a recovery warning', () => {
  for (const value of [null, 'invalid', [], {}, { questions: 'invalid' }, { questions: [{ id: 'q' }] }]) {
    const storage = memoryStorage()
    storage.setItem('q', JSON.stringify({ format: 1, baseRevision: 1, value }))
    const valid = { questions: [{ id: 'q', type: 'text', title: 'Valid', options: [] }] }
    const editor = new EditorDraft('q', valid, () => storage)
    assert.doesNotThrow(() => editor.load(valid, 1))
    assert.deepEqual(editor.getSnapshot().value, valid)
    assert.equal(editor.getSnapshot().storageError, true)
    assert.equal(editor.getSnapshot().restored, false)
  }
})

test('deleting a question removes every matching canvas block and keeps other blocks', () => {
  const config: SurveyConfigData = { editor_mode: 'canvas', questions: [
    { id: 'remove', type: 'text', title: 'Remove', options: [] }, { id: 'keep', type: 'text', title: 'Keep', options: [] },
  ], canvas: { pages: [{ id: 'p', title: 'Page', role: 'content', blocks: [
    { id: 'a', type: 'question', questionId: 'remove' }, { id: 'b', type: 'question', questionId: 'keep' },
  ] }, { id: 'p2', title: 'Page 2', role: 'content', blocks: [
    { id: 'c', type: 'question', questionId: 'remove' }, { id: 'd', type: 'text', body: 'Keep this text' },
  ] }] } }
  const next = removeSurveyQuestion(config, 'remove')
  assert.deepEqual(next.questions.map(question => question.id), ['keep'])
  assert.deepEqual(next.canvas!.pages.map(page => page.blocks.map(block => block.id)), [['b'], ['d']])
  assert.equal(config.questions.length, 2)
})
