import { AnimatePresence, easeOut, motion } from 'framer-motion'

interface Props {
  open: boolean
  state: {
    title: string
    slug: string
    description: string
    mode: 'classic' | 'canvas'
    busy: boolean
  }
  actions: {
    changeTitle: (value: string) => void
    changeSlug: (value: string) => void
    changeDescription: (value: string) => void
    changeMode: (mode: 'classic' | 'canvas') => void
    create: () => Promise<void>
  }
}

export function SurveyCreateForm({ open, state, actions }: Props) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="surveys-create-form"
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2, ease: easeOut }}
        >
          <div className="surveys-create-header">
            <div className="surveys-create-header-icon">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M7 1.5v11M1.5 7h11" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
            </div>
            <h3 className="surveys-create-title">Новый опросник</h3>
          </div>
          <div className="surveys-create-fields">
            <div className="surveys-create-field">
              <label htmlFor="surveys-create-title" className="surveys-create-label">Название</label>
              <input
                className="surveys-create-input"
                type="text"
                placeholder="Например: Обратная связь 2025"
                id="surveys-create-title" value={state.title}
                onChange={e => actions.changeTitle(e.target.value)}
                autoFocus
              />
            </div>
            <div className="surveys-create-field">
              <label htmlFor="surveys-create-slug" className="surveys-create-label">URL-slug <span className="surveys-create-hint-text">латиница, цифры, дефисы</span></label>
              <div className="surveys-slug-wrap">
                <span className="surveys-slug-prefix">/s/</span>
                <input
                  className="surveys-create-input surveys-slug-input"
                  type="text"
                  placeholder="feedback-2025"
                  id="surveys-create-slug" value={state.slug}
                  onChange={e => actions.changeSlug(e.target.value)}
                />
              </div>
            </div>
            <div className="surveys-create-field">
              <label htmlFor="surveys-create-description" className="surveys-create-label">Описание <span className="surveys-create-hint-text">необязательно</span></label>
              <input
                className="surveys-create-input"
                type="text"
                placeholder="Короткое описание опросника"
                id="surveys-create-description" value={state.description}
                onChange={e => actions.changeDescription(e.target.value)}
              />
            </div>
            <div className="surveys-create-field">
              <span className="surveys-create-label">Как создать</span>
              <div className="surveys-create-mode-grid">
                <button
                  type="button"
                  aria-pressed={state.mode === 'classic'} className={`surveys-create-mode-card ${state.mode === 'classic' ? 'surveys-create-mode-card--on' : ''}`}
                  onClick={() => actions.changeMode('classic')}
                >
                  <span className="surveys-create-mode-title">Классика</span>
                  <span className="surveys-create-mode-desc">Пустой опрос и список вопросов во вкладке «Вопросы»</span>
                </button>
                <button
                  type="button"
                  aria-pressed={state.mode === 'canvas'} className={`surveys-create-mode-card ${state.mode === 'canvas' ? 'surveys-create-mode-card--on' : ''}`}
                  onClick={() => actions.changeMode('canvas')}
                >
                  <span className="surveys-create-mode-title">С нуля</span>
                  <span className="surveys-create-mode-desc">Страницы, блоки текста и ширина карточек в конструкторе</span>
                </button>
              </div>
            </div>
          </div>
          <div className="surveys-create-footer">
            <p className="surveys-create-footnote">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.2" />
                <path d="M6 5.5v3M6 4h.01" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
              </svg>
              {state.mode === 'canvas'
                ? 'Откроется вкладка «Конструктор» — добавьте блоки и вопросы'
                : 'После создания добавьте вопросы во вкладке «Вопросы»'}
            </p>
            <button
              className="surveys-create-btn"
              onClick={actions.create}
              disabled={state.busy || !state.title.trim() || !state.slug.trim()}
            >
              {state.busy ? <span className="adm-spinner adm-spinner--sm" /> : (
                <>
                  <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                    <path d="M6.5 2v9M2 6.5h9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                  Создать
                </>
              )}
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
