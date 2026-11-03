/**
 * Логика режима конструктора (страницы и блоки) без импорта из supabase.ts,
 * чтобы избежать циклических зависимостей.
 */

import type {
  SurveyCanvas,
  SurveyCanvasBlock,
  SurveyCanvasPage,
  SurveyConfigData,
  SurveyQuestion,
} from './supabase'

export function createEmptySurveyQuestion(): SurveyQuestion {
  return {
    id: `q_${Date.now()}`,
    type: 'checkbox',
    title: 'Новый вопрос',
    subtitle: '',
    options: ['Вариант 1'],
  }
}

export function createEmptyScaleQuestion(): SurveyQuestion {
  return {
    id: `q_${Date.now()}`,
    type: 'scale',
    title: 'Оцените',
    subtitle: '',
    options: [],
    scaleMin: 1,
    scaleMax: 5,
  }
}

export function canvasBlockText(
  body = 'Текст',
  align: 'left' | 'center' | 'right' = 'left',
  minHeightPx?: number,
): SurveyCanvasBlock {
  const id = `b_${Date.now()}`
  if (minHeightPx != null && minHeightPx > 0) {
    return { id, type: 'text', body, align, minHeightPx }
  }
  return { id, type: 'text', body, align }
}

export function canvasBlockCta(label = 'Начать опрос'): SurveyCanvasBlock {
  return {
    id: `b_${Date.now()}`,
    type: 'cta',
    label,
    xPct: 30,
    yPx: 300,
    widthPct: 40,
  }
}

export function patchCanvasPageTitle(cfg: SurveyConfigData, pageId: string, title: string): SurveyConfigData {
  if (!cfg.canvas) return cfg
  const t = title.slice(0, 200)
  return {
    ...cfg,
    canvas: {
      pages: cfg.canvas.pages.map(p => (p.id === pageId ? { ...p, title: t } : p)),
    },
  }
}

export function canvasBlockSpacer(height = 24): SurveyCanvasBlock {
  return { id: `b_${Date.now()}`, type: 'spacer', height }
}

export function canvasBlockDivider(): SurveyCanvasBlock {
  return { id: `b_${Date.now()}`, type: 'divider' }
}

export function getContentPages(cfg: SurveyConfigData): SurveyCanvasPage[] {
  if (!isCanvasSurvey(cfg)) return []
  return cfg.canvas!.pages.filter(p => p.role === 'content')
}

export function patchPageBlocks(
  cfg: SurveyConfigData,
  pageId: string,
  fn: (blocks: SurveyCanvasBlock[]) => SurveyCanvasBlock[],
): SurveyConfigData {
  if (!cfg.canvas) return cfg
  return {
    ...cfg,
    canvas: {
      pages: cfg.canvas.pages.map(p => (p.id === pageId ? { ...p, blocks: fn(p.blocks) } : p)),
    },
  }
}

export function updateWelcomePageBlocks(
  cfg: SurveyConfigData,
  fn: (blocks: SurveyCanvasBlock[]) => SurveyCanvasBlock[],
): SurveyConfigData {
  if (!cfg.canvas) return cfg
  return {
    ...cfg,
    canvas: {
      pages: cfg.canvas.pages.map(p => (p.role === 'welcome' ? { ...p, blocks: fn(p.blocks) } : p)),
    },
  }
}

export function moveBlockInWelcome(
  cfg: SurveyConfigData,
  blockId: string,
  dir: -1 | 1,
): SurveyConfigData {
  return updateWelcomePageBlocks(cfg, blocks => {
    const i = blocks.findIndex(b => b.id === blockId)
    if (i < 0) return blocks
    const j = i + dir
    if (j < 0 || j >= blocks.length) return blocks
    const next = [...blocks]
    const t = next[i]!
    next[i] = next[j]!
    next[j] = t
    return next
  })
}

export function appendWelcomeBlock(cfg: SurveyConfigData, block: SurveyCanvasBlock): SurveyConfigData {
  return updateWelcomePageBlocks(cfg, blocks => [...blocks, block])
}

export function removeWelcomeBlock(cfg: SurveyConfigData, block: SurveyCanvasBlock): SurveyConfigData {
  return updateWelcomePageBlocks(cfg, blocks => blocks.filter(b => b.id !== block.id))
}

export function patchWelcomeBlock(
  cfg: SurveyConfigData,
  blockId: string,
  nextBlock: SurveyCanvasBlock,
): SurveyConfigData {
  return updateWelcomePageBlocks(cfg, blocks => blocks.map(b => (b.id === blockId ? nextBlock : b)))
}

