import { motion, easeOut, AnimatePresence } from 'framer-motion'

const NAV_ITEMS = [
  { label: 'Вопросы', icon: (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 3h8M2 6h8M2 9h5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
  )},
  { label: 'Ответы', icon: (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M1.5 10V4.5L6 1.5l4.5 3V10H1.5z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/></svg>
  )},
  { label: 'Аналитика', icon: (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><rect x="1" y="7" width="2" height="4" rx=".5" fill="currentColor"/><rect x="5" y="4" width="2" height="7" rx=".5" fill="currentColor"/><rect x="9" y="1" width="2" height="10" rx=".5" fill="currentColor"/></svg>
  )},
  { label: 'Дизайн', icon: (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.3"/><circle cx="6" cy="6" r="1.5" fill="currentColor"/></svg>
  )},
  { label: 'Настройки', icon: (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><circle cx="6" cy="6" r="1.8" stroke="currentColor" strokeWidth="1.3"/><path d="M6 1v1.2M6 9.8V11M1 6h1.2M9.8 6H11M2.46 2.46l.85.85M8.69 8.69l.85.85M2.46 9.54l.85-.85M8.69 3.31l.85-.85" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
  )},
]

function ConstructorPreview() {
  return (
    <div className="askly-preview">
      <div className="askly-preview__sidebar">
        <div className="askly-preview__sb-brand">
          <img src="/favicon.svg" alt="" style={{ width: 14, height: 'auto' }} />
          <span>Askly</span>
        </div>
        <div className="askly-preview__sb-section">Опросники</div>
        {NAV_ITEMS.map((item, i) => (
          <div key={item.label} className={`askly-preview__sb-item${i === 0 ? ' askly-preview__sb-item--active' : ''}`}>
            <span className="askly-preview__sb-icon">{item.icon}</span>
            {item.label}
          </div>
        ))}
      </div>

      <div className="askly-preview__main">
        <div className="askly-preview__topbar">
          <div className="askly-preview__topbar-left">
            <span className="askly-preview__topbar-title">Редактор вопросов</span>
            <span className="askly-preview__topbar-count">3 вопроса</span>
          </div>
          <div className="askly-preview__topbar-btn">
            <svg width="9" height="9" viewBox="0 0 9 9" fill="none"><path d="M4.5 1v7M1 4.5h7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
            Вопрос
          </div>
        </div>
        <div className="askly-preview__questions">

          <div className="askly-preview__qcard askly-preview__qcard--active">
            <div className="askly-preview__qcard-head">
              <span className="askly-preview__qcard-num">01</span>
              <span className="askly-preview__qcard-type askly-preview__qcard-type--checkbox">
                <svg width="8" height="8" viewBox="0 0 8 8" fill="none"><rect x=".5" y=".5" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.1"/><path d="M2 4l1.3 1.3L6 2.5" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round"/></svg>
                CHECKBOX
              </span>
            </div>
            <div className="askly-preview__qcard-title">Цель внедрения CRM?</div>
            <div className="askly-preview__qcard-opts">
              {[
                { label: 'Автоматизация продаж', checked: true },
                { label: 'Управление клиентами', checked: false },
                { label: 'Аналитика', checked: false },
              ].map(o => (
                <div key={o.label} className="askly-preview__qcard-opt">
                  <div className={`askly-preview__qcard-check${o.checked ? ' askly-preview__qcard-check--on' : ''}`}>
                    {o.checked && <svg width="7" height="7" viewBox="0 0 7 7" fill="none"><path d="M1.5 3.5l1.3 1.3L5.5 1.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                  </div>
                  <span className={o.checked ? 'askly-preview__qcard-opt--on' : ''}>{o.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="askly-preview__qcard">
            <div className="askly-preview__qcard-head">
              <span className="askly-preview__qcard-num">02</span>
              <span className="askly-preview__qcard-type askly-preview__qcard-type--radio">
                <svg width="8" height="8" viewBox="0 0 8 8" fill="none"><circle cx="4" cy="4" r="3.5" stroke="currentColor" strokeWidth="1.1"/><circle cx="4" cy="4" r="1.8" fill="currentColor"/></svg>
                RADIO
              </span>
            </div>
            <div className="askly-preview__qcard-title">Использовали CRM раньше?</div>
            <div className="askly-preview__qcard-opts">
              {['Да', 'Нет, впервые'].map(o => (
                <div key={o} className="askly-preview__qcard-opt">
                  <div className="askly-preview__qcard-radio" />
                  <span>{o}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="askly-preview__qcard">
            <div className="askly-preview__qcard-head">
              <span className="askly-preview__qcard-num">03</span>
              <span className="askly-preview__qcard-type askly-preview__qcard-type--text">
                <svg width="8" height="8" viewBox="0 0 8 8" fill="none"><path d="M1 2h6M1 4h6M1 6h3.5" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/></svg>
                TEXT
              </span>
            </div>
            <div className="askly-preview__qcard-title">Имя и телефон</div>
            <div className="askly-preview__qcard-input">
              <span className="askly-preview__qcard-input-placeholder">Ваш ответ...</span>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}

type AsklyProductModalProps = {
  onClose: () => void
}

export function AsklyProductModal({ onClose }: AsklyProductModalProps) {
  return (
    <AnimatePresence>
      <motion.div
        className="askly-modal-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="askly-modal"
          initial={{ opacity: 0, y: 24, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 12, scale: 0.97 }}
          transition={{ duration: 0.35, ease: easeOut }}
          onClick={e => e.stopPropagation()}
        >
          <div className="askly-modal__glow" />

          <button type="button" className="askly-modal__close" onClick={onClose} aria-label="Закрыть">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
            </svg>
          </button>

          <div className="askly-modal__layout">
            <div className="askly-modal__left">
              <div className="askly-modal__brand">
                <div className="askly-modal__icon-wrap">
                  <img src="/favicon.svg" alt="Askly" className="askly-modal__icon" />
                </div>
                <div className="askly-modal__title">Askly</div>
              </div>

              <p className="askly-modal__lead">
                Платформа для создания опросов, сбора заявок и аналитики — без разработчиков.
              </p>

              <ul className="askly-modal__features">
                <li>
                  <div className="askly-modal__feat-line" />
                  <div>
                    <div className="askly-modal__feat-name">Конструктор вопросов</div>
                    <div className="askly-modal__feat-desc">Любые типы, ветвления, логика показа</div>
                  </div>
                </li>
                <li>
                  <div className="askly-modal__feat-line" />
                  <div>
                    <div className="askly-modal__feat-name">Аналитика в реальном времени</div>
                    <div className="askly-modal__feat-desc">Графики, фильтры, экспорт ответов</div>
                  </div>
                </li>
                <li>
                  <div className="askly-modal__feat-line" />
                  <div>
                    <div className="askly-modal__feat-name">Telegram-уведомления</div>
                    <div className="askly-modal__feat-desc">Алерт мгновенно при каждом ответе</div>
                  </div>
                </li>
                <li>
                  <div className="askly-modal__feat-line" />
                  <div>
                    <div className="askly-modal__feat-name">Кастомный дизайн</div>
                    <div className="askly-modal__feat-desc">Логотип, цвета и стиль под бренд</div>
                  </div>
                </li>
              </ul>

              <div className="askly-modal__footer">
                <span className="askly-modal__footer-dot" />
                Этот опрос создан внутри Askly
              </div>
            </div>

            <div className="askly-modal__right">
              <ConstructorPreview />
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
