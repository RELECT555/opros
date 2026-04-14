/**
 * Фронтенд-логер.
 *
 * Уровни (по возрастанию важности): debug < info < warn < error
 * - В dev-сборке (Vite: import.meta.env.DEV) выводятся все уровни.
 * - В prod выводятся только warn и error.
 *
 * Использование:
 *   import { createLogger } from '@/lib/logger'
 *   const log = createLogger('SurveyPage')
 *   log.info('опрос загружен', { slug })
 *   log.error('не удалось отправить', err)
 */

type Level = 'debug' | 'info' | 'warn' | 'error'

interface Logger {
  debug(msg: string, data?: unknown): void
  info(msg: string, data?: unknown): void
  warn(msg: string, data?: unknown): void
  error(msg: string, data?: unknown): void
}

const LEVEL_RANK: Record<Level, number> = {
  debug: 0,
  info:  1,
  warn:  2,
  error: 3,
}

const LEVEL_STYLE: Record<Level, string> = {
  debug: 'color:#6c757d',
  info:  'color:#0d6efd',
  warn:  'color:#fd7e14;font-weight:bold',
  error: 'color:#dc3545;font-weight:bold',
}

const MIN_LEVEL: Level = import.meta.env.DEV ? 'debug' : 'warn'

function log(namespace: string, level: Level, msg: string, data?: unknown) {
  if (LEVEL_RANK[level] < LEVEL_RANK[MIN_LEVEL]) return

  const time = new Date().toTimeString().slice(0, 8)
  const prefix = `%c[${level.toUpperCase()}] %c${namespace} %c${time}`
  const styles = [LEVEL_STYLE[level], 'color:#888', 'color:#aaa']

  if (data !== undefined) {
    console[level === 'debug' ? 'log' : level](prefix, ...styles, '›', msg, data)
  } else {
    console[level === 'debug' ? 'log' : level](prefix, ...styles, '›', msg)
  }
}

/**
 * Создаёт именованный логер для компонента или модуля.
 * @param namespace — имя компонента/модуля, отображается в каждой строке
 */
export function createLogger(namespace: string): Logger {
  return {
    debug: (msg, data) => log(namespace, 'debug', msg, data),
    info:  (msg, data) => log(namespace, 'info',  msg, data),
    warn:  (msg, data) => log(namespace, 'warn',  msg, data),
    error: (msg, data) => log(namespace, 'error', msg, data),
  }
}

/** Корневой логер без namespace — для быстрого использования */
export const logger = createLogger('app')
