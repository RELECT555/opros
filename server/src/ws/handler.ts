import type { WebSocket as WsSocket, RawData } from 'ws'
import type { WsClientMessage, WsChannel } from '../types/ws.js'
import {
  addClient,
  removeClient,
  subscribeClient,
  unsubscribeClient,
  markAlive,
  sendTo,
  authenticateClient,
  isAuthenticated,
  checkMessageLimit,
  MAX_MESSAGE_SIZE,
} from './connections.js'
import { wsLog } from '../logger.js'

type JwtVerifier = (token: string) => boolean

let _jwtVerifier: JwtVerifier | null = null

/** Вызывается из index.ts после register(@fastify/jwt), чтобы WS использовал тот же verify, что и HTTP. */
export function setWsJwtVerifier(verify: JwtVerifier): void {
  _jwtVerifier = verify
}

function _verifyJwt(token: string): boolean {
  if (!_jwtVerifier) {
    wsLog.warn('WS: JWT verifier не настроен — auth отклонён')
    return false
  }
  return _jwtVerifier(token)
}

export function handleConnection(socket: WsSocket): void {
  addClient(socket)

  socket.on('message', (raw: RawData) => {
    const data = raw.toString()

    if (data.length > MAX_MESSAGE_SIZE) {
      sendTo(socket, { type: 'error', message: 'message too large' })
      return
    }

    if (checkMessageLimit(socket)) {
      sendTo(socket, { type: 'error', message: 'rate limit exceeded' })
      return
    }

    let msg: WsClientMessage
    try {
      msg = JSON.parse(data) as WsClientMessage
    } catch {
      sendTo(socket, { type: 'error', message: 'invalid json' })
      return
    }
    _handleMessage(socket, msg)
  })

  socket.on('pong', () => markAlive(socket))
  socket.on('close', () => removeClient(socket))
  socket.on('error', (err: Error) => {
    wsLog.error({ err }, 'ws socket error')
    removeClient(socket)
  })
}

const ADMIN_CHANNEL_REGEX = /^admin$/
const SURVEY_CHANNEL_REGEX = /^survey:\d+$/

function _isValidChannel(ch: string): ch is WsChannel {
  return ADMIN_CHANNEL_REGEX.test(ch) || SURVEY_CHANNEL_REGEX.test(ch)
}

function _handleMessage(socket: WsSocket, msg: WsClientMessage): void {
  switch (msg.type) {
    case 'ping':
      sendTo(socket, { type: 'pong' })
      break

    case 'auth': {
      if (_verifyJwt(msg.token)) {
        authenticateClient(socket)
        sendTo(socket, { type: 'subscribed', channel: 'admin' })
      } else {
        sendTo(socket, { type: 'error', message: 'auth failed' })
      }
      break
    }

    case 'subscribe': {
      const ch = msg.channel
      if (!_isValidChannel(ch)) {
        sendTo(socket, { type: 'error', message: 'invalid channel' })
        break
      }

      if (ch === 'admin' && !isAuthenticated(socket)) {
        sendTo(socket, { type: 'error', message: 'auth required for admin channel' })
        break
      }

      const ok = subscribeClient(socket, ch)
      if (ok) {
        sendTo(socket, { type: 'subscribed', channel: ch })
      } else {
        sendTo(socket, { type: 'error', message: 'subscribe failed' })
      }
      break
    }

    case 'unsubscribe': {
      if (!_isValidChannel(msg.channel)) {
        sendTo(socket, { type: 'error', message: 'invalid channel' })
        break
      }
      unsubscribeClient(socket, msg.channel)
      sendTo(socket, { type: 'unsubscribed', channel: msg.channel })
      break
    }

    default:
      sendTo(socket, { type: 'error', message: 'unknown message type' })
  }
}
