import assert from 'node:assert/strict'
import { EventEmitter } from 'node:events'
import { test } from 'node:test'
import type { WebSocket } from 'ws'

process.env.NODE_ENV = 'production'
process.env.DATABASE_URL = 'postgresql://test:test@127.0.0.1:1/test'
const { buildApp } = await import('../src/app.js')
const { handleConnection, setWsJwtVerifier } = await import('../src/ws/handler.js')
const { emitResponseNew } = await import('../src/ws/emitter.js')
const { db } = await import('../src/db/client.js')

class Socket extends EventEmitter {
  readyState = 1
  messages: Record<string, unknown>[] = []
  send(value: string) { this.messages.push(JSON.parse(value)) }
  message(value: unknown) { this.emit('message', Buffer.from(JSON.stringify(value))) }
}

test('production refuses a missing or weak JWT secret', async () => {
  for (const secret of ['', 'short']) {
    process.env.JWT_SECRET = secret
    await assert.rejects(buildApp(), /JWT secret/)
  }
})

test('anonymous survey subscriptions never receive respondent details', () => {
  const socket = new Socket()
  handleConnection(socket as unknown as WebSocket)
  socket.message({ type: 'subscribe', channel: 'survey:1' })
  emitResponseNew({ id: 1, survey_id: 1, name: 'TEST ONLY', phone: '00000', created_at: '' })
  assert.equal(socket.messages.some(message => message.type === 'event'), false)
  assert.equal(socket.messages[0].type, 'error')
  socket.emit('close')
})

test('malformed messages do not throw from the socket callback', () => {
  const socket = new Socket()
  handleConnection(socket as unknown as WebSocket)
  for (const message of [null, [], 42, {}, { type: 'auth' }, { type: 'subscribe' }]) {
    assert.doesNotThrow(() => socket.message(message))
  }
  assert.equal(socket.messages.length, 6)
  socket.emit('close')
})

test('authenticated admin still receives survey events', () => {
  const socket = new Socket()
  setWsJwtVerifier(token => token === 'test-admin')
  handleConnection(socket as unknown as WebSocket)
  socket.message({ type: 'auth', token: 'test-admin' })
  socket.message({ type: 'subscribe', channel: 'survey:1' })
  emitResponseNew({ id: 1, survey_id: 1, name: 'TEST ONLY', phone: '00000', created_at: '' })
  assert.equal(socket.messages.some(message => message.event === 'response:new'), true)
  socket.emit('close')
})

test.after(async () => { await db.end() })
