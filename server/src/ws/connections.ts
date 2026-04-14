import type { WebSocket } from 'ws'
import type { WsChannel, WsServerMessage } from '../types/ws.js'
import { wsLog } from '../logger.js'

type ClientInfo = {
  socket: WebSocket
  channels: Set<WsChannel>
  isAlive: boolean
  isAuthenticated: boolean
  connectedAt: number
  messageCount: number
  lastMessageReset: number
}

const clients = new Map<WebSocket, ClientInfo>()

let heartbeatTimer: ReturnType<typeof setInterval> | null = null
const HEARTBEAT_MS = 30_000
const MAX_MESSAGES_PER_WINDOW = 60
const MESSAGE_WINDOW_MS = 60_000
const MAX_MESSAGE_SIZE = 4096
const MAX_CHANNELS_PER_CLIENT = 10

export function addClient(socket: WebSocket): void {
  clients.set(socket, {
    socket,
    channels: new Set(),
    isAlive: true,
    isAuthenticated: false,
    connectedAt: Date.now(),
    messageCount: 0,
    lastMessageReset: Date.now(),
  })
  wsLog.debug({ total: clients.size }, 'клиент подключён')
}

export function removeClient(socket: WebSocket): void {
  clients.delete(socket)
  wsLog.debug({ total: clients.size }, 'клиент отключён')
}

export function authenticateClient(socket: WebSocket): void {
  const info = clients.get(socket)
  if (info) info.isAuthenticated = true
}

export function isAuthenticated(socket: WebSocket): boolean {
  return clients.get(socket)?.isAuthenticated ?? false
}

/** Проверка rate limit на сообщения. Возвращает true если лимит превышен. */
export function checkMessageLimit(socket: WebSocket): boolean {
  const info = clients.get(socket)
  if (!info) return true
  const now = Date.now()
  if (now - info.lastMessageReset > MESSAGE_WINDOW_MS) {
    info.messageCount = 0
    info.lastMessageReset = now
  }
  info.messageCount++
  return info.messageCount > MAX_MESSAGES_PER_WINDOW
}

export function subscribeClient(socket: WebSocket, channel: WsChannel): boolean {
  const info = clients.get(socket)
  if (!info) return false
  if (info.channels.size >= MAX_CHANNELS_PER_CLIENT) return false
  info.channels.add(channel)
  wsLog.debug({ channel, channels: [...info.channels] }, 'подписка')
  return true
}

export function unsubscribeClient(socket: WebSocket, channel: WsChannel): boolean {
  const info = clients.get(socket)
  if (!info) return false
  info.channels.delete(channel)
  return true
}

export function markAlive(socket: WebSocket): void {
  const info = clients.get(socket)
  if (info) info.isAlive = true
}

export function broadcast(channel: WsChannel, message: WsServerMessage): void {
  const json = JSON.stringify(message)
  let sent = 0
  for (const [, info] of clients) {
    if (info.channels.has(channel) && info.socket.readyState === 1) {
      info.socket.send(json)
      sent++
    }
  }
  if (sent > 0) {
    wsLog.debug({ channel, sent }, 'broadcast')
  }
}

export function sendTo(socket: WebSocket, message: WsServerMessage): void {
  if (socket.readyState === 1) {
    socket.send(JSON.stringify(message))
  }
}

export function startHeartbeat(): void {
  if (heartbeatTimer) return
  heartbeatTimer = setInterval(() => {
    for (const [socket, info] of clients) {
      if (!info.isAlive) {
        wsLog.debug('heartbeat: клиент не ответил — закрываем')
        socket.terminate()
        clients.delete(socket)
        continue
      }
      info.isAlive = false
      socket.ping()
    }
  }, HEARTBEAT_MS)
}

export function stopHeartbeat(): void {
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer)
    heartbeatTimer = null
  }
}

export function getStats(): { total: number; channels: Record<string, number> } {
  const channels: Record<string, number> = {}
  for (const [, info] of clients) {
    for (const ch of info.channels) {
      channels[ch] = (channels[ch] ?? 0) + 1
    }
  }
  return { total: clients.size, channels }
}

export { MAX_MESSAGE_SIZE }
