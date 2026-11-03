import { useState, useCallback, useMemo } from 'react'
import { motion, easeOut } from 'framer-motion'
import { getResponses, getTokens } from '../../lib/api-client'
import type {
  SurveyRecord,
  TokenRecord,
  ResponseStatus,
  Survey,
} from '../../lib/supabase'
import { AnalyticsTabSkeleton } from './AdminSkeletons'
import { useAdminRefresh } from '../../lib/useAdminRefresh'
import { buildQuestionSections, buildLegacySections } from '../../features/responses/responseAnalytics'

const STATUS_CONFIG: Record<ResponseStatus, { label: string }> = {
  new:         { label: 'Новая' },
  called:      { label: 'Позвонили' },
  in_progress: { label: 'В работе' },
  closed:      { label: 'Закрыто' },
}
const STATUS_ORDER: ResponseStatus[] = ['new', 'called', 'in_progress', 'closed']

interface Props {
  surveyId: number
  survey: Survey
}

function responseHasLegacyColumnData(r: SurveyRecord): boolean {
  const purpose = r.crm_purpose?.filter(Boolean) ?? []
  const used = r.crm_used_before?.filter(Boolean) ?? []
  const cur = (r.current_crm ?? '').trim()
  return purpose.length > 0 || used.length > 0 || cur.length > 0
}

const legacyTitles = { purpose: 'Цели — история ответов', usedBefore: 'Опыт — история ответов', current: 'Ситуация — история ответов' }

