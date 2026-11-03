type DraftStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>
type StoredDraft<T> = { format: 1; baseRevision: number; value: T }

export type EditorDraftState<T> = {
  value: T
  baseline: T | undefined
  revision: number | null
  dirty: boolean
  restored: boolean
  conflict: boolean
  storageError: boolean
}

const equal = (left: unknown, right: unknown) => JSON.stringify(left) === JSON.stringify(right)
const record = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value)

/** Local storage is untrusted input; validate the shapes the editors dereference. */
function compatibleValue(value: unknown, server: unknown): boolean {
  if (!record(server)) return server === null ? value === null : typeof value === typeof server
  if (!record(value)) return false
  if ('questions' in server) {
    if (!Array.isArray(value.questions) || !value.questions.every(question => record(question) &&
      typeof question.id === 'string' && typeof question.title === 'string' &&
      ['checkbox', 'radio', 'text', 'scale'].includes(String(question.type)) &&
      Array.isArray(question.options) && question.options.every(option => typeof option === 'string'))) return false
    if (value.editor_mode === 'canvas' && (!record(value.canvas) || !Array.isArray(value.canvas.pages) ||
      !value.canvas.pages.every(page => record(page) && typeof page.id === 'string' &&
        typeof page.title === 'string' && ['welcome', 'content'].includes(String(page.role)) &&
        Array.isArray(page.blocks) && page.blocks.every(block => record(block) && typeof block.id === 'string' && typeof block.type === 'string')))) return false
    if (value.contacts_block !== undefined && !record(value.contacts_block)) return false
    if (record(value.contacts_block) && value.contacts_block.consents !== undefined &&
      (!Array.isArray(value.contacts_block.consents) || !value.contacts_block.consents.every(consent => record(consent) &&
        typeof consent.id === 'string' && typeof consent.title === 'string'))) return false
  }
  if ('design' in server && 'sticker' in server && (typeof value.sticker !== 'string' || !record(value.design))) return false
  if (value.design !== undefined && value.design !== null && !record(value.design)) return false
  for (const [key, sample] of Object.entries(server)) {
    if (key in value && sample !== null && typeof sample !== 'object' && typeof value[key] !== typeof sample) return false
  }
  return true
}

/** A local draft retains its base revision; restoring it never silently rebases a stale write. */
export class EditorDraft<T> {
  readonly key: string
  private state: EditorDraftState<T>
  private storage: () => DraftStorage | null
  private listeners = new Set<() => void>()

  constructor(key: string, initialValue: T, storage: () => DraftStorage | null) {
    this.key = key
    this.storage = storage
    this.state = { value: initialValue, baseline: undefined, revision: null, dirty: false, restored: false, conflict: false, storageError: false }
  }

  getSnapshot = () => this.state
  subscribe = (listener: () => void) => {
    this.listeners.add(listener)
    return () => { this.listeners.delete(listener) }
  }

  private publish(next: EditorDraftState<T>) {
    this.state = next
    this.listeners.forEach(listener => listener())
  }

  private read(): StoredDraft<T> | null {
    const raw = this.storage()?.getItem(this.key)
    if (!raw) return null
    const record: unknown = JSON.parse(raw)
    if (!record || typeof record !== 'object') throw new Error('Invalid draft')
    const draft = record as Partial<StoredDraft<T>>
    if (draft.format !== 1 || !Number.isSafeInteger(draft.baseRevision) || Number(draft.baseRevision) < 1 || !('value' in draft)) throw new Error('Invalid draft')
    return draft as StoredDraft<T>
  }

  private persist(value: T, revision: number | null, dirty: boolean): boolean {
    try {
      const storage = this.storage()
      if (!storage) return false
      if (dirty && revision !== null) storage.setItem(this.key, JSON.stringify({ format: 1, baseRevision: revision, value } satisfies StoredDraft<T>))
      else storage.removeItem(this.key)
      return true
    } catch { return false }
  }

  load(value: T, revision: number, discard = false) {
    let draft: StoredDraft<T> | null = null
    let storageError = false
    try {
      draft = discard ? null : this.read()
      if (draft && !compatibleValue(draft.value, value)) throw new Error('Invalid draft value')
    } catch { draft = null; storageError = true }
    const restored = draft !== null && !equal(draft.value, value)
    const conflict = restored && draft!.baseRevision !== revision
    const nextValue = restored ? draft!.value : value
    const baseRevision = restored ? draft!.baseRevision : revision
    if (discard || !restored) storageError = !this.persist(value, revision, false) || storageError
    this.publish({ value: nextValue, baseline: value, revision: baseRevision, dirty: restored, restored, conflict, storageError })
  }

  change = (next: T | ((previous: T) => T)) => {
    const value = typeof next === 'function' ? (next as (previous: T) => T)(this.state.value) : next
    const dirty = this.state.baseline !== undefined && !equal(value, this.state.baseline)
    const storageError = !this.persist(value, this.state.revision, dirty)
    this.publish({ ...this.state, value, dirty, storageError })
  }

  /** Acknowledge the submitted snapshot while retaining edits made during the request. */
  saved(snapshot: T, expectedRevision: number, revision: number) {
    let storageError = this.state.storageError
    try {
      // The editor may already have unmounted and remounted while its request was in flight.
      const latest = this.read()
      if (latest?.baseRevision === expectedRevision) storageError = !this.persist(latest.value, revision, !equal(latest.value, snapshot))
    } catch { storageError = true }
    if (this.state.revision !== expectedRevision) return
    const dirty = !equal(this.state.value, snapshot)
    this.publish({ ...this.state, baseline: snapshot, revision, dirty, restored: false, conflict: false, storageError: dirty && storageError })
  }

  markConflict() { this.publish({ ...this.state, conflict: true }) }

  discard() {
    if (this.state.baseline === undefined || this.state.conflict) return
    const storageError = !this.persist(this.state.baseline, this.state.revision, false)
    this.publish({ ...this.state, value: this.state.baseline, dirty: false, restored: false, storageError })
  }
}

export function downloadEditorDraft(surveyId: number, editor: string, revision: number | null, value: unknown) {
  const url = URL.createObjectURL(new Blob([JSON.stringify({ surveyId, editor, baseRevision: revision, value }, null, 2)], { type: 'application/json' }))
  const link = document.createElement('a')
  link.href = url
  link.download = `askly-${surveyId}-${editor}-draft.json`
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 0)
}
