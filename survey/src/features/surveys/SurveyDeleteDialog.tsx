import { SurveyDialogFrame } from './SurveyDialogFrame'

interface Props {
  open: boolean
  state: {
    title: string
    slug: string
    busy: boolean
    error: string
  }
  actions: {
    close: () => void
    confirm: () => Promise<void>
  }
}

export function SurveyDeleteDialog({ open, state, actions }: Props) {
  return (
    <SurveyDialogFrame open={open} dialogKey="delete-survey-modal" labelledBy="surveys-delete-title"
      style={{ maxWidth: 420, gap: 14 }} onClose={actions.close}>
      <div className="surveys-onboard-head">
        <div className="surveys-onboard-head-text">
          <h2 id="surveys-delete-title" className="surveys-onboard-title" style={{ fontSize: 16 }}>
            Удалить опросник?
          </h2>
          <p className="surveys-delete-lead">
            «{state.title}» (/s/{state.slug}) будет удалён безвозвратно вместе со всеми ответами респондентов и персональными ссылками с токенами.
          </p>
        </div>
        <button
          type="button"
          className="surveys-onboard-close"
          onClick={actions.close}
          disabled={state.busy}
          aria-label="Закрыть"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
            <path d="M3.5 3.5l7 7M10.5 3.5l-7 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {state.error && (
        <p role="alert" className="surveys-modal-err">{state.error}</p>
      )}

      <div className="surveys-onboard-actions" style={{ marginTop: 4 }}>
        <button
          type="button"
          data-dialog-initial-focus className="surveys-onboard-btn-secondary"
          onClick={actions.close}
          disabled={state.busy}
        >
          Отмена
        </button>
        <button
          type="button"
          className="surveys-onboard-btn-danger"
          onClick={() => void actions.confirm()}
          disabled={state.busy}
        >
          {state.busy ? <span className="adm-spinner adm-spinner--sm" /> : 'Удалить навсегда'}
        </button>
      </div>
    </SurveyDialogFrame>
  )
}
