/**
 * Simple logger. No heavy tooling. Can swap to pino later.
 */

const isDev = process.env.NODE_ENV !== 'production'

export const logger = {
  info(msg: string, meta?: Record<string, unknown>) {
    console.log(JSON.stringify({ level: 'info', msg, ...meta, time: new Date().toISOString() }))
  },
  warn(msg: string, meta?: Record<string, unknown>) {
    console.warn(JSON.stringify({ level: 'warn', msg, ...meta, time: new Date().toISOString() }))
  },
  error(msg: string, err?: unknown, meta?: Record<string, unknown>) {
    const errMsg = err instanceof Error ? err.message : String(err)
    console.error(JSON.stringify({ level: 'error', msg, error: errMsg, ...meta, time: new Date().toISOString() }))
  },
  child(bindings: Record<string, unknown>) {
    return {
      info: (m: string, meta?: Record<string, unknown>) => logger.info(m, { ...bindings, ...meta }),
      warn: (m: string, meta?: Record<string, unknown>) => logger.warn(m, { ...bindings, ...meta }),
      error: (m: string, e?: unknown, meta?: Record<string, unknown>) => logger.error(m, e, { ...bindings, ...meta }),
    }
  },
}