export function AnalyticsTab({ surveyId, survey }: Props) {
  const [responses, setResponses] = useState<SurveyRecord[]>([])
  const [tokens, setTokens] = useState<TokenRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const refresh = useCallback(async (isCurrent: () => boolean) => {
    try {
      const [r, t] = await Promise.all([getResponses(surveyId), getTokens(surveyId)])
      if (!isCurrent()) return
      setResponses(r)
      setTokens(t)
      setError('')
    } catch (e) {
      if (isCurrent()) setError(e instanceof Error ? e.message : 'Ошибка загрузки')
    } finally {
      if (isCurrent()) setLoading(false)
    }
  }, [surveyId])
  useAdminRefresh(refresh)

  const showLegacyColumns = useMemo(
    () => responses.some(responseHasLegacyColumnData),
    [responses],
  )

  const { purpose: legacyPurpose, usedBefore: legacyUsedBefore, current: legacyCurrent } = useMemo(
    () => buildLegacySections(responses), [responses],
  )

  const questionSections = useMemo(
    () => buildQuestionSections(survey.config, responses),
    [survey, responses],
  )

  if (loading) return <AnalyticsTabSkeleton />
  if (error) return <div className="adm-tab-content"><p className="adm-err-banner">{error}</p></div>

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

  const maxPurpose = legacyPurpose[0]?.[1] ?? 1
  const maxUsed = legacyUsedBefore[0]?.[1] ?? 1
  const maxCurrent = legacyCurrent[0]?.[1] ?? 1

  const kpiChild = {
    hidden: { opacity: 0, y: 12 },
    show:   { opacity: 1, y: 0, transition: { duration: 0.35, ease: easeOut } },
  }
  const kpiContainer = {
    hidden: {},
    show:   { transition: { staggerChildren: 0.05 } },
  }
  const sectionAnim = {
    hidden: { opacity: 0, y: 14 },
    show:   { opacity: 1, y: 0, transition: { duration: 0.4, ease: easeOut } },
  }

  const hasDistributionCharts =
    questionSections.length > 0 ||
    (showLegacyColumns &&
      (legacyPurpose.length > 0 || legacyUsedBefore.length > 0 || legacyCurrent.length > 0))

  const distributionBlockCount =
    questionSections.length +
    (showLegacyColumns && legacyPurpose.length > 0 ? 1 : 0) +
    (showLegacyColumns && legacyUsedBefore.length > 0 ? 1 : 0) +
    (showLegacyColumns && legacyCurrent.length > 0 ? 1 : 0)

  const nq = questionSections.length
  const hasLegacyPurpose = showLegacyColumns && legacyPurpose.length > 0
  const hasLegacyUsed = showLegacyColumns && legacyUsedBefore.length > 0
  const hasLegacyCurrent = showLegacyColumns && legacyCurrent.length > 0
  const ordLegacyPurpose = hasLegacyPurpose ? nq + 1 : null
  const ordLegacyUsed = hasLegacyUsed ? nq + 1 + (hasLegacyPurpose ? 1 : 0) : null
  const ordLegacyCurrent = hasLegacyCurrent
    ? nq + 1 + (hasLegacyPurpose ? 1 : 0) + (hasLegacyUsed ? 1 : 0)
    : null

  return (
    <div className="adm-tab-content adm-analytics">
      <header className="adm-analytics-hero">
        <div className="adm-analytics-hero-text">
          <p className="adm-analytics-hero-eyebrow">{survey.title}</p>
          <h2 className="adm-analytics-hero-title">Аналитика</h2>
          <p className="adm-analytics-hero-lead">
            Сводка по ответам, этапам обработки и персональным ссылкам
          </p>
        </div>
        {total > 0 && (
          <div className="adm-analytics-hero-stat" aria-hidden>
            <span className="adm-analytics-hero-stat-value">{total}</span>
            <span className="adm-analytics-hero-stat-label">ответов</span>
          </div>
        )}
      </header>

      <nav className="adm-analytics-toc" aria-label="Разделы аналитики">
        <a className="adm-analytics-toc-link" href="#adm-analytics-overview">
          Сводка
        </a>
        <a className="adm-analytics-toc-link" href="#adm-analytics-tokens">
          Ссылки
        </a>
        {hasDistributionCharts && (
          <a className="adm-analytics-toc-link" href="#adm-analytics-questions">
            Вопросы
            {distributionBlockCount > 0 && (
              <span className="adm-analytics-toc-count">{distributionBlockCount}</span>
            )}
          </a>
        )}
      </nav>

      <section id="adm-analytics-overview" className="adm-analytics-block">
        <header className="adm-analytics-block-head">
          <h3 className="adm-analytics-block-title">Сводка</h3>
          <p className="adm-analytics-block-desc">
            Всего ответов и распределение по статусам в таблице заявок
          </p>
        </header>
        <motion.div
          className="adm-kpi-row"
          initial="hidden"
          animate="show"
          variants={kpiContainer}
        >
          <motion.div className="adm-kpi-cell adm-kpi-cell--total" variants={kpiChild}>
            <span className="adm-kpi-cell-value">{total}</span>
            <span className="adm-kpi-cell-label">Всего</span>
          </motion.div>
          {STATUS_ORDER.map(s => (
            <motion.div
              key={s}
              className={`adm-kpi-cell adm-kpi-cell--${s}`}
              variants={kpiChild}
            >
              <span className="adm-kpi-cell-value">{byStatus[s] ?? 0}</span>
              <span className="adm-kpi-cell-label">{STATUS_CONFIG[s].label}</span>
            </motion.div>
          ))}
        </motion.div>
      </section>

      <section id="adm-analytics-tokens" className="adm-analytics-block">
        <header className="adm-analytics-block-head">
          <h3 className="adm-analytics-block-title">Персональные ссылки</h3>
          <p className="adm-analytics-block-desc">
            Сколько уникальных ссылок отправлено, открыто и доведено до ответа
          </p>
        </header>
        <motion.div
          className="adm-card adm-analytics-section adm-analytics-section--tokens"
          variants={sectionAnim}
          initial="hidden"
          animate="show"
        >
          <div className="adm-funnel-strip">
            <FunnelStep label="Отправлено" value={tokensTotal} />
            <span className="adm-funnel-arrow" aria-hidden />
            <FunnelStep label="Открыто" value={tokensOpened} pct={tokensTotal > 0 ? openPct : undefined} />
            <span className="adm-funnel-arrow" aria-hidden />
            <FunnelStep label="Заполнено" value={tokensFilled} pct={tokensTotal > 0 ? convPct : undefined} />
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
                    className="adm-token-funnel-fill"
                    initial={{ width: 0 }}
                    animate={{ width: `${openPct}%` }}
                    transition={{ duration: 0.7, ease: easeOut }}
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
                    className="adm-token-funnel-fill adm-token-funnel-fill--strong"
                    initial={{ width: 0 }}
                    animate={{ width: `${convPct}%` }}
                    transition={{ duration: 0.7, ease: easeOut, delay: 0.08 }}
                  />
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </section>

      {hasDistributionCharts && (
        <section id="adm-analytics-questions" className="adm-analytics-block">
          <header className="adm-analytics-block-head adm-analytics-block-head--row">
            <div>
              <h3 className="adm-analytics-block-title">Ответы по вопросам</h3>
              <p className="adm-analytics-block-desc">
                Распределение ответов по полям анкеты и дополнительным блокам
              </p>
            </div>
            {distributionBlockCount > 0 && (
              <span className="adm-analytics-block-meta">
                {distributionBlockCount}{' '}
                {distributionBlockCount === 1 ? 'блок' : distributionBlockCount < 5 ? 'блока' : 'блоков'}
              </span>
            )}
          </header>
          <motion.div
            className="adm-analytics-charts"
            initial="hidden"
            animate="show"
            variants={{ hidden: {}, show: { transition: { staggerChildren: 0.08, delayChildren: 0.1 } } }}
          >
            {questionSections.map((sec, idx) => {
              const max = sec.items[0]?.[1] ?? 1
              const ord = idx + 1
              return (
                <motion.div
                  key={sec.questionId}
                  className="adm-card adm-analytics-section adm-analytics-chart-card"
                  variants={sectionAnim}
                >
                  <h3 className="adm-analytics-title adm-analytics-title--numbered">
                    <span className="adm-analytics-q-num">{ord}.</span>
                    <span className="adm-analytics-q-text">{sec.title}</span>
                  </h3>
                  <BarList items={sec.items} max={max} rowKeyPrefix={sec.questionId} />
                </motion.div>
              )
            })}

            {hasLegacyPurpose && (
              <motion.div className="adm-card adm-analytics-section adm-analytics-chart-card" variants={sectionAnim}>
                <h3 className="adm-analytics-title adm-analytics-title--numbered">
                  <span className="adm-analytics-q-num">{ordLegacyPurpose}.</span>
                  <span className="adm-analytics-q-text">{legacyTitles.purpose}</span>
                </h3>
                <BarList items={legacyPurpose} max={maxPurpose} rowKeyPrefix="legacy-purpose" />
              </motion.div>
            )}

            {hasLegacyUsed && (
              <motion.div className="adm-card adm-analytics-section adm-analytics-chart-card" variants={sectionAnim}>
                <h3 className="adm-analytics-title adm-analytics-title--numbered">
                  <span className="adm-analytics-q-num">{ordLegacyUsed}.</span>
                  <span className="adm-analytics-q-text">{legacyTitles.usedBefore}</span>
                </h3>
                <BarList items={legacyUsedBefore} max={maxUsed} rowKeyPrefix="legacy-used" />
              </motion.div>
            )}

            {hasLegacyCurrent && (
              <motion.div className="adm-card adm-analytics-section adm-analytics-chart-card" variants={sectionAnim}>
                <h3 className="adm-analytics-title adm-analytics-title--numbered">
                  <span className="adm-analytics-q-num">{ordLegacyCurrent}.</span>
                  <span className="adm-analytics-q-text">{legacyTitles.current}</span>
                </h3>
                <BarList items={legacyCurrent} max={maxCurrent} rowKeyPrefix="legacy-current" />
              </motion.div>
            )}
          </motion.div>
        </section>
      )}

      {total === 0 && (
        <motion.div
          className="adm-empty adm-analytics-empty"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: easeOut }}
        >
          <div className="adm-analytics-empty-icon" aria-hidden />
          <p>Данных для анализа пока нет</p>
          <span>Аналитика появится после первых ответов на опрос</span>
        </motion.div>
      )}
    </div>
  )
}

