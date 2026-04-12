import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const BOT_TOKEN      = Deno.env.get('TELEGRAM_BOT_TOKEN')!
const CHAT_ID        = Deno.env.get('TELEGRAM_CHAT_ID')!
const SUPABASE_URL   = Deno.env.get('SUPABASE_URL')!
const SUPABASE_KEY   = Deno.env.get('SUPABASE_ANON_KEY')!

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

const STATUS_LABELS: Record<string, string> = {
  new:         'Новая',
  called:      'Позвонили',
  in_progress: 'В работе',
  closed:      'Закрыто',
}

serve(async (req) => {
  try {
    const payload = await req.json()
    const { type, record, old_record } = payload

    if (!record) return new Response('no record', { status: 400 })

    let text: string

    if (type === 'UPDATE' && old_record) {
      if (old_record.status === record.status) {
        return new Response('status unchanged', { status: 200 })
      }

      const oldStatus = STATUS_LABELS[old_record.status] ?? old_record.status ?? '—'
      const newStatus = STATUS_LABELS[record.status]     ?? record.status     ?? '—'
      const name  = record.name  ?? '—'
      const phone = record.phone ?? '—'

      text = [
        `🔄 *Смена статуса заявки #${record.id}*`,
        ``,
        `👤 *Имя:* ${escape(name)}`,
        `📞 *Телефон:* ${escape(phone)}`,
        ``,
        `📊 *Статус:* ${escape(oldStatus)} → *${escape(newStatus)}*`,
      ].join('\n')
    } else {
      const name    = record.name    ?? '—'
      const phone   = record.phone   ?? '—'
      const email   = record.email   ?? ''
      const comment = record.comment ?? ''

      // Загружаем заголовки вопросов из конфига опросника
      const questionTitles = await fetchQuestionTitles(record.survey_id)
      const answerLines = buildAnswerLines(record, questionTitles)

      text = [
        `🔔 *Новая заявка*`,
        ``,
        `👤 *Имя:* ${escape(name)}`,
        `📞 *Телефон:* ${escape(phone)}`,
        email   ? `📧 *Email:* ${escape(email)}`           : '',
        answerLines.length ? `` : '',
        ...answerLines,
        comment ? `` : '',
        comment ? `💬 *Комментарий:* ${escape(comment)}` : '',
      ].filter(s => s !== undefined && s !== null).join('\n')
    }

    const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: CHAT_ID, text, parse_mode: 'MarkdownV2' }),
    })

    if (!res.ok) {
      console.error('Telegram error:', await res.text())
      return new Response('telegram error', { status: 500 })
    }

    return new Response('ok', { status: 200 })
  } catch (e) {
    console.error(e)
    return new Response('error', { status: 500 })
  }
})

/** Возвращает map: questionId → title из конфига опросника */
async function fetchQuestionTitles(surveyId: unknown): Promise<Record<string, string>> {
  if (!surveyId) return {}
  try {
    const { data } = await supabase
      .from('surveys')
      .select('config')
      .eq('id', surveyId)
      .single()
    const questions = (data?.config?.questions ?? []) as Array<{ id: string; title: string }>
    return Object.fromEntries(questions.map(q => [q.id, q.title]))
  } catch {
    return {}
  }
}

/**
 * Формирует строки с ответами.
 * Пропускает пустые ответы и служебные поля __other.
 */
function buildAnswerLines(
  record: Record<string, unknown>,
  questionTitles: Record<string, string>,
): string[] {
  const answers = record.answers as Record<string, unknown> | null | undefined

  // Новый опросник: answers непустой
  if (answers && typeof answers === 'object' && Object.keys(answers).length > 0) {
    const lines: string[] = []
    for (const [key, value] of Object.entries(answers)) {
      // Пропускаем служебные поля (текст "другое")
      if (key.endsWith('__other')) continue

      // Определяем значение
      let val = ''
      if (Array.isArray(value)) {
        // Для checkbox — подставляем текст "другое" если выбрано __other__
        const otherText = answers[key + '__other'] as string | undefined
        const items = (value as string[])
          .map(v => v === '__other__' ? (otherText || 'Другое') : v)
        if (items.length === 0) continue
        val = escape(items.join(', '))
      } else {
        const raw = String(value ?? '')
        const str = raw === '__other__'
          ? String(answers[key + '__other'] ?? 'Другое')
          : raw
        if (!str.trim()) continue
        val = escape(str)
      }

      if (!val) continue
      const label = escape(questionTitles[key] || key)
      if (!label) continue
      lines.push(`📝 *${label}:* ${val}`)
    }
    return lines
  }

  // Старый CRM-опросник: legacy-поля
  const CURRENT_LABELS: Record<string, string> = {
    yes:       'Да, используем CRM',
    no:        'Нет, работаем без CRM',
    looking:   'Выбираем CRM прямо сейчас',
    switching: 'Хотим сменить текущую',
  }

  const purpose = Array.isArray(record.crm_purpose)
    ? (record.crm_purpose as string[]).join(', ')
    : String(record.crm_purpose ?? '')
  const usedBefore = Array.isArray(record.crm_used_before)
    ? (record.crm_used_before as string[]).join(', ')
    : String(record.crm_used_before ?? '')
  const currentCrm = CURRENT_LABELS[record.current_crm as string] ?? String(record.current_crm ?? '')

  const lines: string[] = []
  if (purpose)    lines.push(`🎯 *Цель CRM:* ${escape(purpose)}`)
  if (usedBefore) lines.push(`📋 *Использовали раньше:* ${escape(usedBefore)}`)
  if (currentCrm) lines.push(`📌 *Текущая ситуация:* ${escape(currentCrm)}`)
  return lines
}

function escape(str: string): string {
  return str.replace(/[_*[\]()~`>#+=|{}.!-]/g, '\\$&')
}
