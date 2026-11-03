import type { SurveyCanvasBlock, SurveyConfigData } from '../../lib/supabase'
import { blockDefaults, clamp } from '../../lib/welcomeCanvasLayout'
import { patchWelcomeBlock, removeWelcomeBlock } from '../../lib/surveyCanvas'

type WelcomePatch = (fn: (c: SurveyConfigData) => SurveyConfigData) => Promise<void>
export function WelcomeCanvasBlockEditor({ block, i, onWelcomePatch, onDragPointerDown, onResizePointerDown, displayBtn }: {
  block: SurveyCanvasBlock
  i: number
  onWelcomePatch?: WelcomePatch
  onDragPointerDown: (e: React.PointerEvent, block: SurveyCanvasBlock, index: number) => void
  onResizePointerDown: (e: React.PointerEvent, block: SurveyCanvasBlock, index: number) => void
  displayBtn: string
}) {
    if (!onWelcomePatch) return null
    if (block.type === 'question') return null
    const d = blockDefaults(block, i)
    const fontSizePx = block.type === 'text' && typeof block.fontSizePx === 'number' ? block.fontSizePx : undefined
    const badge = block.type === 'text' ? 'Текст' : block.type === 'cta' ? 'Кнопка' : 'Линия'

    return (
      <div
        key={block.id}
        className="wc-block wc-block--edit"
        style={{ left: `${d.xPct}%`, top: `${d.yPx}px`, width: `${d.widthPct}%` }}
      >
        <div className="wc-block-chrome">
          <button
            type="button"
            className="wc-block-drag"
            onPointerDown={e => onDragPointerDown(e, block, i)}
            title="Перетаскивайте блок"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <circle cx="9" cy="7" r="1.6" /><circle cx="15" cy="7" r="1.6" />
              <circle cx="9" cy="12" r="1.6" /><circle cx="15" cy="12" r="1.6" />
              <circle cx="9" cy="17" r="1.6" /><circle cx="15" cy="17" r="1.6" />
            </svg>
          </button>
          <span className="wc-block-badge">{badge}</span>

          {block.type === 'text' && (
            <>
              <select
                className="wc-compact-select"
                value={block.align ?? 'center'}
                onChange={e =>
                  void onWelcomePatch(c =>
                    patchWelcomeBlock(c, block.id, { ...block, align: e.target.value as 'left' | 'center' | 'right' }),
                  )
                }
              >
                <option value="left">Слева</option>
                <option value="center">Центр</option>
                <option value="right">Справа</option>
              </select>
              <label className="wc-font-size">
                <input
                  type="number"
                  min={12}
                  max={120}
                  value={fontSizePx ?? ''}
                  placeholder="авто"
                  onChange={e => {
                    const v = e.target.value === '' ? undefined : clamp(Number(e.target.value) || 16, 12, 120)
                    void onWelcomePatch(c =>
                      patchWelcomeBlock(c, block.id, { ...block, fontSizePx: v }),
                    )
                  }}
                />
                px
              </label>
            </>
          )}

          {block.type === 'cta' && (
            <input
              type="text"
              className="wc-cta-input"
              value={block.label ?? ''}
              placeholder="Текст кнопки"
              onChange={e =>
                void onWelcomePatch(c =>
                  patchWelcomeBlock(c, block.id, { ...block, label: e.target.value }),
                )
              }
            />
          )}

          <button
            type="button"
            className="wc-block-del"
            onClick={() => void onWelcomePatch(c => removeWelcomeBlock(c, block))}
          >
            ✕
          </button>
        </div>

        {block.type === 'text' && (
          <textarea
            className={`welcome-canvas-text survey-canvas-block-text wc-inline-text${i === 0 ? ' welcome-canvas-text--lead' : ''}`}
            style={{
              textAlign: block.align ?? 'center',
              fontSize: fontSizePx ? `${fontSizePx}px` : undefined,
            }}
            value={block.body}
            rows={Math.min(16, Math.max(2, block.body.split('\n').length + 1))}
            onChange={e =>
              void onWelcomePatch(c =>
                patchWelcomeBlock(c, block.id, { ...block, body: e.target.value }),
              )
            }
          />
        )}

        {block.type === 'cta' && (
          <button type="button" className="welcome-cta wc-cta-preview" onClick={() => undefined}>
            {block.label?.trim() || displayBtn}
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="welcome-cta__arrow">
              <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        )}

        {block.type === 'divider' && <hr className="welcome-canvas-divider survey-canvas-divider" />}

        <button
          type="button"
          className="wc-resize-handle"
          onPointerDown={e => onResizePointerDown(e, block, i)}
          aria-label="Изменить ширину"
        />
      </div>
    )
  }

