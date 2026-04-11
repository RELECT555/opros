import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN')!
const CHAT_ID   = Deno.env.get('TELEGRAM_CHAT_ID')!

const CURRENT_LABELS: Record<string, string> = {
  yes:       'Да, используем CRM',
  no:        'Нет, работаем без CRM',
  looking:   'Выбираем CRM прямо сейчас',
  switching: 'Хотим сменить текущую',
}

serve(async (req) => {
  try {
    const payload = await req.json()

    // Supabase Database Webhook посылает { type, table, record, old_record }
    const record = payload.record
    if (!record) {
      return new Response('no record', { status: 400 })
    }

    const name    = record.name    ?? '—'
    const phone   = record.phone   ?? '—'
    const comment = record.comment ?? ''
    const purpose = Array.isArray(record.crm_purpose)
      ? record.crm_purpose.join(', ')
      : record.crm_purpose ?? '—'
    const usedBefore = Array.isArray(record.crm_used_before)
      ? record.crm_used_before.join(', ')
      : record.crm_used_before ?? '—'
    const currentCrm = CURRENT_LABELS[record.current_crm] ?? record.current_crm ?? '—'

    const text = [
      `🔔 *Новая заявка на CRM-консультацию*`,
      ``,
      `👤 *Имя:* ${escape(name)}`,
      `📞 *Телефон:* ${escape(phone)}`,
      ``,
      `🎯 *Цель CRM:* ${escape(purpose)}`,
      `📋 *Использовали раньше:* ${escape(usedBefore)}`,
      `📌 *Текущая ситуация:* ${escape(currentCrm)}`,
      comment ? `💬 *Комментарий:* ${escape(comment)}` : '',
    ].filter(Boolean).join('\n')

    const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: CHAT_ID,
        text,
        parse_mode: 'Markdown',
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      console.error('Telegram error:', err)
      return new Response('telegram error', { status: 500 })
    }

    return new Response('ok', { status: 200 })
  } catch (e) {
    console.error(e)
    return new Response('error', { status: 500 })
  }
})

function escape(str: string): string {
  return str.replace(/[_*[\]()~`>#+=|{}.!-]/g, '\\$&')
}
