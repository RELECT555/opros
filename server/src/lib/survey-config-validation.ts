type ObjectValue = Record<string, unknown>
type Check = (value: unknown, path: string) => string | null

const object = (value: unknown): value is ObjectValue =>
  !!value && typeof value === 'object' && !Array.isArray(value)

function shape(value: unknown, path: string, fields: Record<string, Check>, required: string[] = []): string | null {
  if (!object(value)) return `${path}: ожидается объект`
  for (const key of Object.keys(value)) {
    if (!Object.hasOwn(fields, key)) return `${path}.${key}: неизвестное поле`
  }
  for (const key of required) if (!Object.hasOwn(value, key) || value[key] === undefined) return `${path}.${key}: обязательное поле`
  for (const [key, check] of Object.entries(fields)) {
    if (value[key] !== undefined) {
      const error = check(value[key], `${path}.${key}`)
      if (error) return error
    }
  }
  return null
}

const string = (max: number, nonblank = false): Check => (value, path) =>
  typeof value !== 'string' || value.length > max || (nonblank && !value.trim())
    ? `${path}: ожидается ${nonblank ? 'непустая ' : ''}строка до ${max} символов` : null
const boolean: Check = (value, path) => typeof value === 'boolean' ? null : `${path}: ожидается boolean`
const enumeration = (...values: string[]): Check => (value, path) =>
  typeof value === 'string' && values.includes(value) ? null : `${path}: допустимы ${values.join(', ')}`
const number = (min: number, max: number, integer = false): Check => (value, path) =>
  typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max && (!integer || Number.isInteger(value))
    ? null : `${path}: ожидается ${integer ? 'целое ' : ''}число от ${min} до ${max}`
const array = (check: Check, max: number, min = 0): Check => (value, path) => {
  if (!Array.isArray(value) || value.length < min || value.length > max) return `${path}: ожидается массив от ${min} до ${max} элементов`
  for (let index = 0; index < value.length; index++) {
    const error = check(value[index], `${path}[${index}]`)
    if (error) return error
  }
  return null
}
const id: Check = (value, path) => {
  const error = string(120, true)(value, path)
  if (error) return error
  const text = value as string
  return text !== text.trim() || ['__proto__', 'prototype', 'constructor'].includes(text) || text.endsWith('__other')
    ? `${path}: недопустимый идентификатор` : null
}
const url: Check = (value, path) => {
  const error = string(2048)(value, path)
  if (error || value === '') return error
  const text = value as string
  if ((text.startsWith('/') && !text.startsWith('//')) || text.startsWith('#')) return null
  try {
    const parsed = new URL(text)
    if (['http:', 'https:'].includes(parsed.protocol) && !parsed.username && !parsed.password) return null
  } catch { /* report the invalid URL below */ }
  return `${path}: ожидается http(s) URL или относительный путь сайта`
}

const media: Check = (value, path) => shape(value, path, {
  kind: enumeration('image', 'video', 'embed'), url, alt: string(1000),
}, ['kind', 'url'])

const question: Check = (value, path) => {
  const error = shape(value, path, {
    id, type: enumeration('checkbox', 'radio', 'text', 'scale'), title: string(1000, true),
    subtitle: string(4000), options: array(string(1000, true), 100), hasOther: boolean,
    scaleMin: number(-10_000, 10_000, true), scaleMax: number(-10_000, 10_000, true),
    optionsLayout: enumeration('grid', 'list'), media,
  }, ['id', 'type', 'title', 'options'])
  if (error) return error
  const q = value as ObjectValue
  if (q.type === 'radio' || q.type === 'checkbox') {
    const options = q.options as string[]
    if (!options.length) return `${path}.options: добавьте хотя бы один вариант`
    if (new Set(options.map(option => option.trim())).size !== options.length || options.includes('__other__')) {
      return `${path}.options: варианты должны быть уникальными; __other__ зарезервирован`
    }
  }
  if (q.type === 'scale') {
    const min = (q.scaleMin as number | undefined) ?? 1
    const max = (q.scaleMax as number | undefined) ?? 10
    if (max < min || max - min >= 100) return `${path}: шкала должна содержать от 1 до 100 значений, максимум не меньше минимума`
  }
  return null
}

