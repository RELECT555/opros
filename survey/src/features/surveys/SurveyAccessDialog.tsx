import { SurveyDialogFrame } from './SurveyDialogFrame'

interface Props {
  open: boolean
  state: {
    surveyTitle: string
    email: string
    busy: boolean
    result: string | null
  }
  actions: {
    close: () => void
    changeEmail: (value: string) => void
    grant: () => Promise<void>
  }
}

export function SurveyAccessDialog({ open, state, actions }: Props) {
  return (
    <SurveyDialogFrame open={open} dialogKey="access-modal-backdrop" labelledBy="surveys-access-title"
      style={{ maxWidth: 420, gap: 16 }} onClose={actions.close}>
      <div className="surveys-onboard-head">
        <div className="surveys-onboard-head-text">
          <h2 id="surveys-access-title" className="surveys-onboard-title" style={{ fontSize: 16 }}>
            Выдать доступ к «{state.surveyTitle}»
          </h2>
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

      <div className="surveys-create-field" style={{ margin: 0 }}>
        <label htmlFor="surveys-access-email" className="surveys-create-label">Email пользователя</label>
        <input
          className="surveys-create-input"
          id="surveys-access-email"
          aria-describedby="surveys-access-hint"
          type="email"
          placeholder="user@example.com"
          value={state.email}
          onChange={e => actions.changeEmail(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && state.email.trim() && !state.busy) {
              actions.grant()
            }
          }}
          data-dialog-initial-focus
          disabled={state.busy}
        />
        <p id="surveys-access-hint" className="surveys-create-hint-text" style={{ marginTop: 6, fontSize: 12, opacity: 0.6 }}>
          Пользователь должен хотя бы раз войти через Google или Microsoft
        </p>
      </div>

      {state.result && (
        <p role={state.result.startsWith('✓') ? 'status' : 'alert'} style={{
          fontSize: 13,
          padding: '8px 12px',
          borderRadius: 8,
          background: state.result.startsWith('✓') ? 'rgba(52,211,153,0.12)' : 'rgba(248,113,113,0.12)',
          color: state.result.startsWith('✓') ? '#34d399' : '#f87171',
          margin: 0,
        }}>
          {state.result}
        </p>
      )}

      <div className="surveys-onboard-actions" style={{ marginTop: 4 }}>
        <button
          type="button"
          className="surveys-onboard-btn-secondary"
          onClick={actions.close}
          disabled={state.busy}
        >
          Отмена
        </button>
        <button
          type="button"
          className="surveys-onboard-btn-primary"
          onClick={actions.grant}
          disabled={state.busy || !state.email.trim()}
        >
          {state.busy ? <span className="adm-spinner adm-spinner--sm" /> : 'Выдать доступ'}
        </button>
      </div>
    </SurveyDialogFrame>
  )
}
