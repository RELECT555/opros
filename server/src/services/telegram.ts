import { telegramLog } from '../logger.js'

const STATUS_LABELS: Record<string, string> = {
  new:         '🆕 Новая',
  called:      '📞 Позвонили',
  in_progress: '🔄 В работе',
  closed:      '✅ Закрыто',
}

function _escapeMarkdown(text: unknown): string {
  return String(text ?? '')
    .replace(/[_*\[\]()~`>#+\-=|{}.!\\]/g, '\\$&')
    .slice(0, 500)
}

type NotifyPayload = {
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
      `👤 ${_escapeMarkdown(data.name)} | 📱 ${_escapeMarkdown(data.phone)}`,
      data.email ? `📧 ${_escapeMarkdown(data.email)}` : null,
      data.comment ? `💬 ${_escapeMarkdown(data.comment)}` : null,
    ].filter(Boolean).join('\n')
  }

  if (type === 'status_change') {
    const label = STATUS_LABELS[data.status as string] ?? _escapeMarkdown(data.status)
    text = [
      `🔄 *Статус изменён → ${label}*`,
      `👤 ${_escapeMarkdown(data.name)} | 📱 ${_escapeMarkdown(data.phone)}`,
    ].join('\n')
  }

  if (!text) return

  telegramLog.debug({ type, chat_id: chatId }, 'отправка уведомления')

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'MarkdownV2',
      }),
      signal: AbortSignal.timeout(10_000),
    })

    if (!res.ok) {
      const body = await res.text().catch(() => '')
      telegramLog.error({ status: res.status, body, type }, 'Telegram API вернул ошибку')
    } else {
      telegramLog.debug({ type }, 'уведомление доставлено')
    }
  } catch (err) {
    telegramLog.error({ err, type }, 'ошибка отправки в Telegram')
  }
}
