import { useState, useEffect, useCallback, useRef, useLayoutEffect } from 'react'
import { motion, AnimatePresence, easeOut } from 'framer-motion'
import { getSurveyById, updateSurveyConfig } from '../../lib/api-client'
import type {
  Survey,
  SurveyConfigData,
  SurveyCanvasBlock,
  SurveyCanvasPage,
  SurveyQuestion,
} from '../../lib/supabase'
import {
  countQuestionRefsInCanvas,
  isCanvasSurvey,
  orderedQuestionsFromCanvas,
} from '../../lib/surveyCanvas'
import { CanvasBuilderTabSkeleton } from './AdminSkeletons'
import { SavedIcon } from './AdminFormParts'
import { DesignTab } from './DesignTab'
import { prepareConstructorLiveEditUrl } from '../../lib/liveEditLinks'

type BuilderPanel = 'pages' | 'design'

interface Props {
  surveyId: number
  onSurveyUpdate: (s: Survey) => void
  /** Открыть вкладку «Тема» при монтировании (редирект с бывшей вкладки «Дизайн»). */
  openDesignPanelOnMount?: boolean
  onConsumedDesignPanelMount?: () => void
}

function newQuestion(): SurveyQuestion {
  return {
    id: `q_${Date.now()}`,
    type: 'checkbox',
    title: '',
    subtitle: '',
    options: [''],
  }
}

function cloneConfig(c: SurveyConfigData): SurveyConfigData {
  return JSON.parse(JSON.stringify(c)) as SurveyConfigData
}

function newBlock(kind: SurveyCanvasBlock['type'], questionId?: string): SurveyCanvasBlock {
  const id = `b_${Date.now()}`
  if (kind === 'text') return { id, type: 'text', body: 'Текст', align: 'left' }
  if (kind === 'spacer') return { id, type: 'spacer', height: 24 }
  if (kind === 'divider') return { id, type: 'divider' }
  return { id, type: 'question', questionId: questionId ?? '' }
}

