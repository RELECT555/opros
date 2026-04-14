/**
 * Типы WebSocket-протокола.
 *
 * Клиент → Сервер:  WsClientMessage
 * Сервер → Клиент:  WsServerMessage
 *
 * Пока не подключаем — готовим контракт для будущей интеграции.
 */

// ── Клиент → Сервер ────────────────────────────────────────

export type WsClientMessage =
  | { type: 'subscribe'; channel: WsChannel; payload?: Record<string, unknown> }
  | { type: 'unsubscribe'; channel: WsChannel }
  | { type: 'ping' }
  | { type: 'auth'; token: string }

// ── Сервер → Клиент ────────────────────────────────────────

export type WsServerMessage =
  | { type: 'pong' }
  | { type: 'subscribed'; channel: WsChannel }
  | { type: 'unsubscribed'; channel: WsChannel }
  | { type: 'error'; message: string }
  | WsEvent

export type WsEvent =
  | { type: 'event'; event: 'response:new'; data: ResponseNewPayload }
  | { type: 'event'; event: 'response:status'; data: ResponseStatusPayload }
  | { type: 'event'; event: 'survey:updated'; data: SurveyUpdatedPayload }
  | { type: 'event'; event: 'survey:created'; data: SurveyCreatedPayload }

// ── Каналы подписок ────────────────────────────────────────

export type WsChannel =
  | 'admin'            // все админские события
  | `survey:${number}` // события конкретного опроса

// ── Payload'ы событий ──────────────────────────────────────

export type ResponseNewPayload = {
  id: number
  survey_id: number | null
  name: string
  phone: string
  created_at: string
}

export type ResponseStatusPayload = {
  id: number
  status: string
  updated_by?: string
}

export type SurveyUpdatedPayload = {
  id: number
  slug: string
  title: string
}

export type SurveyCreatedPayload = {
  id: number
  slug: string
  title: string
}
