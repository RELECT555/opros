import { motion, easeOut } from 'framer-motion'

function ClockIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
      <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M8 5v3.5l2 1.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

function LockIcon() {
  return (
    <svg width="12" height="13" viewBox="0 0 14 16" fill="none" style={{ flexShrink: 0 }}>
      <rect x="1.5" y="7" width="11" height="8" rx="2" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M4 7V5a3 3 0 1 1 6 0v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  )
}

interface WelcomeScreenProps {
  onStart: () => void
  title?: string
  sub?: string
  questionCount?: number
}

export function WelcomeScreen({ onStart, title, sub, questionCount }: WelcomeScreenProps) {
  const displayTitle = title ?? 'Помогите нам стать лучше для вас'
  const displaySub   = sub ?? `Пройдите короткий опрос из ${questionCount ?? 4} вопросов — и мы свяжемся с вами.`

  return (
    <motion.div
      key="welcome"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.45, ease: easeOut }}
      className="welcome-wrap"
    >
      {/* Badge */}
      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.05, ease: easeOut }}
        className="welcome-badge"
      >
        <span className="welcome-badge__dot" />
        Бесплатная консультация
      </motion.div>

      {/* Heading */}
      <motion.h1
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.14, ease: easeOut }}
        className="welcome-heading"
      >
        {displayTitle}
      </motion.h1>

      {/* Sub */}
      <motion.p
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.24, ease: easeOut }}
        className="welcome-sub"
      >
        {displaySub}
      </motion.p>

      {/* CTA */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.34, ease: easeOut }}
        className="welcome-actions"
      >
        <motion.button
          className="welcome-cta"
          onClick={onStart}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
        >
          Начать опрос
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="welcome-cta__arrow">
            <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </motion.button>

        <div className="welcome-hints">
          <div className="welcome-hint-item">
            <ClockIcon /> 2 минуты
          </div>
          <span className="welcome-dot" />
          <div className="welcome-hint-item">
            <LockIcon /> данные в безопасности
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}
