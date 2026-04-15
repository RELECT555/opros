import type { ReactNode } from 'react'
import { useState } from 'react'
import {
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { motion, AnimatePresence, easeOut } from 'framer-motion'
import type { SurveyQuestion, SurveyCanvasPage, SurveyCanvasBlock, SurveyConfigData } from '../../lib/supabase'
import { LiveQuestionEditorModal } from './LiveQuestionEditorModal'
import { ContactsCard } from './dynamic-form/ContactsCard'
import { QuestionCard } from './dynamic-form/QuestionCard'
import type { DynamicFormData, DynamicFormStatus } from './dynamic-form/types'
import { emptyDynamicFormData } from './dynamic-form/types'
import { isContactsDone } from './dynamic-form/utils'
import { CanvasBlockView } from './canvas/CanvasBlockView'
import { CanvasLiveStepEditorShell } from './canvas/CanvasLiveStepEditorShell'
import { SortableCanvasItem } from './canvas/SortableCanvasItem'
import {
  appendBlockToPage,
  appendHeroQuestionPair,
  appendQuestionBlockOnPage,
  canvasBlockDivider,
  canvasBlockSpacer,
  canvasBlockText,
  createEmptyScaleQuestion,
  createEmptySurveyQuestion,
  pageStepWrapClass,
  patchBlockOnPage,
  removeBlockFromPage,
  reorderBlocksInPage,
} from '../../lib/surveyCanvas'

export type { DynamicFormData }

// eslint-disable-next-line react-refresh/only-export-components
export function emptyFormData(questions: SurveyQuestion[]): DynamicFormData {
  return emptyDynamicFormData(questions)
}

interface Props {
  questions: SurveyQuestion[]
  form: DynamicFormData
  setForm: (f: DynamicFormData) => void
  status: DynamicFormStatus
  canSubmit: boolean
  consent: boolean
  setConsent: (v: boolean) => void
  handleSubmit: () => void
  errorMsg: string
  token?: string
  liveEdit?: boolean
  onLiveQuestionSave?: (q: SurveyQuestion, index: number) => Promise<void>
  questionWrapClass?: (q: SurveyQuestion) => string
  /** Контент-страницы конструктора: один экран = все блоки страницы. */
  canvasContentPages?: SurveyCanvasPage[]
  liveCanvasEdit?: boolean
  onCanvasPatch?: (fn: (c: SurveyConfigData) => SurveyConfigData) => Promise<void>
}

export function DynamicSurveyForm({
  questions,
  form,
  setForm,
  status,
  canSubmit,
  consent,
  setConsent,
  handleSubmit,
  errorMsg,
  token,
  liveEdit,
  onLiveQuestionSave,
  questionWrapClass,
  canvasContentPages,
  liveCanvasEdit,
  onCanvasPatch,
}: Props) {
  function wrapClassFor(q: SurveyQuestion): string {
    return questionWrapClass ? questionWrapClass(q) : 'sf-card-inner sf-card-inner--md'
  }

  const canvasMode = Array.isArray(canvasContentPages) && canvasContentPages.length > 0
  const contentPageCount = canvasMode ? canvasContentPages!.length : questions.length
  const totalSteps = contentPageCount + 1

  const [step, setStep] = useState(0)
  const [dir, setDir] = useState(1)
  const [viewMode, setViewMode] = useState<'stepped' | 'all'>('stepped')
  const [liveModal, setLiveModal] = useState<{ q: SurveyQuestion; idx: number } | null>(null)

  const canvasDndSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  function goNext() {
    if (step < totalSteps - 1) {
      setDir(1)
      setStep(s => s + 1)
    }
  }

  function goPrev() {
    if (step > 0) {
      setDir(-1)
      setStep(s => s - 1)
    }
  }

  function isAnswered(q: SurveyQuestion): boolean {
    if (q.type === 'checkbox') return (form.answers[q.id] as string[]).length > 0
    return !!form.answers[q.id]
  }

  function questionsOnCanvasPage(page: SurveyCanvasPage): SurveyQuestion[] {
    const out: SurveyQuestion[] = []
    for (const b of page.blocks) {
      if (b.type !== 'question') continue
      const q = questions.find(x => x.id === b.questionId)
      if (q) out.push(q)
    }
    return out
  }

  function canvasPageDone(page: SurveyCanvasPage): boolean {
    return questionsOnCanvasPage(page).every(isAnswered)
  }

  function globalQuestionIndex(q: SurveyQuestion): number {
    return questions.findIndex(x => x.id === q.id)
  }

  const contactsDone = isContactsDone(form)
  const isLastStep = step === totalSteps - 1

  const canGoNext = canvasMode
    ? (step < contentPageCount ? canvasPageDone(canvasContentPages![step]!) : contactsDone)
    : (step < questions.length ? isAnswered(questions[step]!) : contactsDone)

  const steps = canvasMode
    ? [...canvasContentPages!.map(p => ({ done: canvasPageDone(p) })), { done: contactsDone }]
    : [...questions.map(q => ({ done: isAnswered(q) })), { done: contactsDone }]

  const consentCard = (
    <motion.label className={`consent-card consent-card--inline ${consent ? 'consent-card--on' : ''}`} whileTap={{ scale: 0.99 }}>
      <input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} className="consent-checkbox-hidden" />
      <span className="consent-box">
        <AnimatePresence>
          {consent && (
            <motion.svg key="check" width="12" height="12" viewBox="0 0 12 12" fill="none" initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.5 }} transition={{ duration: 0.18 }}>
              <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </motion.svg>
          )}
        </AnimatePresence>
      </span>
      <span className="consent-body">
        <span className="consent-title">Согласие на обработку данных</span>
        <span className="consent-sub">Нажимая «Отправить», вы соглашаетесь с политикой конфиденциальности</span>
      </span>
    </motion.label>
  )

  const submitButtonEl = (
    <motion.button
      type="button"
      className={`btn-submit ${canSubmit ? 'btn-submit--on' : ''}`}
      disabled={!canSubmit || status === 'loading'}
      onClick={handleSubmit}
      whileHover={canSubmit ? { scale: 1.01 } : {}}
      whileTap={canSubmit ? { scale: 0.99 } : {}}
    >
      {status === 'loading' ? <span className="spinner" /> : canSubmit ? (
        <>Отправить заявку
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </>
      ) : !consent ? 'Подтвердите согласие' : 'Заполните контакты'}
    </motion.button>
  )

  function renderCanvasStep(page: SurveyCanvasPage, contentStepIndex: number) {
    const pageId = page.id
    const pageWrap = pageStepWrapClass(page)

    function renderReadonlyBlock(block: SurveyCanvasBlock, bi: number) {
      if (block.type === 'question') {
        const q = questions.find(x => x.id === block.questionId)
        if (!q) return null
        const gIdx = globalQuestionIndex(q)
        return (
          <div key={block.id} className="canvas-live-block-wrap canvas-live-block-wrap--question">
            <div className={wrapClassFor(q)}>
              <QuestionCard
                q={q}
                idx={gIdx >= 0 ? gIdx : bi}
                form={form}
                setForm={setForm}
                dir={dir}
                liveEdit={!!liveEdit && !!onLiveQuestionSave}
                onLiveEditClick={() => setLiveModal({ q, idx: gIdx >= 0 ? gIdx : bi })}
              />
            </div>
          </div>
        )
      }
      return (
        <div key={block.id}>
          <CanvasBlockView block={block} index={bi} />
        </div>
      )
    }

    function renderLiveBlock(block: SurveyCanvasBlock, bi: number, dragHandle: ReactNode) {
      if (!onCanvasPatch) return null
      if (block.type === 'question') {
        const q = questions.find(x => x.id === block.questionId)
        if (!q) return null
        const gIdx = globalQuestionIndex(q)
        return (
          <div className="canvas-live-block-wrap canvas-live-block-wrap--question">
            <div className="canvas-live-floatbar" aria-label="Блок вопроса">
              <span className="canvas-live-floatbar-start">
                {dragHandle}
                <span className="canvas-live-floatbar-tag">Вопрос</span>
              </span>
              <button
                type="button"
                className="canvas-live-floatbar-btn canvas-live-floatbar-btn--danger"
                title="Удалить блок"
                onClick={() => void onCanvasPatch(c => removeBlockFromPage(c, pageId, block))}
              >
                ×
              </button>
            </div>
            <div className={wrapClassFor(q)}>
              <QuestionCard
                q={q}
                idx={gIdx >= 0 ? gIdx : bi}
                form={form}
                setForm={setForm}
                dir={dir}
                liveEdit={!!liveEdit && !!onLiveQuestionSave}
                onLiveEditClick={() => setLiveModal({ q, idx: gIdx >= 0 ? gIdx : bi })}
              />
            </div>
          </div>
        )
      }
      if (block.type === 'text') {
        const align = block.align ?? 'left'
        const isLead = bi === 0
        const minH = block.minHeightPx
        return (
          <div className="canvas-live-block-wrap canvas-live-block-wrap--text">
            <div className="canvas-live-floatbar" aria-label="Текстовый блок">
              <span className="canvas-live-floatbar-start">
                {dragHandle}
                <span className="canvas-live-floatbar-tag">Текст</span>
              </span>
              <select
                className="canvas-live-floatbar-select-compact"
                value={block.align ?? 'left'}
                onChange={e =>
                  void onCanvasPatch(c =>
                    patchBlockOnPage(c, pageId, block.id, {
                      ...block,
                      align: e.target.value as 'left' | 'center' | 'right',
                    }),
                  )
                }
              >
                <option value="left">Слева</option>
                <option value="center">Центр</option>
                <option value="right">Справа</option>
              </select>
              <label className="canvas-live-floatbar-inline-h">
                <span className="canvas-live-floatbar-inline-h-lbl">Мин. выс. px</span>
                <input
                  type="number"
                  className="canvas-live-floatbar-num"
                  min={0}
                  max={480}
                  placeholder="авто"
                  title="Минимальная высота на экране"
                  value={block.minHeightPx ?? ''}
                  onChange={e => {
                    const raw = e.target.value
                    const v = raw === '' ? undefined : Math.min(480, Math.max(0, Number(raw) || 0))
                    void onCanvasPatch(c =>
                      patchBlockOnPage(c, pageId, block.id, {
                        ...block,
                        minHeightPx: v && v > 0 ? v : undefined,
                      }),
                    )
                  }}
                />
              </label>
              <button
                type="button"
                className="canvas-live-floatbar-btn canvas-live-floatbar-btn--danger"
                title="Удалить"
                onClick={() => void onCanvasPatch(c => removeBlockFromPage(c, pageId, block))}
              >
                ×
              </button>
            </div>
            <textarea
              className={`welcome-canvas-text survey-canvas-block-text canvas-live-inline-textarea${
                isLead ? ' welcome-canvas-text--lead' : ''
              }`}
              style={{
                textAlign: align,
                minHeight: minH != null && minH > 0 ? `${minH}px` : undefined,
              }}
              value={block.body}
              rows={Math.min(16, Math.max(3, block.body.split('\n').length + 1))}
              onChange={e =>
                void onCanvasPatch(c =>
                  patchBlockOnPage(c, pageId, block.id, { ...block, body: e.target.value }),
                )
              }
            />
          </div>
        )
      }
      if (block.type === 'spacer') {
        return (
          <div className="canvas-live-block-wrap canvas-live-block-wrap--spacer">
            <div className="canvas-live-floatbar" aria-label="Отступ">
              <span className="canvas-live-floatbar-start">
                {dragHandle}
                <span className="canvas-live-floatbar-tag">Отступ</span>
              </span>
              <input
                type="number"
                className="canvas-live-floatbar-num"
                min={4}
                max={120}
                value={block.height}
                title="Высота, px"
                onChange={e =>
                  void onCanvasPatch(c =>
                    patchBlockOnPage(c, pageId, block.id, {
                      ...block,
                      height: Number(e.target.value) || 8,
                    }),
                  )
                }
              />
              <span className="canvas-live-floatbar-dim">px</span>
              <button
                type="button"
                className="canvas-live-floatbar-btn canvas-live-floatbar-btn--danger"
                title="Удалить"
                onClick={() => void onCanvasPatch(c => removeBlockFromPage(c, pageId, block))}
              >
                ×
              </button>
            </div>
            <CanvasBlockView block={block} index={bi} />
          </div>
        )
      }
      return (
        <div className="canvas-live-block-wrap canvas-live-block-wrap--divider">
          <div className="canvas-live-floatbar" aria-label="Разделитель">
            <span className="canvas-live-floatbar-start">
              {dragHandle}
              <span className="canvas-live-floatbar-tag">Линия</span>
            </span>
            <button
              type="button"
              className="canvas-live-floatbar-btn canvas-live-floatbar-btn--danger"
              title="Удалить"
              onClick={() => void onCanvasPatch(c => removeBlockFromPage(c, pageId, block))}
            >
              ×
            </button>
          </div>
          <CanvasBlockView block={block} index={bi} />
        </div>
      )
    }

    function handleLiveDragEnd(e: DragEndEvent) {
      if (!onCanvasPatch) return
      const { active, over } = e
      if (!over || active.id === over.id) return
      void onCanvasPatch(c =>
        reorderBlocksInPage(c, pageId, String(active.id), String(over.id)),
      )
    }

    const blockNodes =
      liveCanvasEdit && onCanvasPatch ? (
        <DndContext
          sensors={canvasDndSensors}
          collisionDetection={closestCenter}
          onDragEnd={handleLiveDragEnd}
        >
          <SortableContext items={page.blocks.map(b => b.id)} strategy={verticalListSortingStrategy}>
            {page.blocks.map((block, bi) => (
              <SortableCanvasItem key={block.id} id={block.id}>
                {({ dragHandle }) => renderLiveBlock(block, bi, dragHandle)}
              </SortableCanvasItem>
            ))}
          </SortableContext>
        </DndContext>
      ) : (
        <>{page.blocks.map((block, bi) => renderReadonlyBlock(block, bi))}</>
      )

    const addBarFooter =
      liveCanvasEdit && onCanvasPatch ? (
        <div className="canvas-live-add-bar">
          <span className="canvas-live-add-label">Добавить</span>
          <button
            type="button"
            className="canvas-live-add-btn canvas-live-add-btn--template"
            onClick={() => void onCanvasPatch(c => appendHeroQuestionPair(c, pageId))}
          >
            Шаблон: заголовок + вопрос
          </button>
          <button
            type="button"
            className="canvas-live-add-btn"
            onClick={() => void onCanvasPatch(c => appendBlockToPage(c, pageId, canvasBlockText()))}
          >
            Текст
          </button>
          <button
            type="button"
            className="canvas-live-add-btn"
            onClick={() => void onCanvasPatch(c => appendBlockToPage(c, pageId, canvasBlockSpacer()))}
          >
            Отступ
          </button>
          <button
            type="button"
            className="canvas-live-add-btn"
            onClick={() => void onCanvasPatch(c => appendBlockToPage(c, pageId, canvasBlockDivider()))}
          >
            Линия
          </button>
          <button
            type="button"
            className="canvas-live-add-btn canvas-live-add-btn--primary"
            onClick={() =>
              void onCanvasPatch(c =>
                appendQuestionBlockOnPage(c, pageId, createEmptySurveyQuestion()),
              )
            }
          >
            Вопрос
          </button>
          <button
            type="button"
            className="canvas-live-add-btn"
            onClick={() =>
              void onCanvasPatch(c =>
                appendQuestionBlockOnPage(c, pageId, createEmptyScaleQuestion()),
              )
            }
          >
            Шкала
          </button>
        </div>
      ) : null

    const stepInner =
      liveCanvasEdit && onCanvasPatch && addBarFooter ? (
        <CanvasLiveStepEditorShell
          page={page}
          pageId={pageId}
          contentStepIndex={contentStepIndex}
          onCanvasPatch={onCanvasPatch}
          hasBlocks={page.blocks.length > 0}
          footer={addBarFooter}
        >
          {blockNodes}
        </CanvasLiveStepEditorShell>
      ) : (
        <>{blockNodes}</>
      )

    return (
      <motion.div
        key={page.id}
        custom={dir}
        initial={{ opacity: 0, x: dir >= 0 ? 16 : -16 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: dir >= 0 ? -12 : 12 }}
        transition={{ duration: 0.28, ease: easeOut }}
        className={`${pageWrap} sf-canvas-step survey-canvas-step`}
      >
        <div className={`survey-canvas-step-inner${liveCanvasEdit && onCanvasPatch ? ' survey-canvas-step-inner--live-framed' : ''}`}>
          {stepInner}
        </div>
      </motion.div>
    )
  }


  return (
    <div className={`survey survey--stepped${viewMode === 'all' && !canvasMode ? ' survey--all' : ''}`}>
      <motion.div className="sf-topbar" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, ease: easeOut }}>
        {viewMode === 'stepped' && (
          <div className="sf-steps">
            {steps.map((s, i) => (
              <div key={i} className="sf-step">
                <button
                  type="button"
                  className={`sf-step-dot ${s.done ? 'sf-step-dot--done' : i === step ? 'sf-step-dot--active' : ''}`}
                  onClick={() => { setDir(i > step ? 1 : -1); setStep(i) }}
                  title={
                    canvasMode
                      ? (i < contentPageCount
                          ? (canvasContentPages![i]!.title || `Страница ${i + 1}`)
                          : 'Контакты')
                      : (i < questions.length ? `Вопрос ${i + 1}` : 'Контакты')
                  }
                >
                  <AnimatePresence mode="wait">
                    {s.done ? (
                      <motion.svg key="check" width="9" height="9" viewBox="0 0 9 9" fill="none" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} transition={{ type: 'spring', stiffness: 400, damping: 20 }}>
                        <path d="M1.5 4.5l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </motion.svg>
                    ) : (
                      <motion.span key="num" className="sf-step-num" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                        {i + 1}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </button>
                {i < steps.length - 1 && (
                  <div className="sf-step-line">
                    <motion.div className="sf-step-line-fill" animate={{ width: s.done ? '100%' : '0%' }} transition={{ duration: 0.4, ease: easeOut }} />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {viewMode === 'all' && !canvasMode && (
          <div className="sf-all-counter">{steps.filter(s => s.done).length}/{totalSteps} заполнено</div>
        )}

        {!canvasMode && (
          <div className="sf-view-toggle">
            <button type="button" className={`sf-view-btn ${viewMode === 'stepped' ? 'sf-view-btn--on' : ''}`} onClick={() => setViewMode('stepped')} title="По одному">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <rect x="1" y="3" width="12" height="8" rx="2" stroke="currentColor" strokeWidth="1.3" />
              </svg>
              По одному
            </button>
            <button type="button" className={`sf-view-btn ${viewMode === 'all' ? 'sf-view-btn--on' : ''}`} onClick={() => setViewMode('all')} title="Все сразу">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <rect x="1" y="1" width="12" height="4" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
                <rect x="1" y="6.5" width="12" height="4" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
                <rect x="1" y="12" width="12" height="1" rx="0.5" fill="currentColor" opacity="0.3" />
              </svg>
              Все сразу
            </button>
          </div>
        )}
      </motion.div>

      {viewMode === 'stepped' && (
        <>
          <div className="sf-card-wrap">
            <AnimatePresence mode="wait" custom={dir}>
              {step < contentPageCount ? (
                canvasMode ? (
                  renderCanvasStep(canvasContentPages![step]!, step)
                ) : (
                  <div key={questions[step]!.id} className={wrapClassFor(questions[step]!)}>
                    <QuestionCard
                      q={questions[step]!}
                      idx={step}
                      form={form}
                      setForm={setForm}
                      dir={dir}
                      liveEdit={!!liveEdit && !!onLiveQuestionSave}
                      onLiveEditClick={() => setLiveModal({ q: questions[step]!, idx: step })}
                    />
                  </div>
                )
              ) : (
                <ContactsCard key="contacts" form={form} setForm={setForm} questionsCount={questions.length} token={token} dir={dir} />
              )}
            </AnimatePresence>
          </div>

          <motion.div className={`sf-nav${isLastStep ? ' sf-nav--final' : ''}`} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.15, ease: easeOut }}>
            {isLastStep ? (
              <>
                <div className="sf-nav-final-consent">
                  {consentCard}
                  {status === 'error' && <p className="err-msg">{errorMsg}</p>}
                </div>
                {submitButtonEl}
                <button type="button" className="sf-nav-btn sf-nav-btn--back" onClick={goPrev} disabled={step === 0}>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  Назад
                </button>
              </>
            ) : (
              <>
                <button type="button" className="sf-nav-btn sf-nav-btn--back" onClick={goPrev} disabled={step === 0}>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  Назад
                </button>
                <button type="button" className={`sf-nav-btn sf-nav-btn--next ${canGoNext ? 'sf-nav-btn--active' : ''}`} onClick={goNext} disabled={!canGoNext}>
                  Далее
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              </>
            )}
          </motion.div>
        </>
      )}

      {viewMode === 'all' && !canvasMode && (
        <motion.div className="sf-all-list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3, ease: easeOut }}>
          {questions.map((q, idx) => (
            <div key={q.id} className={wrapClassFor(q)}>
              <QuestionCard
                q={q}
                idx={idx}
                form={form}
                setForm={setForm}
                dir={0}
                liveEdit={!!liveEdit && !!onLiveQuestionSave}
                onLiveEditClick={() => setLiveModal({ q, idx })}
              />
            </div>
          ))}
          <ContactsCard form={form} setForm={setForm} questionsCount={questions.length} token={token} dir={0} />
          <div className="sf-nav-submit-wrap">
            {consentCard}
            {status === 'error' && <p className="err-msg">{errorMsg}</p>}
            {submitButtonEl}
          </div>
        </motion.div>
      )}

      {liveModal && onLiveQuestionSave && (
        <LiveQuestionEditorModal
          open
          question={liveModal.q}
          questionIndex={liveModal.idx}
          onClose={() => setLiveModal(null)}
          onSave={nq => onLiveQuestionSave(nq, liveModal.idx)}
        />
      )}
    </div>
  )
}
