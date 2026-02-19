import { resolve } from 'path'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import type { Plugin } from 'vite'

/** Known-good fallback instances (official + community). */
const FALLBACK_INSTANCES = [
  'https://api.piped.private.coffee',
  'https://pipedapi.kavin.rocks',
  'https://pipedapi.tokhmi.xyz',
  'https://pipedapi.moomoo.me',
  'https://pipedapi.rivo.lol',
]

const PIPED_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; rv:131.0) Gecko/20100101 Firefox/131.0',
  Accept: 'application/json',
}

/** Registry that returns a JSON array of Piped instances with `api_url` field. */
const INSTANCES_REGISTRY = 'https://piped-instances.kavin.rocks/'

/**
 * Discovers healthy Piped API instances at dev-server startup and re-checks
 * periodically. Proxies /api/piped/* server-side so the browser never hits CORS.
 */
function pipedApiProxy(): Plugin {
  let healthyInstances: string[] = [...FALLBACK_INSTANCES]
  let discovering = false

  /** Fetch the public registry and health-check every instance. */
  async function discoverInstances() {
    if (discovering) return
    discovering = true
    try {
      const res = await fetch(INSTANCES_REGISTRY, { signal: AbortSignal.timeout(8000) })
      if (!res.ok) return

      const list: { api_url: string; uptime_24h?: number }[] = await res.json()
      // Sort by 24h uptime (best first), then probe each
      const candidates = list
        .filter((i) => i.api_url?.startsWith('https://'))
        .sort((a, b) => (b.uptime_24h ?? 0) - (a.uptime_24h ?? 0))
        .map((i) => i.api_url)

      const working: string[] = []
      await Promise.allSettled(
        candidates.map(async (url) => {
          try {
            const r = await fetch(`${url}/trending?region=US`, {
              redirect: 'manual',
              signal: AbortSignal.timeout(6000),
              headers: PIPED_HEADERS,
            })
            if (r.ok) {
              const ct = r.headers.get('content-type') ?? ''
              if (ct.includes('json')) working.push(url)
            }
          } catch { /* skip */ }
        }),
      )

      // Merge: discovered working instances first, then fallbacks (deduplicated)
      const seen = new Set<string>()
      const merged: string[] = []
      for (const url of [...working, ...FALLBACK_INSTANCES]) {
        if (!seen.has(url)) { seen.add(url); merged.push(url) }
      }

      if (merged.length > 0) {
        healthyInstances = merged
        console.log(
          `[piped-proxy] Discovered ${working.length} healthy instance(s): ${working.join(', ') || '(none new)'}`,
        )
      }
    } catch (e) {
      console.warn('[piped-proxy] Instance discovery failed, using fallbacks:', (e as Error).message)
    } finally {
      discovering = false
    }
  }

  return {
    name: 'piped-api-proxy',
    configureServer(server) {
      // Discover instances on startup, then refresh every 10 minutes
      discoverInstances()
      const timer = setInterval(discoverInstances, 10 * 60 * 1000)
      server.httpServer?.on('close', () => clearInterval(timer))

      // Backend API proxy
      const backendPort = process.env.BACKEND_PORT || 4000
      const backendTarget = `http://127.0.0.1:${backendPort}`
      const useBackend = process.env.VITE_USE_BACKEND === '1' || process.env.VITE_USE_BACKEND === 'true'

      // Auth and user-data always proxy to backend (required for sign-in)
      ;['/api/auth', '/api/user-data'].forEach((path) => {
        server.middlewares.use(path, async (req, res) => {
          const target = `${backendTarget}${path}${(req.url as string) || ''}`
          try {
            const protocol = target.startsWith('https') ? await import('https') : await import('http')
            const u = new URL(target)
            const options = {
              hostname: u.hostname,
              port: u.port || (u.protocol === 'https:' ? 443 : 80),
              path: u.pathname + u.search,
              method: req.method,
              headers: req.headers as Record<string, string>,
            }
            const proxyReq = protocol.request(options, (proxyRes) => {
              res.writeHead(proxyRes.statusCode ?? 200, proxyRes.headers as Record<string, string | string[]>)
              proxyRes.pipe(res)
            })
            proxyReq.on('error', () => {
              res.writeHead(502, { 'Content-Type': 'application/json' })
              res.end(JSON.stringify({ error: 'Backend not running. Start with: npm run dev:backend' }))
            })
            req.pipe(proxyReq)
          } catch (e) {
            res.writeHead(502, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ error: (e as Error).message }))
          }
        })
      })

      // Piped/videos proxy (optional, when VITE_USE_BACKEND=1)
      if (useBackend) {
        ;['/api/videos', '/api/search', '/api/trending', '/api/channels', '/api/categories'].forEach((path) => {
          server.middlewares.use(path, async (req, res) => {
            const target = `${backendTarget}${path}${(req.url as string) || ''}`
            try {
              const protocol = target.startsWith('https') ? await import('https') : await import('http')
              const u = new URL(target)
              const options = {
                hostname: u.hostname,
                port: u.port || (u.protocol === 'https:' ? 443 : 80),
                path: u.pathname + u.search,
                method: req.method,
                headers: req.headers as Record<string, string>,
              }
              const proxyReq = protocol.request(options, (proxyRes) => {
                res.writeHead(proxyRes.statusCode ?? 200, proxyRes.headers as Record<string, string | string[]>)
                proxyRes.pipe(res)
              })
              proxyReq.on('error', () => {
                res.writeHead(502, { 'Content-Type': 'application/json' })
                res.end(JSON.stringify({ error: 'Backend not running. Start with: npm run dev:backend' }))
              })
              req.pipe(proxyReq)
            } catch (e) {
              res.writeHead(502, { 'Content-Type': 'application/json' })
              res.end(JSON.stringify({ error: (e as Error).message }))
            }
          })
        })
      }

      // YouTube oEmbed proxy (free, no auth, always works)
      server.middlewares.use('/api/oembed', async (req, res) => {
        const videoId = (req.url || '/').replace(/^\//, '').split('?')[0]
        if (!videoId) {
          res.writeHead(400, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ error: 'Missing video ID' }))
          return
        }
        try {
          const url = `https://www.youtube.com/oembed?url=${encodeURIComponent(`https://www.youtube.com/watch?v=${videoId}`)}&format=json`
          const response = await fetch(url, { signal: AbortSignal.timeout(5000) })
          const contentType = response.headers.get('content-type') || 'application/json'
          const body = Buffer.from(await response.arrayBuffer())
          res.writeHead(response.status, { 'Content-Type': contentType })
          res.end(body)
        } catch {
          res.writeHead(502, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ error: 'oEmbed fetch failed' }))
        }
      })

      // Subtitle proxy (bypass CORS for Piped subtitle URLs)
      server.middlewares.use('/api/subtitles', async (req, res) => {
        const params = new URL(req.url || '/', 'http://x').searchParams
        const target = params.get('url')
        if (!target || (!target.startsWith('http://') && !target.startsWith('https://'))) {
          res.writeHead(400, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ error: 'Invalid subtitle URL' }))
          return
        }
        try {
          const response = await fetch(target, { signal: AbortSignal.timeout(8000) })
          const contentType = response.headers.get('content-type') || 'text/vtt'
          const body = Buffer.from(await response.arrayBuffer())
          res.writeHead(response.status, { 'Content-Type': contentType })
          res.end(body)
        } catch {
          res.writeHead(502, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ error: 'Subtitle fetch failed' }))
        }
      })

      // yt-dlp download proxy (requires: npm run server)
      const ytdlPort = process.env.YTDL_PORT || 3001
      server.middlewares.use('/api/ytdl', async (req, res) => {
        const target = `http://127.0.0.1:${ytdlPort}${req.url || '/'}`
        if (req.method === 'OPTIONS') {
          res.writeHead(204)
          res.end()
          return
        }
        let body = ''
        req.on('data', (chunk) => { body += chunk })
        req.on('end', async () => {
          try {
            const response = await fetch(target, {
              method: req.method || 'GET',
              headers: { 'Content-Type': 'application/json' },
              body: req.method === 'POST' ? body : undefined,
              signal: AbortSignal.timeout(300000),
            })
            const data = Buffer.from(await response.arrayBuffer())
            const ct = response.headers.get('content-type') || 'application/octet-stream'
            res.writeHead(response.status, { 'Content-Type': ct })
            if (response.headers.get('Content-Disposition')) {
              res.setHeader('Content-Disposition', response.headers.get('Content-Disposition')!)
            }
            res.end(data)
          } catch (e) {
            res.writeHead(502, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ error: `yt-dlp server not running. Run: npm run server` }))
          }
        })
      })

      // GNews API proxy (requires GNEWS_API_KEY in env)
      const gnewsKey = process.env.GNEWS_API_KEY || process.env.VITE_GNEWS_API_KEY
      if (gnewsKey) {
        server.middlewares.use('/api/news', async (req, res) => {
          const apiPath = (req.url || '/').replace(/^\//, '')
          const target = `https://gnews.io/api/v4/${apiPath}&apikey=${encodeURIComponent(gnewsKey)}`
          try {
            const response = await fetch(target, { signal: AbortSignal.timeout(10000) })
            const contentType = response.headers.get('content-type') || 'application/json'
            const body = Buffer.from(await response.arrayBuffer())
            res.writeHead(response.status, { 'Content-Type': contentType })
            res.end(body)
          } catch (e) {
            res.writeHead(502, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ error: (e as Error).message }))
          }
        })
      }

      // FreeToGame API proxy (CORS bypass)
      server.middlewares.use('/api/freetogame', async (req, res) => {
        const apiPath = (req.url || '/').replace(/^\//, '')
        const target = `https://www.freetogame.com/api/${apiPath}`
        try {
          const response = await fetch(target, { signal: AbortSignal.timeout(10000) })
          const contentType = response.headers.get('content-type') || 'application/json'
          const body = Buffer.from(await response.arrayBuffer())
          res.writeHead(response.status, { 'Content-Type': contentType })
          res.end(body)
        } catch (e) {
          res.writeHead(502, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ error: (e as Error).message }))
        }
      })

      // Proxy middleware for /api/piped/*
      server.middlewares.use('/api/piped', async (req, res) => {
        const apiPath = req.url || '/'
        let lastErrorBody: Buffer | null = null
        let lastErrorStatus = 502
        let lastErrorContentType = 'application/json'

        for (const instance of healthyInstances) {
          try {
            const response = await fetch(`${instance}${apiPath}`, {
              redirect: 'manual',
              signal: AbortSignal.timeout(10000),
              headers: PIPED_HEADERS,
            })

            // Skip redirects and auth-walled instances
            if (
              (response.status >= 300 && response.status < 400) ||
              response.status === 401 ||
              response.status === 403
            ) {
              continue
            }

            const contentType =
              response.headers.get('content-type') || 'application/json'
            const body = Buffer.from(await response.arrayBuffer())

            // If it returned HTML instead of JSON, this instance is broken (anti-bot page)
            if (contentType.includes('text/html')) continue

            // Success — return immediately
            if (response.ok) {
              res.writeHead(response.status, { 'Content-Type': contentType })
              res.end(body)
              return
            }

            // Server error — save as fallback, try next instance
            lastErrorBody = body
            lastErrorStatus = response.status
            lastErrorContentType = contentType
            if (process.env.DEBUG_PIPED) {
              console.warn('[piped-proxy] Instance failed:', instance, apiPath.slice(0, 80), response.status)
            }
          } catch (e) {
            if (process.env.DEBUG_PIPED) {
              console.warn('[piped-proxy] Instance unreachable:', instance, apiPath.slice(0, 80), (e as Error).message)
            }
          }
        }

        // Return last meaningful error or generic 502
        if (lastErrorBody) {
          res.writeHead(lastErrorStatus, {
            'Content-Type': lastErrorContentType,
          })
          res.end(lastErrorBody)
        } else {
          res.writeHead(502, { 'Content-Type': 'application/json' })
          res.end(
            JSON.stringify({ error: 'All Piped API instances unavailable' }),
          )
        }
      })
    },
  }
}

export default {
  plugins: [react(), tailwindcss(), pipedApiProxy()],
  server: {
    watch: {
      ignored: ['**/tsconfig.tsbuildinfo'],
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
}
