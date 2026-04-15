import type { ReactNode } from 'react'
import type { SurveyCanvasPage, SurveyConfigData } from '../../../lib/supabase'
import { patchCanvasPageTitle } from '../../../lib/surveyCanvas'
import { CanvasLiveEmptyGhost } from './CanvasLiveEmptyGhost'

type Props = {
  page: SurveyCanvasPage
  pageId: string
  contentStepIndex: number
  onCanvasPatch: (fn: (c: SurveyConfigData) => SurveyConfigData) => Promise<void>
  hasBlocks: boolean
  children: ReactNode
  footer: ReactNode
}

/**
 * Компактная панель настроек шага + поток блоков без лишней «карточки вокруг всего».
 */
export function CanvasLiveStepEditorShell({
  page,
  pageId,
  contentStepIndex,
  onCanvasPatch,
  hasBlocks,
  children,
  footer,
}: Props) {
  return (
    <div className="canvas-live-step-wrap">
      <div className="canvas-live-toolbar" role="region" aria-label="Настройки шага">
        <span className="canvas-live-toolbar-badge">Шаг {contentStepIndex + 1}</span>
        <input
          type="text"
          className="canvas-live-toolbar-title"
          value={page.title}
          onChange={e => void onCanvasPatch(c => patchCanvasPageTitle(c, pageId, e.target.value))}
          placeholder="Название страницы в конструкторе"
          autoComplete="off"
          aria-label="Название страницы в конструкторе"
        />
        <label className="canvas-live-toolbar-width">
          <span className="canvas-live-toolbar-width-label">Ширина карточек</span>
          <select
            className="canvas-live-toolbar-select"
            value={page.layout?.maxWidth ?? 'md'}
            onChange={e =>
              void onCanvasPatch(c => {
                if (!c.canvas) return c
                const v = e.target.value as 'sm' | 'md' | 'lg' | 'full'
                return {
                  ...c,
                  canvas: {
                    pages: c.canvas.pages.map(p =>
                      p.id === pageId ? { ...p, layout: { ...p.layout, maxWidth: v } } : p,
                    ),
                  },
                }
              })
            }
          >
            <option value="sm">Узкая</option>
            <option value="md">Средняя</option>
            <option value="lg">Широкая</option>
            <option value="full">На всю ширину</option>
          </select>
        </label>
      </div>

      <div className="canvas-live-step-stream">{hasBlocks ? children : <CanvasLiveEmptyGhost />}</div>

      <div className="canvas-live-step-footer">{footer}</div>
    </div>
  )
}
