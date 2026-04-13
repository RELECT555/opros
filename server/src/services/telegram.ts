/**
 * Telegram-уведомления — аналог текущей Supabase Edge Function.
 * Вызывается из routes/responses.ts при новых ответах и смене статуса.
 */
import { telegramLog } from '../logger.js'

const STATUS_LABELS: Record<string, string> = {
  new:         '🆕 Новая',
  called:      '📞 Позвонили',
  in_progress: '🔄 В работе',
  closed:      '✅ Закрыто',
}

interface NotifyPayload {
  type: 'new_response' | 'status_change'
  data: Record<string, unknown> | null
}

export async function sendTelegramNotification({ type, data }: NotifyPayload) {
  const token  = process.env.TELEGRAM_BOT_TOKEN
  const chatId = process.env.TELEGRAM_CHAT_ID
  if (!token || !chatId || !data) return

  let text = ''

  if (type === 'new_response') {
    text = [
      '📋 *Новая заявка*',
      `👤 ${data.name} | 📱 ${data.phone}`,
      data.email ? `📧 ${data.email}` : null,
      data.comment ? `💬 ${data.comment}` : null,
    ].filter(Boolean).join('\n')
  }

  if (type === 'status_change') {
    const label = STATUS_LABELS[data.status as string] ?? data.status
    text = [
      `🔄 *Статус изменён → ${label}*`,
      `👤 ${data.name} | 📱 ${data.phone}`,
    ].join('\n')
  }

  telegramLog.debug({ type, chat_id: chatId }, 'отправка уведомления')

  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: 'Markdown',
    }),
  })

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    telegramLog.error({ status: res.status, body, type }, 'Telegram API вернул ошибку')
  } else {
    telegramLog.debug({ type }, 'уведомление доставлено')
  }
}
