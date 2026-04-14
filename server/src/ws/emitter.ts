/**
 * Высокоуровневый API для отправки событий подписчикам.
 * Используется из HTTP-роутов после мутаций данных.
 */
import { broadcast } from './connections.js'
import type {
  ResponseNewPayload,
  ResponseStatusPayload,
  SurveyUpdatedPayload,
  SurveyCreatedPayload,
} from '../types/ws.js'

export function emitResponseNew(payload: ResponseNewPayload): void {
  broadcast('admin', {
    type: 'event',
    event: 'response:new',
    data: payload,
  })
  if (payload.survey_id != null) {
    broadcast(`survey:${payload.survey_id}`, {
      type: 'event',
      event: 'response:new',
      data: payload,
    })
  }
}

export function emitResponseStatus(payload: ResponseStatusPayload): void {
  broadcast('admin', {
    type: 'event',
    event: 'response:status',
    data: payload,
  })
}

export function emitSurveyUpdated(payload: SurveyUpdatedPayload): void {
  broadcast('admin', {
    type: 'event',
    event: 'survey:updated',
    data: payload,
  })
}

export function emitSurveyCreated(payload: SurveyCreatedPayload): void {
  broadcast('admin', {
    type: 'event',
    event: 'survey:created',
    data: payload,
  })
}
