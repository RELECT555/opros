import { useState, useEffect } from 'react'
import { motion, easeOut } from 'framer-motion'
import { getResponses, getTokens } from '../../lib/supabase'
import type { SurveyRecord, TokenRecord, ResponseStatus } from '../../lib/supabase'
import { AnalyticsTabSkeleton } from './AdminSkeletons'

const CURRENT_LABELS: Record<string, string> = {
  yes:       'Да, используем CRM',
  no:        'Нет, работаем без CRM',
  looking:   'Выбираем CRM прямо сейчас',
  switching: 'Хотим сменить текущую',
}

const STATUS_CONFIG: Record<ResponseStatus, { label: string; cls: string }> = {
  new:         { label: 'Новая',      cls: 'adm-status--new' },
  called:      { label: 'Позвонили',  cls: 'adm-status--called' },
  in_progress: { label: 'В работе',   cls: 'adm-status--progress' },
  closed:      { label: 'Закрыто',    cls: 'adm-status--closed' },
}
const STATUS_ORDER: ResponseStatus[] = ['new', 'called', 'in_progress', 'closed']

interface Props {
  surveyId: number
}

export function AnalyticsTab({ surveyId }: Props) {
  const [responses, setResponses] = useState<SurveyRecord[]>([])
  const [tokens, setTokens] = useState<TokenRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([getResponses(surveyId), getTokens(surveyId)])
      .then(([r, t]) => { setResponses(r); setTokens(t) })
      .catch(e => setError(e.message ?? 'Ошибка загрузки'))
      .finally(() => setLoading(false))
  }, [surveyId])

  if (loading) {
    return <AnalyticsTabSkeleton />
  }
  if (error) {
    return <div className="adm-tab-content"><p className="adm-err-banner">{error}</p></div>
  }

  const total = responses.length

  const byStatus = STATUS_ORDER.reduce<Record<string, number>>((acc, s) => {
    acc[s] = responses.filter(r => (r.status ?? 'new') === s).length
    return acc
  }, {})

  const tokensTotal  = tokens.length
  const tokensOpened = tokens.filter(t => t.opened_at).length
  const tokensFilled = tokens.filter(t => t.used_at).length
  const convPct      = tokensTotal > 0 ? Math.round((tokensFilled / tokensTotal) * 100) : 0
  const openPct      = tokensTotal > 0 ? Math.round((tokensOpened / tokensTotal) * 100) : 0

  const purposeCount: Record<string, number> = {}
  responses.forEach(r => r.crm_purpose.forEach(p => { purposeCount[p] = (purposeCount[p] ?? 0) + 1 }))
  const topPurpose = Object.entries(purposeCount).sort((a, b) => b[1] - a[1]).slice(0, 6)

  const crmCount: Record<string, number> = {}
  responses.forEach(r => r.crm_used_before.forEach(c => { crmCount[c] = (crmCount[c] ?? 0) + 1 }))
  const topCrm = Object.entries(crmCount).sort((a, b) => b[1] - a[1]).slice(0, 6)

  const currentCount: Record<string, number> = {}
  responses.forEach(r => { currentCount[r.current_crm] = (currentCount[r.current_crm] ?? 0) + 1 })

  const maxPurpose = topPurpose[0]?.[1] ?? 1
  const maxCrm     = topCrm[0]?.[1] ?? 1
  const maxCurrent = Math.max(...Object.values(currentCount), 1)

  const kpiChild = {
    hidden: { opacity: 0, y: 14 },
    show:   { opacity: 1, y: 0, transition: { duration: 0.35, ease: easeOut } },
  }
  const kpiContainer = {
    hidden: {},
    show:   { transition: { staggerChildren: 0.05 } },
  }

  return (
    <div className="adm-tab-content adm-analytics">
      <header className="adm-analytics-header">
        <div className="adm-analytics-header-text">
          <h2 className="adm-section-title adm-analytics-title-main">Аналитика</h2>
          <p className="adm-analytics-lead">
            Сводка по заявкам, токенам и ответам опроса
          </p>
        </div>
        {total > 0 && (
          <div className="adm-analytics-header-badge" aria-hidden>
            <span className="adm-analytics-header-badge-value">{total}</span>
            <span className="adm-analytics-header-badge-label">заявок</span>
          </div>
        )}
      </header>

      <motion.div
        className="adm-kpi-grid"
        initial="hidden"
        animate="show"
        variants={kpiContainer}
      >
        <motion.div
          className="adm-card adm-kpi-card adm-kpi-card--total"
          variants={kpiChild}
        >
          <span className="adm-kpi-eyebrow">Итого</span>
          <span className="adm-kpi-value adm-kpi-value--lg">{total}</span>
          <span className="adm-kpi-label">Всего заявок</span>
        </motion.div>
        {STATUS_ORDER.map(s => (
          <motion.div
            key={s}
            className={`adm-card adm-kpi-card adm-kpi-card--status adm-kpi-card--${s}`}
            variants={kpiChild}
          >
            <span className={`adm-kpi-value adm-kpi--${s}`}>{byStatus[s] ?? 0}</span>
            <span className="adm-kpi-label">{STATUS_CONFIG[s].label}</span>
          </motion.div>
        ))}
      </motion.div>

      <div className="adm-card adm-analytics-section adm-analytics-section--tokens">
        <div className="adm-analytics-section-head">
          <h3 className="adm-analytics-title">Конверсия токенов</h3>
          {tokensTotal > 0 && (
            <span className="adm-analytics-section-hint">
              от отправки до заполнения
            </span>
          )}
        </div>
        <div className="adm-token-metrics">
          <div className="adm-token-metric">
            <span className="adm-token-metric-value">{tokensTotal}</span>
            <span className="adm-token-metric-label">Отправлено</span>
          </div>
          <div className="adm-token-metric">
            <span className="adm-token-metric-value adm-kpi--called">{tokensOpened}</span>
            <span className="adm-token-metric-label">Открыто</span>
          </div>
          <div className="adm-token-metric">
            <span className="adm-token-metric-value adm-kpi--closed">{tokensFilled}</span>
            <span className="adm-token-metric-label">Заполнено</span>
          </div>
        </div>
        {tokensTotal > 0 && (
          <div className="adm-token-funnel">
            <div className="adm-token-funnel-row">
              <div className="adm-token-funnel-labels">
                <span>Открытие</span>
                <strong>{openPct}%</strong>
              </div>
              <div className="adm-token-funnel-track">
                <motion.div
                  className="adm-token-funnel-fill adm-token-funnel-fill--open"
                  initial={{ width: 0 }}
                  animate={{ width: `${openPct}%` }}
                  transition={{ duration: 0.65, ease: easeOut }}
                />
              </div>
            </div>
            <div className="adm-token-funnel-row">
              <div className="adm-token-funnel-labels">
                <span>Заполнение</span>
                <strong>{convPct}%</strong>
              </div>
              <div className="adm-token-funnel-track">
                <motion.div
                  className="adm-token-funnel-fill adm-token-funnel-fill--done"
                  initial={{ width: 0 }}
                  animate={{ width: `${convPct}%` }}
                  transition={{ duration: 0.65, ease: easeOut, delay: 0.08 }}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="adm-analytics-charts">
        {topPurpose.length > 0 && (
          <div className="adm-card adm-analytics-section">
            <h3 className="adm-analytics-title">Цели использования CRM</h3>
            <BarList items={topPurpose} max={maxPurpose} variant="accent" />
          </div>
        )}

        {topCrm.length > 0 && (
          <div className="adm-card adm-analytics-section">
            <h3 className="adm-analytics-title">Ранее использованные CRM</h3>
            <BarList items={topCrm} max={maxCrm} variant="purple" />
          </div>
        )}

        {Object.keys(currentCount).length > 0 && (
          <div className="adm-card adm-analytics-section">
            <h3 className="adm-analytics-title">Текущая ситуация с CRM</h3>
            <BarList
              items={Object.entries(currentCount)
                .sort((a, b) => b[1] - a[1])
                .map(([k, v]) => [CURRENT_LABELS[k] ?? k, v])}
              max={maxCurrent}
              variant="green"
            />
          </div>
        )}
      </div>

      {total === 0 && (
        <div className="adm-empty adm-analytics-empty">
          <div className="adm-analytics-empty-icon" aria-hidden />
          <p>Данных для анализа пока нет</p>
          <span>Аналитика появится после первых ответов на опрос</span>
        </div>
      )}
    </div>
  )
}

type BarVariant = 'accent' | 'purple' | 'green'

function BarList({
  items,
  max,
  variant,
}: {
  items: [string, number][]
  max: number
  variant: BarVariant
}) {
  const fillClass =
    variant === 'purple'
      ? 'adm-bar-fill--purple'
      : variant === 'green'
        ? 'adm-bar-fill--green'
        : 'adm-bar-fill--accent'
  return (
    <div className="adm-bar-list">
      {items.map(([label, count]) => (
        <div key={label} className="adm-bar-row">
          <div className="adm-bar-head">
            <span className="adm-bar-label" title={label}>{label}</span>
            <span className="adm-bar-pill">{count}</span>
          </div>
          <div className="adm-bar-track">
            <motion.div
              className={`adm-bar-fill ${fillClass}`}
              initial={{ width: 0 }}
              animate={{ width: `${(count / max) * 100}%` }}
              transition={{ duration: 0.6, ease: easeOut }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}