export function CanvasBuilderTab({
  surveyId,
  onSurveyUpdate,
  openDesignPanelOnMount,
  onConsumedDesignPanelMount,
}: Props) {
  const [survey, setSurvey] = useState<Survey | null>(null)
  const [config, setConfig] = useState<SurveyConfigData | null>(null)
  const [baseline, setBaseline] = useState<SurveyConfigData | null>(null)
  const [panel, setPanel] = useState<BuilderPanel>('pages')
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [err, setErr] = useState('')
  const selectedPageIdRef = useRef<string | null>(null)
  selectedPageIdRef.current = selectedPageId

  const dirty =
    config && baseline ? JSON.stringify(config) !== JSON.stringify(baseline) : false

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    getSurveyById(surveyId)
      .then(s => {
        if (cancelled || !s) return
        setSurvey(s)
        const cfg = s.config
        if (!isCanvasSurvey(cfg)) {
          setConfig(null)
          setBaseline(null)
          return
        }
        setConfig(cloneConfig(cfg))
        setBaseline(cloneConfig(cfg))
        const firstContent = cfg.canvas!.pages.find(p => p.role === 'content')
        setSelectedPageId(firstContent?.id ?? cfg.canvas!.pages[0]?.id ?? null)
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [surveyId])

  useLayoutEffect(() => {
    setPanel('pages')
  }, [surveyId])

  useLayoutEffect(() => {
    if (!openDesignPanelOnMount) return
    setPanel('design')
    onConsumedDesignPanelMount?.()
  }, [openDesignPanelOnMount, onConsumedDesignPanelMount])

  useEffect(() => {
    if (!config?.canvas?.pages.length) return
    const cur = selectedPageIdRef.current
    if (cur && config.canvas.pages.some(p => p.id === cur)) return
    const pick =
      config.canvas.pages.find(p => p.role === 'content') ?? config.canvas.pages[0] ?? null
    setSelectedPageId(pick?.id ?? null)
  }, [config])

  const update = useCallback((fn: (c: SurveyConfigData) => SurveyConfigData) => {
    setConfig(c => (c ? fn(c) : c))
    setSaved(false)
  }, [])

  async function save() {
    if (!survey || !config || !dirty) return
    setSaving(true)
    setErr('')
    try {
      await updateSurveyConfig(survey.id, config)
      setBaseline(cloneConfig(config))
      const next = { ...survey, config }
      setSurvey(next)
      onSurveyUpdate(next)
      setSaved(true)
      setTimeout(() => setSaved(false), 1600)
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Ошибка сохранения')
    } finally {
      setSaving(false)
    }
  }

  function addContentPage() {
    update(c => {
      if (!c.canvas) return c
      const page: SurveyCanvasPage = {
        id: `page_${Date.now()}`,
        role: 'content',
        title: `Страница ${c.canvas.pages.filter(p => p.role === 'content').length + 1}`,
        layout: { maxWidth: 'md' },
        blocks: [],
      }
      return { ...c, canvas: { pages: [...c.canvas.pages, page] } }
    })
  }

  function removeContentPage(pageId: string) {
    update(c => {
      if (!c.canvas) return c
      const page = c.canvas.pages.find(p => p.id === pageId)
      if (!page || page.role !== 'content') return c
      return { ...c, canvas: { pages: c.canvas.pages.filter(p => p.id !== pageId) } }
    })
    if (selectedPageIdRef.current === pageId) setSelectedPageId(null)
  }

  function movePage(pageId: string, dir: -1 | 1) {
    update(c => {
      if (!c.canvas) return c
      const pages = [...c.canvas.pages]
      const contentIdxs = pages
        .map((p, i) => (p.role === 'content' ? i : -1))
        .filter((i): i is number => i >= 0)
      const cur = pages.findIndex(p => p.id === pageId)
      if (cur < 0 || pages[cur]!.role !== 'content') return c
      const posInContent = contentIdxs.indexOf(cur)
      const nextPos = posInContent + dir
      if (nextPos < 0 || nextPos >= contentIdxs.length) return c
      const i = contentIdxs[posInContent]!
      const j = contentIdxs[nextPos]!
      const t = pages[i]!
      pages[i] = pages[j]!
      pages[j] = t
      return { ...c, canvas: { pages } }
    })
  }

  function patchPage(pageId: string, fn: (p: SurveyCanvasPage) => SurveyCanvasPage) {
    update(c => {
      if (!c.canvas) return c
      return {
        ...c,
        canvas: {
          pages: c.canvas.pages.map(p => (p.id === pageId ? fn(p) : p)),
        },
      }
    })
  }

  function addBlock(pageId: string, kind: SurveyCanvasBlock['type']) {
    update(c => {
      if (!c.canvas) return c
      const page = c.canvas.pages.find(p => p.id === pageId)
      if (!page) return c
      if (page.role === 'welcome' && kind === 'question') return c

      let nextQuestions = c.questions
      let qid = ''
      if (kind === 'question') {
        const q = newQuestion()
        nextQuestions = [...c.questions, q]
        qid = q.id
      }

      const block = newBlock(kind, kind === 'question' ? qid : undefined)
      const pages = c.canvas.pages.map(p =>
        p.id === pageId ? { ...p, blocks: [...p.blocks, block] } : p,
      )
      return { ...c, questions: nextQuestions, canvas: { pages } }
    })
  }

  function patchBlock(pageId: string, blockId: string, next: SurveyCanvasBlock) {
    patchPage(pageId, p => ({
      ...p,
      blocks: p.blocks.map(b => (b.id === blockId ? next : b)),
    }))
  }

  function removeBlock(pageId: string, block: SurveyCanvasBlock) {
    update(c => {
      if (!c.canvas) return c
      let questions = c.questions
      if (block.type === 'question') {
        const refs = countQuestionRefsInCanvas(c.canvas, block.questionId) - 1
        if (refs <= 0) {
          questions = questions.filter(q => q.id !== block.questionId)
        }
      }
      const pages = c.canvas.pages.map(p =>
        p.id === pageId ? { ...p, blocks: p.blocks.filter(b => b.id !== block.id) } : p,
      )
      return { ...c, questions, canvas: { pages } }
    })
  }

  if (loading) return <CanvasBuilderTabSkeleton />

  if (!config || !isCanvasSurvey(config) || !config.canvas) {
    return (
      <div className="adm-tab-content">
        <p className="adm-err-banner">
          Конструктор доступен только для опросов, созданных в режиме «С нуля». Выберите другой опрос или создайте новый с этим режимом.
        </p>
      </div>
    )
  }

  const pages = config.canvas.pages
  const selected =
    pages.find(p => p.id === selectedPageId) ?? pages.find(p => p.role === 'content') ?? pages[0]

  const ordered = orderedQuestionsFromCanvas(config)

  return (
    <div className="adm-tab-content canvas-builder">
      <div className="qed-header">
        <div className="qed-header-row">
          <div className="qed-header-left">
            <div className="qed-header-icon canvas-builder-icon">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
                <rect x="2" y="2" width="12" height="5" rx="1.2" stroke="currentColor" strokeWidth="1.3" />
                <rect x="2" y="9" width="12" height="5" rx="1.2" stroke="currentColor" strokeWidth="1.3" />
              </svg>
            </div>
            <div>
              <h2 className="qed-header-title">Конструктор</h2>
              <p className="qed-header-sub">
                {panel === 'pages'
                  ? 'Страницы и блоки · порядок вопросов как на схеме · ширина шага задаётся для страницы'
                  : 'Цвета, типографика, логотип и элементы интерфейса опроса'}
              </p>
            </div>
          </div>
          {panel === 'pages' && (
            <div className="canvas-builder-save-row">
              {saved && (
                <motion.span
                  className="canvas-builder-saved"
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                >
                  <SavedIcon /> Сохранено
                </motion.span>
              )}
              <button
                type="button"
                className="qed-save-bar-btn"
                disabled={!dirty || saving}
                onClick={() => void save()}
              >
                {saving ? <span className="adm-spinner adm-spinner--sm" /> : 'Сохранить'}
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="canvas-builder-subtabs" role="tablist" aria-label="Раздел конструктора">
        <button
          type="button"
          role="tab"
          aria-selected={panel === 'pages'}
          className={`canvas-builder-subtab${panel === 'pages' ? ' canvas-builder-subtab--on' : ''}`}
          onClick={() => setPanel('pages')}
        >
          Страницы и блоки
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={panel === 'design'}
          className={`canvas-builder-subtab${panel === 'design' ? ' canvas-builder-subtab--on' : ''}`}
          onClick={() => setPanel('design')}
        >
          Тема и оформление
        </button>
      </div>

      {panel === 'pages' && survey && (
        <div className="qed-live-hint" role="note">
          <span className="qed-live-hint__badge">Живая страница</span>
          <p className="qed-live-hint__text">
            Расставляйте блоки и ширину прямо на опросе:{' '}
            <button
              type="button"
              className="qed-live-hint__strong canvas-builder-open-live"
              onClick={() => {
                window.open(prepareConstructorLiveEditUrl(survey.slug), '_blank', 'noopener,noreferrer')
              }}
            >
              открыть полную правку на сайте
            </button>
            <span className="qed-live-hint__muted">
              {' '}
              (нужна админ-сессия; ссылку не отправляйте респондентам). Здесь в админке — запасной чертёж и сохранение.
            </span>
          </p>
        </div>
      )}

      {err && panel === 'pages' && <p className="adm-err-banner">{err}</p>}

      {panel === 'design' ? (
        <DesignTab surveyId={surveyId} onSurveyUpdate={onSurveyUpdate} />
      ) : (
        <div className="canvas-builder-layout">
        <aside className="canvas-builder-sidebar">
          <p className="canvas-builder-sidebar-title">Страницы</p>
          <ul className="canvas-builder-pages">
            {pages.map(p => (
              <li key={p.id}>
                <button
                  type="button"
                  className={`canvas-builder-page-pick ${selected?.id === p.id ? 'canvas-builder-page-pick--on' : ''}`}
                  onClick={() => setSelectedPageId(p.id)}
                >
                  <span className="canvas-builder-page-role">
                    {p.role === 'welcome' ? 'Главная' : 'Контент'}
                  </span>
                  <span className="canvas-builder-page-title">{p.title}</span>
                </button>
                {p.role === 'content' && (
                  <div className="canvas-builder-page-actions">
                    <button
                      type="button"
                      className="canvas-builder-mini"
                      title="Выше"
                      onClick={() => movePage(p.id, -1)}
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      className="canvas-builder-mini"
                      title="Ниже"
                      onClick={() => movePage(p.id, 1)}
                    >
                      {'\u2193'}
                    </button>
                    <button
                      type="button"
                      className="canvas-builder-mini canvas-builder-mini--danger"
                      title="Удалить страницу"
                      onClick={() => removeContentPage(p.id)}
                    >
                      ×
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
          <button type="button" className="canvas-builder-add-page" onClick={addContentPage}>
            + Страница
          </button>
          <p className="canvas-builder-hint">
            Вопросы из блоков попадают в опрос в порядке страниц сверху вниз. Редактирование текста вопроса — вкладка «Вопросы».
          </p>
        </aside>

        <section className="canvas-builder-main">
          {selected && (
            <>
              <div className="canvas-builder-page-head">
                <label className="canvas-builder-label">
                  Заголовок в списке
                  <input
                    className="surveys-create-input"
                    value={selected.title}
                    onChange={e =>
                      patchPage(selected.id, p => ({ ...p, title: e.target.value }))
                    }
                  />
                </label>
                {selected.role === 'content' && (
                  <label className="canvas-builder-label">
                    Ширина карточки на этой странице
                    <select
                      className="surveys-create-input"
                      value={selected.layout?.maxWidth ?? 'md'}
                      onChange={e =>
                        patchPage(selected.id, p => ({
                          ...p,
                          layout: {
                            ...p.layout,
                            maxWidth: e.target.value as 'sm' | 'md' | 'lg' | 'full',
                          },
                        }))
                      }
                    >
                      <option value="sm">Узкая</option>
                      <option value="md">Средняя</option>
                      <option value="lg">Широкая</option>
                      <option value="full">На всю ширину</option>
                    </select>
                  </label>
                )}
              </div>

              <div className="canvas-builder-canvas">
                <AnimatePresence initial={false}>
                  {selected.blocks.length === 0 ? (
                    <motion.p
                      key="empty"
                      className="canvas-builder-empty"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                    >
                      Нажмите «+ Блок» ниже — текст, отступ, линия
                      {selected.role === 'content' ? ' или вопрос.' : '.'}
                    </motion.p>
                  ) : (
                    selected.blocks.map((b, i) => (
                      <motion.div
                        key={b.id}
                        className="canvas-builder-block"
                        layout
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.18, ease: easeOut, delay: i * 0.02 }}
                      >
                        <div className="canvas-builder-block-head">
                          <span className="canvas-builder-block-kind">
                            {b.type === 'text'
                              ? 'Текст'
                              : b.type === 'question'
                                ? 'Вопрос'
                                : b.type === 'spacer'
                                  ? 'Отступ'
                                  : 'Линия'}
                          </span>
                          <button
                            type="button"
                            className="canvas-builder-block-remove"
                            onClick={() => removeBlock(selected.id, b)}
                          >
                            Удалить
                          </button>
                        </div>
                        {b.type === 'text' && (
                          <div className="canvas-builder-block-fields">
                            <textarea
                              className="canvas-builder-textarea"
                              rows={4}
                              value={b.body}
                              onChange={e =>
                                patchBlock(selected.id, b.id, { ...b, body: e.target.value })
                              }
                            />
                            <label className="canvas-builder-label-inline">
                              Выравнивание
                              <select
                                className="surveys-create-input"
                                value={b.align ?? 'left'}
                                onChange={e =>
                                  patchBlock(selected.id, b.id, {
                                    ...b,
                                    align: e.target.value as 'left' | 'center' | 'right',
                                  })
                                }
                              >
                                <option value="left">Слева</option>
                                <option value="center">По центру</option>
                                <option value="right">Справа</option>
                              </select>
                            </label>
                          </div>
                        )}
                        {b.type === 'spacer' && (
                          <label className="canvas-builder-label">
                            Высота (px)
                            <input
                              type="number"
                              className="surveys-create-input"
                              min={4}
                              max={120}
                              value={b.height}
                              onChange={e =>
                                patchBlock(selected.id, b.id, {
                                  ...b,
                                  height: Number(e.target.value) || 8,
                                })
                              }
                            />
                          </label>
                        )}
                        {b.type === 'question' && (
                          config.questions.length === 0 ? (
                            <p className="canvas-builder-hint">Список вопросов пуст — добавьте блок «Вопрос» ещё раз.</p>
                          ) : (
                            <label className="canvas-builder-label">
                              Вопрос
                              <select
                                className="surveys-create-input"
                                value={
                                  config.questions.some(q => q.id === b.questionId)
                                    ? b.questionId
                                    : config.questions[0]!.id
                                }
                                onChange={e =>
                                  patchBlock(selected.id, b.id, {
                                    ...b,
                                    questionId: e.target.value,
                                  })
                                }
                              >
                                {config.questions.map(q => (
                                  <option key={q.id} value={q.id}>
                                    {q.title.trim() || q.id}
                                  </option>
                                ))}
                              </select>
                            </label>
                          )
                        )}
                      </motion.div>
                    ))
                  )}
                </AnimatePresence>
              </div>

              <div className="canvas-builder-toolbar">
                <span className="canvas-builder-toolbar-label">Добавить</span>
                <button
                  type="button"
                  className="canvas-builder-tool-btn"
                  onClick={() => addBlock(selected.id, 'text')}
                >
                  Текст
                </button>
                <button
                  type="button"
                  className="canvas-builder-tool-btn"
                  onClick={() => addBlock(selected.id, 'spacer')}
                >
                  Отступ
                </button>
                <button
                  type="button"
                  className="canvas-builder-tool-btn"
                  onClick={() => addBlock(selected.id, 'divider')}
                >
                  Линия
                </button>
                {selected.role === 'content' && (
                  <button
                    type="button"
                    className="canvas-builder-tool-btn canvas-builder-tool-btn--primary"
                    onClick={() => addBlock(selected.id, 'question')}
                  >
                    Вопрос
                  </button>
                )}
              </div>
            </>
          )}
        </section>

        <aside className="canvas-builder-preview">
          <p className="canvas-builder-sidebar-title">Порядок вопросов</p>
          <ol className="canvas-builder-order">
            {ordered.map((q, i) => (
              <li key={q.id}>
                {i + 1}. {q.title.trim() || q.id}
              </li>
            ))}
          </ol>
          {ordered.length === 0 && (
            <p className="canvas-builder-hint">Добавьте блок «Вопрос» на контент-страницу.</p>
          )}
        </aside>
      </div>
      )}
    </div>
  )
}
