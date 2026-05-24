import { logger } from './utils/logger.js'

const isProd = process.env.NODE_ENV === 'production'

function validateEnv(): void {
  const errors: string[] = []

  if (isProd) {
    const sessionSecret = process.env.SESSION_SECRET
    if (!sessionSecret || sessionSecret.length < 32) {
      errors.push('SESSION_SECRET must be set and at least 32 characters in production')
    }
    if (!process.env.DATABASE_URL) errors.push('DATABASE_URL is required in production')
    if (!process.env.WEBAUTHN_RP_ID) errors.push('WEBAUTHN_RP_ID is required in production')
    if (!process.env.WEBAUTHN_ORIGIN) errors.push('WEBAUTHN_ORIGIN is required in production')
    if (!process.env.CORS_ORIGIN) errors.push('CORS_ORIGIN is required in production')
  }

  if (errors.length > 0) {
    for (const e of errors) logger.error(`[config] ${e}`)
    process.exit(1)
  }

  if (!process.env.GNEWS_API_KEY && !process.env.VITE_GNEWS_API_KEY) {
    logger.warn('[config] GNEWS_API_KEY not set — news features disabled')
  }
  if (!process.env.PIPED_INSTANCES) {
    logger.warn('[config] PIPED_INSTANCES not set — using built-in fallback list')
  }
}

validateEnv()

export const config = {
  port: Number(process.env.PORT) || 4000,
  nodeEnv: process.env.NODE_ENV || 'development',

  database: {
    url: process.env.DATABASE_URL || 'postgresql://localhost:5432/mytube',
    poolSize: Number(process.env.DB_POOL_SIZE) || 10,
  },

  piped: {
    instances: (process.env.PIPED_INSTANCES ||
      'https://pipedapi.kavin.rocks,https://api.piped.private.coffee,https://pipedapi.tokhmi.xyz,https://pipedapi.moomoo.me,https://pipedapi.rivo.lol'
    ).split(',').map((s) => s.trim()),
    timeoutMs: Number(process.env.PIPED_TIMEOUT_MS) || 10_000,
    circuitRetryMs: 5 * 60 * 1000,
  },

  cache: {
    videoTtl: Number(process.env.CACHE_VIDEO_TTL) || 600,
    channelTtl: Number(process.env.CACHE_CHANNEL_TTL) || 600,
    trendingTtl: Number(process.env.CACHE_TRENDING_TTL) || 300,
    searchTtl: Number(process.env.CACHE_SEARCH_TTL) || 300,
  },

  rateLimit: {
    max: Number(process.env.RATE_LIMIT_MAX) || 100,
    timeWindowMs: 60 * 1000,
  },

  cors: {
    origin: process.env.CORS_ORIGIN || '*',
  },

  gnews: {
    apiKey: process.env.GNEWS_API_KEY || process.env.VITE_GNEWS_API_KEY || '',
  },

  auth: {
    rpID: process.env.WEBAUTHN_RP_ID || 'localhost',
    rpName: process.env.WEBAUTHN_RP_NAME || 'MyTube',
    origin: process.env.WEBAUTHN_ORIGIN || 'http://localhost:5173',
    sessionSecret: process.env.SESSION_SECRET || 'mytube-dev-secret-change-in-production-32b',
  },
} as const

function mask(value: string): string {
  if (value.length <= 4) return '***'
  return value.slice(0, 4) + '***'
}

logger.info('[config] Startup config', {
  nodeEnv: config.nodeEnv,
  port: config.port,
  corsOrigin: config.cors.origin,
  dbUrl: mask(config.database.url),
  pipedInstances: config.piped.instances.length,
  gnewsKey: config.gnews.apiKey ? mask(config.gnews.apiKey) : '(none)',
  webauthnRpId: config.auth.rpID,
})

export type Config = typeof config
