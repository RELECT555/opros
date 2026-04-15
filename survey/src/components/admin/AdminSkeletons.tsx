import type { CSSProperties } from 'react'

function _rowStyle(index: number, rowHeight?: number): CSSProperties {
  return {
    opacity: Math.max(0.35, 1 - index * 0.12),
    ...(rowHeight !== undefined ? { height: rowHeight } : {}),
  }
}

type AdminSkeletonRowsProps = {
  count?: number
  rowHeight?: number
  className?: string
}

export function AdminSkeletonRows({ count = 5, rowHeight, className }: AdminSkeletonRowsProps) {
  return (
    <div
      className={['adm-loading-rows', className].filter(Boolean).join(' ')}
      aria-busy="true"
      aria-label="Загрузка"
    >
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="adm-skeleton" style={_rowStyle(i, rowHeight)} />
      ))}
    </div>
  )
}

/** Плейсхолдер главной области при открытии /admin?survey=… до загрузки опросника */
export function AdminSurveyBootstrapSkeleton() {
  return (
    <div
      className="adm-tab-content adm-bootstrap-skel"
      aria-busy="true"
      aria-label="Загрузка опросника"
    >
      <div className="adm-skel-toolbar">
        <div className="adm-skeleton adm-skeleton--headline" />
        <div className="adm-skel-toolbar-actions">
          <div className="adm-skeleton adm-skeleton--pill-btn" />
          <div className="adm-skeleton adm-skeleton--pill-btn" />
        </div>
      </div>
      <AdminSkeletonRows count={5} rowHeight={68} />
    </div>
  )
}

export function SurveysListSkeleton() {
  return (
    <div
      className="adm-tab-content"
      aria-busy="true"
      aria-label="Загрузка списка опросников"
    >
      <div className="adm-skel-surveys-head">
        <div className="adm-skel-surveys-head-left">
          <div className="adm-skeleton adm-skeleton--icon-square" />
          <div className="adm-skel-text-stack">
            <div className="adm-skeleton adm-skeleton--line-title" />
            <div className="adm-skeleton adm-skeleton--line-sub" />
          </div>
        </div>
        <div className="adm-skeleton adm-skeleton--btn-wide" />
      </div>
      <div className="surveys-grid surveys-grid--skeleton">
        {[0, 1, 2, 3].map(i => (
          <div key={i} className="adm-skeleton adm-skeleton--survey-card" style={{ opacity: Math.max(0.4, 1 - i * 0.12) }} />
        ))}
      </div>
    </div>
  )
}

export function ResponsesTabSkeleton() {
  return (
    <div className="adm-responses-skel" aria-busy="true" aria-label="Загрузка заявок">
      <div className="adm-skel-tabs-shim">
        {[0, 1, 2, 3, 4].map(i => (
          <div key={i} className="adm-skeleton adm-skeleton--tab-pill" style={{ opacity: 0.5 + (4 - i) * 0.1 }} />
        ))}
      </div>
      <AdminSkeletonRows count={5} rowHeight={72} />
    </div>
  )
}

export function AnalyticsTabSkeleton() {
  return (
    <div
      className="adm-tab-content adm-analytics"
      aria-busy="true"
      aria-label="Загрузка аналитики"
    >
      <header className="adm-analytics-hero adm-analytics-header--skeleton">
        <div className="adm-skel-analytics-titles">
          <div className="adm-skeleton adm-skeleton--analytics-eyebrow" />
          <div className="adm-skeleton adm-skeleton--analytics-title" />
          <div className="adm-skeleton adm-skeleton--analytics-lead" />
        </div>
        <div className="adm-skeleton adm-skeleton--analytics-badge" />
      </header>
      <div className="adm-analytics-toc adm-analytics-toc--skeleton">
        {[0, 1, 2].map(i => (
          <div key={i} className="adm-skeleton adm-skeleton--toc-pill" style={{ opacity: Math.max(0.5, 1 - i * 0.12) }} />
        ))}
      </div>
      <div className="adm-analytics-block">
        <div className="adm-skeleton adm-skeleton--block-head" />
        <div className="adm-kpi-row adm-kpi-row--skeleton">
          {[0, 1, 2, 3, 4].map(i => (
            <div
              key={i}
              className="adm-skeleton adm-skeleton--kpi-cell"
              style={{ opacity: Math.max(0.45, 1 - i * 0.08) }}
            />
          ))}
        </div>
      </div>
      <div className="adm-skeleton adm-skeleton--analytics-section" />
    </div>
  )
}

export function QuestionsTabSkeleton() {
  return (
    <div
      className="adm-tab-content qed-root"
      aria-busy="true"
      aria-label="Загрузка вопросов"
    >
      <div className="qed-header">
        <div className="qed-header-row">
          <div className="qed-header-left">
            <div className="adm-skeleton adm-skeleton--icon-rounded" />
            <div className="adm-skel-text-stack">
              <div className="adm-skeleton adm-skeleton--line-title" />
              <div className="adm-skeleton adm-skeleton--line-sub" />
            </div>
          </div>
          <div className="adm-skeleton adm-skeleton--btn-wide" />
        </div>
      </div>
      <AdminSkeletonRows count={4} rowHeight={88} />
    </div>
  )
}

export function CanvasBuilderTabSkeleton() {
  return (
    <div className="adm-tab-content canvas-builder canvas-builder--skeleton" aria-busy="true" aria-label="Загрузка конструктора">
      <div className="qed-header">
        <div className="qed-header-row">
          <div className="qed-header-left">
            <div className="adm-skeleton adm-skeleton--icon-rounded" />
            <div className="adm-skel-text-stack">
              <div className="adm-skeleton adm-skeleton--line-title" />
              <div className="adm-skeleton adm-skeleton--line-sub" />
            </div>
          </div>
          <div className="adm-skeleton adm-skeleton--btn-wide" />
        </div>
      </div>
      <div className="canvas-builder-layout">
        <div className="adm-skeleton" style={{ width: 200, minHeight: 280, borderRadius: 12 }} />
        <div className="adm-skeleton" style={{ flex: 1, minHeight: 320, borderRadius: 12 }} />
        <div className="adm-skeleton" style={{ width: 180, minHeight: 200, borderRadius: 12 }} />
      </div>
    </div>
  )
}

export function DesignTabSkeleton() {
  return (
    <div className="dsg-root" aria-busy="true" aria-label="Загрузка настроек дизайна">
      <div className="dsg-header dsg-header--skeleton">
        <div className="adm-skeleton adm-skeleton--dsg-icon" />
        <div className="adm-skel-text-stack adm-skel-text-stack--grow">
          <div className="adm-skeleton adm-skeleton--dsg-title" />
          <div className="adm-skeleton adm-skeleton--dsg-sub" />
        </div>
        <div className="adm-skeleton adm-skeleton--dsg-save" />
      </div>
      <div className="dsg-layout dsg-layout--skeleton">
        <div className="dsg-controls dsg-controls--skeleton">
          <div className="adm-skeleton adm-skeleton--dsg-panel-tall" />
          <div className="adm-skeleton adm-skeleton--dsg-panel-short" />
        </div>
        <div className="dsg-preview-wrap dsg-preview-wrap--skeleton">
          <div className="adm-skeleton adm-skeleton--dsg-preview" />
        </div>
      </div>
    </div>
  )
}