function FunnelStep({ label, value, pct }: { label: string; value: number; pct?: number }) {
  return (
    <div className="adm-funnel-step">
      <span className="adm-funnel-step-value">{value}</span>
      <span className="adm-funnel-step-label">{label}</span>
      {pct !== undefined && <span className="adm-funnel-step-pct">{pct}%</span>}
    </div>
  )
}

function BarList({
  items,
  max,
  rowKeyPrefix,
}: {
  items: [string, number][]
  max: number
  rowKeyPrefix: string
}) {
  return (
    <div className="adm-bar-list">
      {items.map(([label, count], i) => (
        <motion.div
          key={`${rowKeyPrefix}-${i}-${label.slice(0, 40)}`}
          className="adm-bar-row"
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3, ease: easeOut, delay: i * 0.04 }}
        >
          <div className="adm-bar-head">
            <span className="adm-bar-label" title={label}>{label}</span>
            <span className="adm-bar-count">{count}</span>
          </div>
          <div className="adm-bar-track">
            <motion.div
              className="adm-bar-fill"
              initial={{ width: 0 }}
              animate={{ width: `${(count / max) * 100}%` }}
              transition={{ duration: 0.55, ease: easeOut, delay: i * 0.04 }}
            />
          </div>
        </motion.div>
      ))}
    </div>
  )
}
