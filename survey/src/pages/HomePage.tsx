import { motion, easeOut } from 'framer-motion'
import { DottedSurface } from '../components/ui/dotted-surface'
import '../App.css'

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.55, delay, ease: easeOut },
})

const features = [
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>
      </svg>
    ),
    title: 'Опросы по ссылке',
    desc: 'Клиент получает персональную ссылку и проходит опрос за 2 минуты — без регистрации.',
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>
      </svg>
    ),
    title: 'Аналитика в реальном времени',
    desc: 'Ответы сразу попадают в дашборд. Графики, фильтры и статусы заявок.',
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81 19.79 19.79 0 01.12 1.2 2 2 0 012.11 0h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L6.91 7.91a16 16 0 006.16 6.16l.45-.45a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"/>
      </svg>
    ),
    title: 'Telegram-уведомления',
    desc: 'Мгновенный алерт в Telegram при каждом новом ответе. Ничего не пропустите.',
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3"/><path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/>
      </svg>
    ),
    title: 'Кастомный дизайн',
    desc: 'Логотип, цвета, фирменный стиль. Опрос выглядит как часть вашего бренда.',
  },
]

const steps = [
  { num: '01', title: 'Создайте опрос', desc: 'Добавьте вопросы в конструкторе — чекбоксы, радио, шкалы, текст.' },
  { num: '02', title: 'Отправьте ссылку', desc: 'Сгенерируйте персональные ссылки и разошлите клиентам.' },
  { num: '03', title: 'Получайте заявки', desc: 'Ответы приходят в реальном времени с уведомлениями в Telegram.' },
]

export default function HomePage() {
  return (
    <div className="root lp-root">
      <div className="bg-scene">
        <div className="bg-orb bg-orb--1" />
        <div className="bg-orb bg-orb--2" />
        <div className="bg-orb bg-orb--3" />
        <div className="bg-grid" />
      </div>
      <DottedSurface className="fixed inset-0 z-0" />

      {/* Шапка */}
      <motion.div className="lp-topbar" {...fadeUp(0)}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <img src="/favicon.svg" alt="Askly" className="welcome-brand__icon" />
          <span className="welcome-brand__name">Askly</span>
        </div>
        <a href="/admin" className="lp-btn lp-btn--primary" style={{ padding: '8px 18px', fontSize: '13px' }}>
          Войти
        </a>
      </motion.div>

      <div className="lp-wrap">

        {/* ── Hero ── */}
        <section className="lp-hero">
          <motion.div className="welcome-badge" {...fadeUp(0.05)}>
            <span className="welcome-badge__dot" />
            Платформа для сбора обратной связи
          </motion.div>

          <motion.h1 className="lp-hero__title" {...fadeUp(0.12)}>
            Опросы, которые <span className="lp-hero__accent">приносят заявки</span>
          </motion.h1>

          <motion.p className="lp-hero__sub" {...fadeUp(0.2)}>
            Создавайте красивые опросы, отправляйте персональные ссылки клиентам
            и получайте ответы с аналитикой в реальном времени.
          </motion.p>

        </section>

        {/* ── How it works ── */}
        <motion.section
          className="lp-section"
          initial={{ opacity: 0, y: 32 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.55, ease: easeOut }}
        >
          <div className="lp-section__label">Как это работает</div>
          <h2 className="lp-section__title">Три шага до результата</h2>

          <div className="lp-steps">
            {steps.map((s, i) => (
              <motion.div
                key={s.num}
                className="lp-step"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.45, delay: i * 0.1, ease: easeOut }}
              >
                <div className="lp-step__num">{s.num}</div>
                <div className="lp-step__title">{s.title}</div>
                <div className="lp-step__desc">{s.desc}</div>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* ── Features ── */}
        <motion.section
          className="lp-section"
          initial={{ opacity: 0, y: 32 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.55, ease: easeOut }}
        >
          <div className="lp-section__label">Возможности</div>
          <h2 className="lp-section__title">Всё что нужно для работы</h2>

          <div className="lp-features">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                className="lp-feature"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.45, delay: i * 0.08, ease: easeOut }}
              >
                <div className="lp-feature__icon">{f.icon}</div>
                <div className="lp-feature__title">{f.title}</div>
                <div className="lp-feature__desc">{f.desc}</div>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* ── CTA ── */}
        <motion.section
          className="lp-cta"
          initial={{ opacity: 0, y: 32 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.55, ease: easeOut }}
        >
          <div className="lp-cta__glow" />
          <h2 className="lp-cta__title">Готовы начать?</h2>
          <p className="lp-cta__sub">Войдите в панель и создайте первый опрос за 5 минут.</p>
          <a href="/admin" className="lp-btn lp-btn--primary lp-btn--lg">
            Открыть панель управления
            <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
              <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </a>
        </motion.section>

        {/* Footer */}
        <footer className="lp-footer">
          <span>© 2025 Askly</span>
        </footer>

      </div>
    </div>
  )
}
