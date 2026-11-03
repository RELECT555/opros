import { useRef } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { welcomeCopy } from '../../lib/welcomeCopy'
import { BackgroundMotionToggle } from './BackgroundMotionToggle'
import './welcome-intro.css'

interface Props {
  title: string
  sub: string
  btnLabel: string
  badgeLabel: string
  hintLeft: string
  hintRight: string
  questionCount?: number
  logoUrl?: string
  topics?: { id: string; title: string }[]
  onStart: () => void
}

/** Classic respondent welcome. Canvas composition is owned by WelcomeScreen. */
export function WelcomeIntro(props: Props) {
  const reduceMotion = useReducedMotion()
  const started = useRef(false)
  const copy = welcomeCopy(props)

  function start() {
    if (started.current) return
    started.current = true
    props.onStart()
  }

  return (
    <motion.main
      className={`welcome-intro${props.topics?.length ? ' welcome-intro--with-topics' : ''}`}
      aria-labelledby="welcome-title"
      initial={false}
      exit={{ opacity: 0 }}
      transition={{ duration: reduceMotion ? 0 : 0.18 }}
    >
      <header className="welcome-intro__header">
        <span className="welcome-intro__brand">
          <img src={props.logoUrl || '/favicon.svg'} alt={props.logoUrl ? 'Логотип организатора опроса' : ''} width="24" height="24" />
          {!props.logoUrl && <span>Askly</span>}
        </span>
        <span className="welcome-intro__header-note">Короткий опрос. Внимание к вашим задачам.</span>
      </header>

      <div className="welcome-intro__body">
        <div className="welcome-intro__content">
          {props.badgeLabel && (
            <p className="welcome-intro__eyebrow">
              {props.badgeLabel}
            </p>
          )}
          <h1 id="welcome-title" className="welcome-intro__title">{copy.title}</h1>
          {copy.sub && <p className="welcome-intro__description">{copy.sub}</p>}

          <div className="welcome-intro__action">
            {(copy.count || copy.hintLeft) && (
              <p className="welcome-intro__duration">
                {copy.count && <span>{copy.count}</span>}
                {copy.count && copy.hintLeft && <span aria-hidden="true">·</span>}
                {copy.hintLeft && <span>{copy.hintLeft}</span>}
              </p>
            )}
            <button type="button" className="welcome-intro__cta" onClick={start}>
              {copy.btnLabel}
              <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M4 12h15m-6-6 6 6-6 6" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            {copy.hintRight && <p className="welcome-intro__reassurance">{copy.hintRight}</p>}
          </div>
        </div>
        {!!props.topics?.length && (
          <aside className="welcome-intro__topics" aria-labelledby="welcome-topics-title">
            <p className="welcome-intro__topics-kicker">Перед началом</p>
            <h2 id="welcome-topics-title">О чём вас спросим</h2>
            <ol>
              {props.topics.slice(0, 4).map((topic, index) => (
                <li key={topic.id}>
                  <span className="welcome-intro__topic-index" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
                  <span>{topic.title}</span>
                </li>
              ))}
            </ol>
            {props.topics.length > 4 && <p className="welcome-intro__topics-more">И ещё {props.topics.length - 4}</p>}
            <p className="welcome-intro__topics-note">Здесь нет правильных ответов — важен ваш опыт.</p>
          </aside>
        )}
      </div>

      <footer className="welcome-intro__footer">
        <span>Опрос на платформе Askly</span>
        <BackgroundMotionToggle />
      </footer>
    </motion.main>
  )
}
