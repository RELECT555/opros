import { motion, easeOut } from 'framer-motion'

type Props = {
  onContinue: () => void
}

function ShieldIcon() {
  return (
    <svg width="40" height="40" viewBox="0 0 40 40" fill="none" aria-hidden>
      <path
        d="M20 4l12 4v10c0 8-5.2 14.8-12 16-6.8-1.2-12-8-12-16V8l12-4z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path d="M14 20l4 4 8-8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function AdminLinkWelcomeGate({ onContinue }: Props) {
  return (
    <motion.div
      className="admin-link-gate"
      role="dialog"
      aria-modal="true"
      aria-labelledby="admin-link-gate-title"
      aria-describedby="admin-link-gate-desc"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.28, ease: easeOut }}
    >
      <motion.div
        className="admin-link-gate__card"
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.4, ease: easeOut, delay: 0.05 }}
      >
        <div className="admin-link-gate__icon-wrap" aria-hidden>
          <ShieldIcon />
        </div>
        <h2 id="admin-link-gate-title" className="admin-link-gate__title">
          Служебная ссылка для редактирования
        </h2>
        <div id="admin-link-gate-desc" className="admin-link-gate__body">
          <p>
            Вы открыли опрос по администраторской ссылке: так можно менять вопросы и оформление на живой
            странице.
          </p>
          <p>
            <strong>Никому не отправляйте и не публикуйте этот адрес.</strong> Делитесь с респондентами
            только обычной ссылкой на опрос <span className="admin-link-gate__muted">(без параметра вроде</span>{' '}
            <code className="admin-link-gate__code">?edit=1</code>
            <span className="admin-link-gate__muted">).</span>
          </p>
        </div>
        <button type="button" className="admin-link-gate__btn" onClick={onContinue}>
          Понятно, продолжить
        </button>
      </motion.div>
    </motion.div>
  )
}