const placement = {
  xPct: number(0, 100), yPx: number(0, 10_000), widthPct: number(0.1, 100),
}
const block: Check = (value, path) => {
  if (!object(value)) return `${path}: ожидается объект блока`
  switch (value.type) {
    case 'text': return shape(value, path, { id, type: enumeration('text'), body: string(20_000),
      align: enumeration('left', 'center', 'right'), minHeightPx: number(0, 10_000),
      fontSizePx: number(8, 300), ...placement }, ['id', 'type', 'body'])
    case 'spacer': return shape(value, path, { id, type: enumeration('spacer'), height: number(0, 10_000), ...placement }, ['id', 'type', 'height'])
    case 'divider': return shape(value, path, { id, type: enumeration('divider'), ...placement }, ['id', 'type'])
    case 'cta': return shape(value, path, { id, type: enumeration('cta'), label: string(1000), ...placement }, ['id', 'type'])
    case 'question': return shape(value, path, { id, type: enumeration('question'), questionId: id }, ['id', 'type', 'questionId'])
    default: return `${path}.type: неизвестный тип блока`
  }
}
const page: Check = (value, path) => shape(value, path, {
  id, role: enumeration('welcome', 'content'), title: string(1000), blocks: array(block, 200),
  layout: (layout, layoutPath) => shape(layout, layoutPath, { maxWidth: enumeration('sm', 'md', 'lg', 'full') }),
}, ['id', 'role', 'title', 'blocks'])

const contactField: Check = (value, path) => shape(value, path, {
  enabled: boolean, required: boolean, label: string(1000), placeholder: string(1000), show_optional_hint: boolean,
})
const consent: Check = (value, path) => shape(value, path, {
  id, title: string(1000, true), description: string(4000), linkUrl: url,
  linkLabel: string(1000), required: boolean,
}, ['id', 'title', 'description', 'required'])
const contacts: Check = (value, path) => shape(value, path, {
  disabled: boolean, hide_email_when_token: boolean,
  step_pill_label: string(1000), step_pill_done_label: string(1000), title: string(1000), subtitle: string(4000),
  name: contactField, phone: contactField, email: contactField, comment: contactField,
  consents: array(consent, 50), submit_hint_need_consents: string(1000), submit_hint_need_contacts: string(1000),
})
const design: Check = (value, path) => shape(value, path, {
  accent: string(200), accent2: string(200), bg: string(200), orb1: string(200), orb2: string(200),
  text: string(200), text2: string(200), logo_url: url, btn_label: string(1000), preset: string(200),
  welcome_badge: string(1000), welcome_hint_1: string(1000), welcome_hint_2: string(1000),
  type_scale: enumeration('compact', 'normal', 'large'), cta_style: enumeration('gradient', 'solid', 'outline'),
  radius: enumeration('sm', 'md', 'lg'), orb_intensity: enumeration('off', 'low', 'medium', 'high'),
})
const labels: Check = (value, path) => {
  if (!object(value) || Object.keys(value).length > 100) return `${path}: ожидается словарь до 100 подписей`
  for (const [key, label] of Object.entries(value)) {
    const error = string(1000)(label, `${path}.${key}`)
    if (error) return error
  }
  return null
}

/** API-boundary validation; TypeScript declarations do not validate persisted JSON. */
export function validateSurveyConfig(value: unknown): string | null {
  const error = shape(value, 'config', {
    questions: array(question, 200), welcome_title: string(4000), welcome_sub: string(10_000),
    design, sticker: string(100), editor_mode: enumeration('classic', 'canvas'), contacts_block: contacts,
    canvas: (canvas, path) => shape(canvas, path, { pages: array(page, 100, 1) }, ['pages']),
    legacy_analytics: (legacy, path) => shape(legacy, path, {
      purpose_title: string(1000), used_before_title: string(1000), current_title: string(1000), current_value_labels: labels,
    }),
  }, ['questions'])
  if (error) return error
  const config = value as ObjectValue
  const questions = config.questions as ObjectValue[]
  const ids = new Set(questions.map(q => q.id as string))
  if (ids.size !== questions.length) return 'config.questions: идентификаторы вопросов должны быть уникальными'
  const consents = (config.contacts_block as ObjectValue | undefined)?.consents as ObjectValue[] | undefined
  if (consents && new Set(consents.map(item => item.id)).size !== consents.length) return 'config.contacts_block.consents: идентификаторы должны быть уникальными'
  if (config.editor_mode === 'canvas' && !config.canvas) return 'config.canvas: обязательное поле для режима canvas'
  if (config.canvas) {
    const pages = (config.canvas as ObjectValue).pages as ObjectValue[]
    if (new Set(pages.map(item => item.id)).size !== pages.length) return 'config.canvas.pages: идентификаторы страниц должны быть уникальными'
    for (const p of pages) {
      const blocks = p.blocks as ObjectValue[]
      if (new Set(blocks.map(item => item.id)).size !== blocks.length) return `config.canvas.pages.${p.id}: идентификаторы блоков должны быть уникальными`
      for (const b of blocks) {
        if (b.type === 'question' && (!ids.has(b.questionId as string) || p.role !== 'content')) return `config.canvas.pages.${p.id}: блок вопроса должен ссылаться на существующий вопрос на контентной странице`
      }
    }
  }
  return null
}
