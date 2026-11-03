import { SurveyDialogFrame } from './SurveyDialogFrame'

interface Props {
  open: boolean
  state: {
    title: string
    slug: string
    description: string
    active: boolean
    busy: boolean
    error: string
  }
  actions: {
    close: () => void
    save: () => Promise<void>
    changeTitle: (value: string) => void
    changeSlug: (value: string) => void
    changeDescription: (value: string) => void
    changeActive: (value: boolean) => void
  }
}

export function SurveyEditDialog({ open, state, actions }: Props) {
  return (
    <SurveyDialogFrame open={open} dialogKey="edit-survey-modal" labelledBy="surveys-edit-title"
      style={{ maxWidth: 440, gap: 14 }} onClose={actions.close}>
      <div className="surveys-onboard-head">
        <div className="surveys-onboard-head-text">
          <h2 id="surveys-edit-title" className="surveys-onboard-title" style={{ fontSize: 16 }}>
            Редактировать опросник
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

      <div className="surveys-create-fields" style={{ gap: 12 }}>
        <div className="surveys-create-field" style={{ margin: 0 }}>
          <label htmlFor="surveys-edit-name" className="surveys-create-label">Название</label>
          <input
            className="surveys-create-input"
            type="text"
            data-dialog-initial-focus id="surveys-edit-name" value={state.title}
            onChange={e => actions.changeTitle(e.target.value)}
            disabled={state.busy}
          />
        </div>
        <div className="surveys-create-field" style={{ margin: 0 }}>
          <label htmlFor="surveys-edit-slug" className="surveys-create-label">URL-slug</label>
          <div className="surveys-slug-wrap">
            <span className="surveys-slug-prefix">/s/</span>
            <input
              className="surveys-create-input surveys-slug-input"
              type="text"
              id="surveys-edit-slug" value={state.slug}
              onChange={e => actions.changeSlug(e.target.value)}
              disabled={state.busy}
            />
          </div>
        </div>
        <div className="surveys-create-field" style={{ margin: 0 }}>
          <label htmlFor="surveys-edit-description" className="surveys-create-label">Описание</label>
          <input
            className="surveys-create-input"
            type="text"
            placeholder="Необязательно"
            id="surveys-edit-description" value={state.description}
            onChange={e => actions.changeDescription(e.target.value)}
            disabled={state.busy}
          />
        </div>
        <label className="surveys-edit-active-row">
          <input
            type="checkbox"
            checked={state.active}
            onChange={e => actions.changeActive(e.target.checked)}
            disabled={state.busy}
          />
          <span>Опрос активен (виден по ссылке)</span>
        </label>
      </div>

      {state.error && (
        <p role="alert" className="surveys-modal-err">{state.error}</p>
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
          onClick={() => void actions.save()}
          disabled={state.busy || !state.title.trim() || !state.slug.trim()}
        >
          {state.busy ? <span className="adm-spinner adm-spinner--sm" /> : 'Сохранить'}
        </button>
      </div>
    </SurveyDialogFrame>
  )
}
