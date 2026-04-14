/**
 * ws-client.ts — WebSocket-клиент для real-time уведомлений от бэкенда.
 *
 * Для подключения:
 *   1. В survey/.env добавить VITE_WS_URL=ws://localhost:3001/ws
 *   2. В нужном компоненте:
 *      import { wsClient } from '../lib/ws-client'
 *      wsClient.connect()
 *      wsClient.on('response:new', (data) => { ... })
 *
 * Поддерживает:
 *   - Авто-реконнект с экспоненциальным бэкоффом
 *   - Аутентификацию через JWT (admin канал)
 *   - Подписку на каналы survey:<id>
 *   - Типизированные события: response:new, response:status, survey:updated, survey:created
 */

import { ADMIN_JWT_STORAGE_KEY } from './adminSession'

type WsEventType = 'response:new' | 'response:status' | 'survey:updated' | 'survey:created'

type ResponseNewPayload = {
  id: number
  survey_id: number | null
  name: string
  phone: string
  created_at: string
}

type ResponseStatusPayload = {
  id: number
  status: string
}

type SurveyPayload = {
  id: number
  slug: string
  title: string
}

type EventPayloadMap = {
  'response:new': ResponseNewPayload
  'response:status': ResponseStatusPayload
  'survey:updated': SurveyPayload
  'survey:created': SurveyPayload
}

const EVENT_NAMES = new Set<string>(['response:new', 'response:status', 'survey:updated', 'survey:created'])

function _isWsServerEvent(msg: unknown): msg is { type: 'event'; event: WsEventType; data: unknown } {
  if (typeof msg !== 'object' || msg === null) return false
  const m = msg as Record<string, unknown>
  return m.type === 'event' && typeof m.event === 'string' && EVENT_NAMES.has(m.event) && 'data' in m
}

function _isWsServerControl(msg: unknown): msg is { type: string; channel?: string; message?: string } {
  if (typeof msg !== 'object' || msg === null) return false
  const m = msg as Record<string, unknown>
  return typeof m.type === 'string'
}

type WsStatus = 'disconnected' | 'connecting' | 'connected' | 'authenticated'

type Listener<T = unknown> = (data: T) => void
type StatusListener = (status: WsStatus) => void

const WS_URL = (import.meta.env.VITE_WS_URL as string | undefined) ?? 'ws://localhost:3001/ws'
const MAX_RECONNECT_MS = 30_000
const PING_INTERVAL_MS = 25_000

class WsClient {
  private _ws: WebSocket | null = null
  private _status: WsStatus = 'disconnected'
  private _listeners = new Map<string, Set<Listener>>()
  private _statusListeners = new Set<StatusListener>()
  private _reconnectAttempt = 0
  private _reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private _pingTimer: ReturnType<typeof setInterval> | null = null
  private _pendingChannels = new Set<string>()
  private _shouldReconnect = false

  get status(): WsStatus { return this._status }

  connect(): void {
    if (this._ws && (this._ws.readyState === WebSocket.OPEN || this._ws.readyState === WebSocket.CONNECTING)) {
      return
    }
    this._shouldReconnect = true
    this._doConnect()
  }

  disconnect(): void {
    this._shouldReconnect = false
    this._clearTimers()
    if (this._ws) {
      this._ws.close(1000)
      this._ws = null
    }
    this._setStatus('disconnected')
  }

  /** Аутентификация для admin канала. Вызвать после connect(). */
  authenticate(token?: string): void {
    const t = token ?? localStorage.getItem(ADMIN_JWT_STORAGE_KEY)
    if (!t || !this._ws || this._ws.readyState !== WebSocket.OPEN) return
    this._send({ type: 'auth', token: t })
  }

  subscribe(channel: string): void {
    this._pendingChannels.add(channel)
    if (this._ws?.readyState === WebSocket.OPEN) {
      this._send({ type: 'subscribe', channel })
    }
  }

  unsubscribe(channel: string): void {
    this._pendingChannels.delete(channel)
    if (this._ws?.readyState === WebSocket.OPEN) {
      this._send({ type: 'unsubscribe', channel })
    }
  }

  on<E extends WsEventType>(event: E, listener: Listener<EventPayloadMap[E]>): () => void {
    if (!this._listeners.has(event)) {
      this._listeners.set(event, new Set())
    }
    this._listeners.get(event)!.add(listener as Listener)
    return () => this._listeners.get(event)?.delete(listener as Listener)
  }

  onStatus(listener: StatusListener): () => void {
    this._statusListeners.add(listener)
    return () => this._statusListeners.delete(listener)
  }

  // ── Private ───────────────────────────────────────────────

  private _doConnect(): void {
    this._setStatus('connecting')
    try {
      this._ws = new WebSocket(WS_URL)
    } catch {
      this._scheduleReconnect()
      return
    }

    this._ws.onopen = () => {
      this._reconnectAttempt = 0
      this._setStatus('connected')
      this._startPing()

      const token = localStorage.getItem(ADMIN_JWT_STORAGE_KEY)
      if (token) this.authenticate(token)

      for (const ch of this._pendingChannels) {
        this._send({ type: 'subscribe', channel: ch })
      }
    }

    this._ws.onmessage = (ev) => {
      try {
        const msg: unknown = JSON.parse(ev.data as string)
        if (_isWsServerControl(msg)) this._handleMessage(msg)
      } catch { /* ignore malformed */ }
    }

    this._ws.onclose = () => {
      this._stopPing()
      this._setStatus('disconnected')
      if (this._shouldReconnect) this._scheduleReconnect()
    }

    this._ws.onerror = () => {
      this._ws?.close()
    }
  }

  private _handleMessage(msg: { type: string; channel?: string; message?: string }): void {
    if (msg.type === 'subscribed' && msg.channel === 'admin') {
      this._setStatus('authenticated')
      return
    }

    if (_isWsServerEvent(msg)) {
      const listeners = this._listeners.get(msg.event)
      if (listeners) {
        for (const fn of listeners) fn(msg.data)
      }
    }
  }

  private _send(data: unknown): void {
    if (this._ws?.readyState === WebSocket.OPEN) {
      this._ws.send(JSON.stringify(data))
    }
  }

  private _setStatus(s: WsStatus): void {
    if (this._status === s) return
    this._status = s
    for (const fn of this._statusListeners) fn(s)
  }

  private _startPing(): void {
    this._stopPing()
    this._pingTimer = setInterval(() => {
      this._send({ type: 'ping' })
    }, PING_INTERVAL_MS)
  }

  private _stopPing(): void {
    if (this._pingTimer) {
      clearInterval(this._pingTimer)
      this._pingTimer = null
    }
  }

  private _scheduleReconnect(): void {
    const delay = Math.min(1000 * 2 ** this._reconnectAttempt, MAX_RECONNECT_MS)
    this._reconnectAttempt++
    this._reconnectTimer = setTimeout(() => this._doConnect(), delay)
  }

  private _clearTimers(): void {
    this._stopPing()
    if (this._reconnectTimer) {
      clearTimeout(this._reconnectTimer)
      this._reconnectTimer = null
    }
  }
}

export const wsClient = new WsClient()

export type { WsEventType, EventPayloadMap, WsStatus, ResponseNewPayload, ResponseStatusPayload, SurveyPayload }
