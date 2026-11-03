import { useEffect, useMemo, useSyncExternalStore } from 'react'
import { EditorDraft } from './editorDraft'

function sessionDraftStorage() {
  try { return window.sessionStorage } catch { return null }
}

/** initialValue must be a stable primitive or a module-level constant. */
export function useSurveyEditorDraft<T>(surveyId: number, editor: string, initialValue: T) {
  const draft = useMemo(() => new EditorDraft(`askly_editor_draft_v1:${surveyId}:${editor}`, initialValue, sessionDraftStorage), [surveyId, editor, initialValue])
  const state = useSyncExternalStore(draft.subscribe, draft.getSnapshot)
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (!draft.getSnapshot().dirty) return
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [draft])
  return { draft, ...state }
}
