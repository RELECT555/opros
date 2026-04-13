import pino from 'pino'

const isDev = process.env.NODE_ENV !== 'production'
const level = process.env.LOG_LEVEL ?? (isDev ? 'debug' : 'info')

/**
 * Корневой Pino-логер.
 * - dev:  красивый вывод через pino-pretty (время, уровень, модуль)
 * - prod: структурированный JSON — можно скармливать любому агрегатору
 */
export const logger = pino({
  level,
  ...(isDev && {
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'HH:MM:ss',
        ignore: 'pid,hostname',
        messageFormat: '{module} › {msg}',
      },
    },
  }),
})

/** Child-логеры по модулям — добавляют поле `module` в каждую запись */
export const dbLog       = logger.child({ module: 'db' })
export const telegramLog = logger.child({ module: 'telegram' })
export const httpLog     = logger.child({ module: 'http' })
