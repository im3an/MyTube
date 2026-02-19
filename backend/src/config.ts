/**
 * Environment and constants. No magic values.
 */

export const config = {
  port: Number(process.env.PORT) || 4000,
  nodeEnv: process.env.NODE_ENV || 'development',

  database: {
    url: process.env.DATABASE_URL || 'postgresql://localhost:5432/mytube',
    poolSize: Number(process.env.DB_POOL_SIZE) || 10,
  },

  piped: {
    /** Comma-separated Piped instance URLs; first is primary. Instance rotation on failure. */
    instances: (process.env.PIPED_INSTANCES ||
      'https://pipedapi.kavin.rocks,https://api.piped.private.coffee,https://pipedapi.tokhmi.xyz,https://pipedapi.moomoo.me,https://pipedapi.rivo.lol'
    ).split(',').map((s) => s.trim()),
    timeoutMs: Number(process.env.PIPED_TIMEOUT_MS) || 10_000,
    /** Retry after this many ms when circuit is open. */
    circuitRetryMs: 5 * 60 * 1000,
  },

  cache: {
    /** In-memory TTL seconds. */
    videoTtl: Number(process.env.CACHE_VIDEO_TTL) || 600,      // 10 min
    channelTtl: Number(process.env.CACHE_CHANNEL_TTL) || 600,
    trendingTtl: Number(process.env.CACHE_TRENDING_TTL) || 300,  // 5 min
    searchTtl: Number(process.env.CACHE_SEARCH_TTL) || 300,
  },

  rateLimit: {
    max: Number(process.env.RATE_LIMIT_MAX) || 100,
    timeWindowMs: 60 * 1000, // 1 min
  },

  cors: {
    origin: process.env.CORS_ORIGIN || '*',
  },

  cobalt: {
    base: process.env.COBALT_API_URL || process.env.VITE_COBALT_API_URL || 'https://api.cobalt.tools',
  },

  gnews: {
    apiKey: process.env.GNEWS_API_KEY || process.env.VITE_GNEWS_API_KEY || '',
  },

  auth: {
    /** WebAuthn Relying Party ID. Use 'localhost' for local dev. */
    rpID: process.env.WEBAUTHN_RP_ID || 'localhost',
    /** Human-readable site name for passkey prompts */
    rpName: process.env.WEBAUTHN_RP_NAME || 'MyTube',
    /** Frontend origin for WebAuthn verification (no trailing slash) */
    origin: process.env.WEBAUTHN_ORIGIN || 'http://localhost:5173',
    /** Secret for session encryption (32+ bytes hex) */
    sessionSecret: process.env.SESSION_SECRET || 'mytube-dev-secret-change-in-production-32b',
  },
} as const

export type Config = typeof config
