import { SurveyDialogFrame } from './SurveyDialogFrame'

interface Props {
  open: boolean
  state: {
    mode: 'classic' | 'canvas'
    dontShowAgain: boolean
  }
  actions: {
    close: () => void
    continue: () => void
    changeMode: (mode: 'classic' | 'canvas') => void
    changeDontShowAgain: (value: boolean) => void
  }
}

export function SurveyCreateIntro({ open, state, actions }: Props) {
  return (
    <SurveyDialogFrame open={open} dialogKey="surveys-create-intro" labelledBy="surveys-onboard-title"
      backdropDuration={0.2} dialogDuration={0.28} onClose={actions.close}>
      <div className="surveys-onboard-head">
        <div className="surveys-onboard-head-text">
          <h2 id="surveys-onboard-title" className="surveys-onboard-title">
            Как вы хотите создать опрос?
          </h2>
          <p className="surveys-onboard-lead">
            Нажмите на вариант ниже — покажем, чем они отличаются. Это только стартовая заготовка: дальше всё настраивается в админке.
          </p>
        </div>
        <button
          type="button"
          className="surveys-onboard-close"
          onClick={actions.close}
          aria-label="Закрыть"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
            <path d="M3.5 3.5l7 7M10.5 3.5l-7 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      <div className="surveys-onboard-pick-grid">
        <button
          type="button"
          aria-pressed={state.mode === 'classic'}
          className={`surveys-onboard-pick ${state.mode === 'classic' ? 'surveys-onboard-pick--on' : ''}`}
          onClick={() => actions.changeMode('classic')}
        >
          <span className="surveys-onboard-pick-label">Классика — как по шаблону</span>
          <span className="surveys-onboard-pick-hint">Список вопросов во вкладке «Вопросы»</span>
          <span className="surveys-onboard-wire surveys-onboard-wire--classic" aria-hidden>
            <span className="surveys-onboard-wire-row" />
            <span className="surveys-onboard-wire-row" />
            <span className="surveys-onboard-wire-row surveys-onboard-wire-row--short" />
          </span>
        </button>
        <button
          type="button"
          aria-pressed={state.mode === 'canvas'}
          className={`surveys-onboard-pick ${state.mode === 'canvas' ? 'surveys-onboard-pick--on' : ''}`}
          onClick={() => actions.changeMode('canvas')}
        >
          <span className="surveys-onboard-pick-label">С нуля — конструктор</span>
          <span className="surveys-onboard-pick-hint">Страницы, блоки текста и ширина карточек</span>
          <span className="surveys-onboard-wire surveys-onboard-wire--canvas" aria-hidden>
            <span className="surveys-onboard-wire-page" />
            <span className="surveys-onboard-wire-page surveys-onboard-wire-page--sm" />
          </span>
        </button>
      </div>

      <div className="surveys-onboard-detail" key={state.mode}>
        {state.mode === 'classic' ? (
          <>
            <p className="surveys-onboard-detail-title">Классика</p>
            <ul className="surveys-onboard-bullets">
              <li>Пустой опрос и привычный список вопросов: тип, текст, варианты ответов.</li>
              <li>Удобно, если нужен быстрый старт без визуальной сцены и отдельных «экранов».</li>
              <li>Респондент видит вопросы в линейном потоке — как в типовом опроснике.</li>
            </ul>
          </>
        ) : (
          <>
            <p className="surveys-onboard-detail-title">Конструктор</p>
            <ul className="surveys-onboard-bullets">
              <li>Отдельная вкладка «Конструктор»: страница приветствия и шаги с блоками на canvas.</li>
              <li>Можно расставить текст, кнопку «Начать», ширину карточек и порядок шагов.</li>
              <li>После создания сразу откроется конструктор — добавьте блоки и вопросы.</li>
            </ul>
          </>
        )}
      </div>

      <div className="surveys-onboard-reassure">
        <span className="surveys-onboard-reassure-icon" aria-hidden>
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M9 16.5a7.5 7.5 0 100-15 7.5 7.5 0 000 15z" stroke="currentColor" strokeWidth="1.3" />
            <path d="M9 12.2V9M9 6.3h.01" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
          </svg>
        </span>
        <p>
          Не переживайте из‑за выбора: это только то, с чего удобнее начать.
          Конструктор не «ломает» остальные опросы — у каждого свой режим.
          Если сомневаетесь, начните с классики: это спокойный и быстрый путь.
        </p>
      </div>

      <label className="surveys-onboard-skip-label">
        <input
          type="checkbox"
          checked={state.dontShowAgain}
          onChange={e => actions.changeDontShowAgain(e.target.checked)}
        />
        <span>Больше не показывать это окно</span>
      </label>

      <div className="surveys-onboard-actions">
        <button type="button" className="surveys-onboard-btn-secondary" onClick={actions.close}>
          Назад
        </button>
        <button type="button" className="surveys-onboard-btn-primary" onClick={actions.continue}>
          Понятно, ввести название и slug
        </button>
      </div>
    </SurveyDialogFrame>
  )
}
