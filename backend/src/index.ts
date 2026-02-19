/**
 * Entry: Fastify app, CORS, rate limit, error handler, routes.
 */

import { createHash } from 'crypto'
import { createRequire } from 'module'
import Fastify from 'fastify'
import cors from '@fastify/cors'
import rateLimit from '@fastify/rate-limit'
import { config } from './config.js'

const require = createRequire(import.meta.url)
const secureSession = require('@fastify/secure-session')
import { registerRoutes } from './routes/index.js'
import { isAppError, toHttpStatus } from './utils/errors.js'
import { logger } from './utils/logger.js'

async function build() {
  const app = Fastify({ logger: false })

  const sessionKey = createHash('sha256').update(config.auth.sessionSecret).digest()

  await app.register(cors, {
    origin: config.cors.origin,
    credentials: true,
  })

  await app.register(secureSession, {
    key: sessionKey,
    cookieName: 'mytube_session',
    cookie: {
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30, // 30 days
    },
  })

  await app.register(rateLimit, {
    max: config.rateLimit.max,
    timeWindow: config.rateLimit.timeWindowMs,
  })

  app.setErrorHandler((err, req, reply) => {
    const status = toHttpStatus(err)
    if (status >= 500) {
      logger.error('Request error', err, { url: req.url, method: req.method })
    }
    return reply.status(status).send({
      error: isAppError(err) ? err.message : 'Internal server error',
    })
  })

  await registerRoutes(app)

  return app
}

async function main() {
  const app = await build()
  try {
    await app.listen({ port: config.port, host: '0.0.0.0' })
    logger.info('Server listening', { port: config.port, env: config.nodeEnv })
  } catch (e) {
    logger.error('Failed to start', e)
    process.exit(1)
  }
}

main()
