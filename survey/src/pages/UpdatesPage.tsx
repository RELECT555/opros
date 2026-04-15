import { motion, easeOut } from 'framer-motion'
import { Link } from 'react-router-dom'
import { DottedSurface } from '../components/ui/DottedSurface'
import { productUpdates } from '../data/productUpdates'
import { formatProductUpdateDate } from '../lib/formatProductUpdateDate'
import '../styles/survey.css'

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.55, delay, ease: easeOut },
})

export default function UpdatesPage() {
  return (
    <div className="root root--updates lp-root">
      <div className="bg-scene">
        <div className="bg-orb bg-orb--1" />
        <div className="bg-orb bg-orb--2" />
        <div className="bg-orb bg-orb--3" />
        <div className="bg-grid" />
      </div>
      <DottedSurface className="fixed inset-0 z-0" />

      <motion.div className="lp-topbar" {...fadeUp(0)}>
        <Link to="/" className="welcome-brand welcome-brand--inline" style={{ textDecoration: 'none', color: 'inherit' }}>
          <img src="/favicon.svg" alt="" className="welcome-brand__icon" />
          <span className="welcome-brand__name">Askly</span>
        </Link>
        <div className="lp-topbar__actions">
          <Link to="/updates" className="lp-btn lp-btn--ghost" style={{ padding: '8px 18px', fontSize: '13px' }}>
            Обновления
          </Link>
          <a href="/admin" className="lp-btn lp-btn--primary" style={{ padding: '8px 18px', fontSize: '13px' }}>
            Войти
          </a>
        </div>
      </motion.div>

      <div className="lp-wrap lp-wrap--updates">
        <motion.section className="lp-section lp-updates-hero" {...fadeUp(0.06)}>
          <h1 className="lp-section__title">Что нового</h1>
          <p className="lp-hero__sub">
            Краткая история заметных изменений в Askly. Мы дополняем список по мере выхода функций и улучшений.
          </p>
        </motion.section>

        <motion.div
          className="lp-updates-list"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.12, ease: easeOut }}
        >
          {productUpdates.map(u => (
            <article key={`${u.date}-${u.title}`} className="lp-update-card">
              <time className="lp-update-card__date" dateTime={u.date}>
                {formatProductUpdateDate(u.date)}
              </time>
              <h2 className="lp-update-card__title">{u.title}</h2>
              <ul className="lp-update-card__list">
                {u.items.map(item => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </article>
          ))}
        </motion.div>

        <footer className="lp-footer">
          <Link to="/" className="lp-footer__link">
            ← На главную
          </Link>
          <span>© 2026 Askly</span>
        </footer>
      </div>
    </div>
  )
}