/** Перестановка блоков приветствия (drag-and-drop). */
export function reorderWelcomeBlocks(
  cfg: SurveyConfigData,
  activeBlockId: string,
  overBlockId: string,
): SurveyConfigData {
  return updateWelcomePageBlocks(cfg, blocks => {
    const oldIndex = blocks.findIndex(b => b.id === activeBlockId)
    const newIndex = blocks.findIndex(b => b.id === overBlockId)
    if (oldIndex < 0 || newIndex < 0 || oldIndex === newIndex) return blocks
    const next = [...blocks]
    const [removed] = next.splice(oldIndex, 1)
    next.splice(newIndex, 0, removed!)
    return next
  })
}

export function pageStepWrapClass(page: SurveyCanvasPage): string {
  const mw = page.layout?.maxWidth ?? 'md'
  return WIDTH_CLASS[mw] ?? WIDTH_CLASS.md
}

export function moveBlockInPage(
  cfg: SurveyConfigData,
  pageId: string,
  blockId: string,
  dir: -1 | 1,
): SurveyConfigData {
  return patchPageBlocks(cfg, pageId, blocks => {
    const i = blocks.findIndex(b => b.id === blockId)
    if (i < 0) return blocks
    const j = i + dir
    if (j < 0 || j >= blocks.length) return blocks
    const next = [...blocks]
    const t = next[i]!
    next[i] = next[j]!
    next[j] = t
    return next
  })
}

/** Перестановка блоков мышью: active встает на место over. */
export function reorderBlocksInPage(
  cfg: SurveyConfigData,
  pageId: string,
  activeBlockId: string,
  overBlockId: string,
): SurveyConfigData {
  return patchPageBlocks(cfg, pageId, blocks => {
    const oldIndex = blocks.findIndex(b => b.id === activeBlockId)
    const newIndex = blocks.findIndex(b => b.id === overBlockId)
    if (oldIndex < 0 || newIndex < 0 || oldIndex === newIndex) return blocks
    const next = [...blocks]
    const [removed] = next.splice(oldIndex, 1)
    next.splice(newIndex, 0, removed!)
    return next
  })
}

export function appendBlockToPage(
  cfg: SurveyConfigData,
  pageId: string,
  block: SurveyCanvasBlock,
): SurveyConfigData {
  return patchPageBlocks(cfg, pageId, blocks => [...blocks, block])
}

export function appendQuestionBlockOnPage(
  cfg: SurveyConfigData,
  pageId: string,
  question: SurveyQuestion,
): SurveyConfigData {
  const block: SurveyCanvasBlock = {
    id: `b_${Date.now()}`,
    type: 'question',
    questionId: question.id,
  }
  const withBlock = appendBlockToPage(cfg, pageId, block)
  return {
    ...withBlock,
    questions: [...(withBlock.questions ?? []), question],
  }
}

/** Шаблон страницы: крупный заголовок (текст) и карточка вопроса под ним. */
export function appendHeroQuestionPair(cfg: SurveyConfigData, pageId: string): SurveyConfigData {
  const base = Date.now()
  const textBlock: SurveyCanvasBlock = {
    id: `b_${base}_h`,
    type: 'text',
    body: 'Заголовок страницы',
    align: 'center',
  }
  const q: SurveyQuestion = {
    ...createEmptySurveyQuestion(),
    id: `q_${base}_hq`,
    title: 'Новый вопрос',
  }
  const qBlock: SurveyCanvasBlock = {
    id: `b_${base}_q`,
    type: 'question',
    questionId: q.id,
  }
  const patched = patchPageBlocks(cfg, pageId, blocks => [...blocks, textBlock, qBlock])
  return {
    ...patched,
    questions: [...(patched.questions ?? []), q],
  }
}

export function removeBlockFromPage(cfg: SurveyConfigData, pageId: string, block: SurveyCanvasBlock): SurveyConfigData {
  let questions = cfg.questions ?? []
  if (block.type === 'question' && cfg.canvas) {
    const refs = countQuestionRefsInCanvas(cfg.canvas, block.questionId) - 1
    if (refs <= 0) {
      questions = questions.filter(q => q.id !== block.questionId)
    }
  }
  const next = patchPageBlocks(cfg, pageId, blocks => blocks.filter(b => b.id !== block.id))
  return { ...next, questions }
}

export function patchBlockOnPage(
  cfg: SurveyConfigData,
  pageId: string,
  blockId: string,
  nextBlock: SurveyCanvasBlock,
): SurveyConfigData {
  return patchPageBlocks(cfg, pageId, blocks => blocks.map(b => (b.id === blockId ? nextBlock : b)))
}

export function isCanvasSurvey(cfg: SurveyConfigData): boolean {
  return cfg.editor_mode === 'canvas' && Array.isArray(cfg.canvas?.pages) && cfg.canvas!.pages.length > 0
}

