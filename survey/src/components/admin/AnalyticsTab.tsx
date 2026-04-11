import { useState, useEffect } from 'react'
import { motion, easeOut } from 'framer-motion'
import { getResponses, getTokens } from '../../lib/supabase'
import type { SurveyRecord, TokenRecord, ResponseStatus } from '../../lib/supabase'

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

export function AnalyticsTab() {
  const [responses, setResponses] = useState<SurveyRecord[]>([])
  const [tokens, setTokens] = useState<TokenRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([getResponses(), getTokens()])
      .then(([r, t]) => { setResponses(r); setTokens(t) })
      .catch(e => setError(e.message ?? 'Ошибка загрузки'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="adm-tab-content">
        <div className="adm-loading-rows">
          {[1, 2, 3].map(i => <div key={i} className="adm-skeleton" style={{ opacity: 1 - i * 0.25 }} />)}
        </div>
      </div>
    )
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

  return (
    <div className="adm-tab-content">
      <div className="adm-section-head">
        <div className="adm-section-title-row">
          <h2 className="adm-section-title">Аналитика</h2>
        </div>
      </div>

      {/* KPI — статусы */}
      <div className="adm-kpi-grid">
        <div className="adm-card adm-kpi-card">
          <span className="adm-kpi-value">{total}</span>
          <span className="adm-kpi-label">Всего заявок</span>
        </div>
        {STATUS_ORDER.map(s => (
          <div key={s} className="adm-card adm-kpi-card">
            <span className={`adm-kpi-value adm-kpi--${s}`}>{byStatus[s] ?? 0}</span>
            <span className="adm-kpi-label">{STATUS_CONFIG[s].label}</span>
          </div>
        ))}
      </div>

      {/* Токены */}
      <div className="adm-card adm-analytics-section">
        <h3 className="adm-analytics-title">Конверсия токенов</h3>
        <div className="adm-kpi-grid adm-kpi-grid--3">
          <div className="adm-kpi-card adm-kpi-card--inline">
            <span className="adm-kpi-value">{tokensTotal}</span>
            <span className="adm-kpi-label">Отправлено</span>
          </div>
          <div className="adm-kpi-card adm-kpi-card--inline">
            <span className="adm-kpi-value adm-kpi--called">{tokensOpened}</span>
            <span className="adm-kpi-label">Открыто</span>
          </div>
          <div className="adm-kpi-card adm-kpi-card--inline">
            <span className="adm-kpi-value adm-kpi--closed">{tokensFilled}</span>
            <span className="adm-kpi-label">Заполнено ({convPct}%)</span>
          </div>
        </div>
      </div>

      {/* Топ целей */}
      {topPurpose.length > 0 && (
        <div className="adm-card adm-analytics-section">
          <h3 className="adm-analytics-title">Цели использования CRM</h3>
          <BarList items={topPurpose} max={maxPurpose} colorClass="" />
        </div>
      )}

      {/* Ранее использованные CRM */}
      {topCrm.length > 0 && (
        <div className="adm-card adm-analytics-section">
          <h3 className="adm-analytics-title">Ранее использованные CRM</h3>
          <BarList items={topCrm} max={maxCrm} colorClass="adm-bar-fill--purple" />
        </div>
      )}

      {/* Текущая ситуация */}
      {Object.keys(currentCount).length > 0 && (
        <div className="adm-card adm-analytics-section">
          <h3 className="adm-analytics-title">Текущая ситуация с CRM</h3>
          <BarList
            items={Object.entries(currentCount)
              .sort((a, b) => b[1] - a[1])
              .map(([k, v]) => [CURRENT_LABELS[k] ?? k, v])}
            max={maxCurrent}
            colorClass="adm-bar-fill--green"
          />
        </div>
      )}

      {total === 0 && (
        <div className="adm-empty">
          <p>Данных для анализа пока нет</p>
          <span>Аналитика появится после первых ответов на опрос</span>
        </div>
      )}
    </div>
  )
}

function BarList({ items, max, colorClass }: { items: [string, number][]; max: number; colorClass: string }) {
  return (
    <div className="adm-bar-list">
      {items.map(([label, count]) => (
        <div key={label} className="adm-bar-row">
          <span className="adm-bar-label">{label}</span>
          <div className="adm-bar-track">
            <motion.div
              className={`adm-bar-fill ${colorClass}`}
              initial={{ width: 0 }}
              animate={{ width: `${(count / max) * 100}%` }}
              transition={{ duration: 0.6, ease: easeOut }}
            />
          </div>
          <span className="adm-bar-count">{count}</span>
        </div>
      ))}
    </div>
  )
}
