/**
 * Entry: Fastify app, CORS, rate limit, security headers, compression, routes.
 */

import { createHash, randomUUID } from 'crypto'
import { createRequire } from 'module'
import Fastify from 'fastify'
import cors from '@fastify/cors'
import rateLimit from '@fastify/rate-limit'
import helmet from '@fastify/helmet'
import compress from '@fastify/compress'
import { config } from './config.js'

const require = createRequire(import.meta.url)
const secureSession = require('@fastify/secure-session')
import { registerRoutes } from './routes/index.js'
import { isAppError, toHttpStatus } from './utils/errors.js'
import { logger } from './utils/logger.js'
import { checkDbConnection } from './db/client.js'

const DEFAULT_SESSION_SECRET = 'mytube-dev-secret-change-in-production-32b'

const WEBAUTHN_PATHS = new Set([
  '/api/auth/register/options',
  '/api/auth/register/verify',
  '/api/auth/login/options',
  '/api/auth/login/verify',
])

async function build() {
  if (config.nodeEnv === 'production') {
    const secret = config.auth.sessionSecret
    if (secret === DEFAULT_SESSION_SECRET || secret.length < 32) {
      logger.error('SESSION_SECRET is insecure. Set a random value of at least 32 characters before starting in production.')
      process.exit(1)
    }
  }

  const app = Fastify({ logger: false, bodyLimit: 524_288, genReqId: () => randomUUID() })

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
      secure: config.nodeEnv === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30, // 30 days
    },
  })

  // Security headers (CSP disabled — Netlify/nginx sets it on the frontend; backend is API-only)
  await app.register(helmet, {
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  })

  // Response compression
  await app.register(compress, {
    threshold: 1024,
    encodings: ['gzip', 'deflate'],
  })

  await app.register(rateLimit, {
    max: config.rateLimit.max,
    timeWindow: config.rateLimit.timeWindowMs,
  })

  app.addHook('onRequest', async (req, reply) => {
    ;(req as typeof req & { startTime: number }).startTime = Date.now()
    const path = req.url.split('?')[0]
    logger.info(`[REQ] ${req.method.toUpperCase()} ${path}`, { requestId: req.id })

    const method = req.method.toUpperCase()
    if (method === 'GET' || method === 'OPTIONS' || method === 'HEAD') return
    if (WEBAUTHN_PATHS.has(path)) return
    if (req.headers['x-requested-with'] !== 'XMLHttpRequest') {
      return reply.status(403).send({ error: 'Forbidden' })
    }
  })

  app.addHook('onSend', async (req, reply) => {
    const start = (req as typeof req & { startTime?: number }).startTime ?? Date.now()
    const duration = Date.now() - start
    logger.info(`[RES] ${reply.statusCode}`, { requestId: req.id, duration: `${duration}ms` })
  })

  app.setErrorHandler((err, req, reply) => {
    const status = toHttpStatus(err)
    if (status >= 500) {
      logger.error('Request error', err, { url: req.url, method: req.method, requestId: req.id })
    }
    const isProd = config.nodeEnv === 'production'
    const body: Record<string, unknown> = {
      error: isAppError(err) ? err.message : 'Internal server error',
    }
    if (status === 404) body.path = req.url.split('?')[0]
    if (!isProd && err instanceof Error && err.stack) body.stack = err.stack
    return reply.status(status).send(body)
  })

  app.get('/health', { config: { rateLimit: false } }, async (_req, reply) => {
    return reply.send({
      status: 'ok',
      version: process.env.npm_package_version || '1.0.0',
      uptime: process.uptime(),
    })
  })

  await registerRoutes(app)

  return app
}

async function main() {
  await checkDbConnection()
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