export function createDefaultCanvasSurveyConfig(): SurveyConfigData {
  const t = Date.now()
  const welcomePage: SurveyCanvasPage = {
    id: `page_welcome_${t}`,
    role: 'welcome',
    title: 'Главная страница',
    layout: { maxWidth: 'md' },
    blocks: [
      {
        id: `b_${t}`,
        type: 'text',
        body: 'Добро пожаловать\n\nДобавьте вопросы на страницах ниже и оформите текст приветствия здесь.',
        align: 'center',
        xPct: 10,
        yPx: 20,
        widthPct: 80,
        fontSizePx: 54,
      },
      {
        id: `b_${t}_cta`,
        type: 'cta',
        label: 'Начать опрос',
        xPct: 30,
        yPx: 300,
        widthPct: 40,
      },
    ],
  }
  const firstContent: SurveyCanvasPage = {
    id: `page_content_${t}`,
    role: 'content',
    title: 'Страница 1',
    layout: { maxWidth: 'md' },
    blocks: [],
  }
  const canvas: SurveyCanvas = { pages: [welcomePage, firstContent] }
  return {
    editor_mode: 'canvas',
    welcome_title: '',
    welcome_sub: '',
    questions: [],
    canvas,
  }
}

export function getWelcomeCanvasBlocks(cfg: SurveyConfigData): SurveyCanvasBlock[] | null {
  if (!isCanvasSurvey(cfg)) return null
  const welcome = cfg.canvas!.pages.find(p => p.role === 'welcome')
  if (!welcome || welcome.blocks.length === 0) return null
  return welcome.blocks
}

const WIDTH_CLASS: Record<NonNullable<SurveyCanvasPage['layout']>['maxWidth'] & string, string> = {
  sm: 'sf-card-inner sf-card-inner--sm',
  md: 'sf-card-inner sf-card-inner--md',
  lg: 'sf-card-inner sf-card-inner--lg',
  full: 'sf-card-inner sf-card-inner--full',
}

export function stepWidthClassForQuestionId(cfg: SurveyConfigData, questionId: string): string {
  if (!isCanvasSurvey(cfg)) return 'sf-card-inner sf-card-inner--md'
  for (const page of cfg.canvas!.pages) {
    if (page.role !== 'content') continue
    const mw = page.layout?.maxWidth ?? 'md'
    for (const b of page.blocks) {
      if (b.type === 'question' && b.questionId === questionId) {
        return WIDTH_CLASS[mw] ?? WIDTH_CLASS.md
      }
    }
  }
  return WIDTH_CLASS.md
}

/**
 * Порядок вопросов для прохождения опроса: по страницам и блокам конструктора,
 * Вопросы вне контентных страниц не показываются и не требуют ответа.
 */
export function orderedQuestionsFromCanvas(cfg: SurveyConfigData): SurveyQuestion[] {
  const base = cfg.questions ?? []
  if (!isCanvasSurvey(cfg)) return base

  const byId = new Map(base.map(q => [q.id, q]))
  const ordered: SurveyQuestion[] = []
  const seen = new Set<string>()

  for (const page of cfg.canvas!.pages) {
    if (page.role !== 'content') continue
    for (const b of page.blocks) {
      if (b.type !== 'question') continue
      const q = byId.get(b.questionId)
      if (q && !seen.has(q.id)) {
        ordered.push(q)
        seen.add(q.id)
      }
    }
  }

  return ordered
}

export function appendSurveyQuestion(cfg: SurveyConfigData, question: SurveyQuestion): SurveyConfigData {
  if (!isCanvasSurvey(cfg)) return { ...cfg, questions: [...(cfg.questions ?? []), question] }
  const page = getContentPages(cfg).at(-1)
  if (page) return appendQuestionBlockOnPage(cfg, page.id, question)
  const pageId = `page_${question.id}`
  const withPage = { ...cfg, canvas: { pages: [...cfg.canvas!.pages, { id: pageId, role: 'content' as const, title: 'Страница 1', blocks: [] }] } }
  return appendQuestionBlockOnPage(withPage, pageId, question)
}

/** A deleted question must not leave dangling canvas references. */
export function removeSurveyQuestion(cfg: SurveyConfigData, questionId: string): SurveyConfigData {
  const next = { ...cfg, questions: cfg.questions.filter(question => question.id !== questionId) }
  if (!cfg.canvas) return next
  return { ...next, canvas: { ...cfg.canvas, pages: cfg.canvas.pages.map(page => ({ ...page,
    blocks: page.blocks.filter(block => block.type !== 'question' || block.questionId !== questionId),
  })) } }
}

export function countQuestionRefsInCanvas(canvas: SurveyCanvas | undefined, questionId: string): number {
  if (!canvas?.pages) return 0
  let n = 0
  for (const p of canvas.pages) {
    for (const b of p.blocks) {
      if (b.type === 'question' && b.questionId === questionId) n += 1
    }
  }
  return n
}
