/**
 * Proxy routes: Piped, oEmbed, subtitles, GNews, FreeToGame.
 * Mirrors Vite dev server proxies for production.
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { config } from '../config.js'

const PIPED_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; rv:131.0) Gecko/20100101 Firefox/131.0',
  Accept: 'application/json',
}

const FALLBACK_INSTANCES = [
  'https://api.piped.private.coffee',
  'https://pipedapi.kavin.rocks',
  'https://pipedapi.tokhmi.xyz',
  'https://pipedapi.moomoo.me',
  'https://pipedapi.rivo.lol',
]

async function proxyPiped(path: string): Promise<{ status: number; body: Buffer; contentType: string }> {
  const instances = config.piped.instances.length > 0 ? config.piped.instances : FALLBACK_INSTANCES
  let lastError: { status: number; body: Buffer; contentType: string } | null = null

  for (const base of instances) {
    try {
      const url = `${base.replace(/\/$/, '')}${path}`
      const res = await fetch(url, {
        redirect: 'manual',
        signal: AbortSignal.timeout(config.piped.timeoutMs),
        headers: PIPED_HEADERS,
      })

      if (res.status >= 300 && res.status < 400) continue
      if (res.status === 401 || res.status === 403) continue

      const contentType = res.headers.get('content-type') || 'application/json'
      const body = Buffer.from(await res.arrayBuffer())

      if (contentType.includes('text/html')) continue

      if (res.ok) return { status: res.status, body, contentType }
      lastError = { status: res.status, body, contentType }
    } catch {
      // try next instance
    }
  }

  if (lastError) return lastError
  return {
    status: 502,
    body: Buffer.from(JSON.stringify({ error: 'All Piped API instances unavailable' })),
    contentType: 'application/json',
  }
}

export async function proxyRoutes(app: FastifyInstance) {
  // Piped: /api/piped/*
  app.get('/piped/*', async (req: FastifyRequest<{ Params: { '*': string } }>, reply: FastifyReply) => {
    const splat = req.params['*'] ?? ''
    const path = splat ? `/${splat}` : '/'
    const qs = req.url.split('?')[1]
    const fullPath = qs ? `${path}?${qs}` : path
    const { status, body, contentType } = await proxyPiped(fullPath)
    return reply.status(status).header('Content-Type', contentType).send(body)
  })

  // oEmbed: /api/oembed/:videoId
  app.get('/oembed/:videoId', async (req: FastifyRequest<{ Params: { videoId: string } }>, reply: FastifyReply) => {
    const videoId = req.params.videoId
    if (!videoId) {
      return reply.status(400).send({ error: 'Missing video ID' })
    }
    try {
      const url = `https://www.youtube.com/oembed?url=${encodeURIComponent(`https://www.youtube.com/watch?v=${videoId}`)}&format=json`
      const res = await fetch(url, { signal: AbortSignal.timeout(5000) })
      const contentType = res.headers.get('content-type') || 'application/json'
      const body = Buffer.from(await res.arrayBuffer())
      if (res.ok) {
        return reply.status(res.status).header('Content-Type', contentType).send(body)
      }
      // YouTube returned error (500, 429, etc.) — return minimal stub so frontend can still render
      const stub = {
        title: 'Video',
        author_name: 'Unknown',
        author_url: `https://www.youtube.com/watch?v=${videoId}`,
        thumbnail_url: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
      }
      return reply.status(200).header('Content-Type', 'application/json').send(JSON.stringify(stub))
    } catch {
      const stub = {
        title: 'Video',
        author_name: 'Unknown',
        author_url: `https://www.youtube.com/watch?v=${videoId}`,
        thumbnail_url: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
      }
      return reply.status(200).header('Content-Type', 'application/json').send(JSON.stringify(stub))
    }
  })

  // Subtitles: /api/subtitles?url=...
  app.get('/subtitles', async (req: FastifyRequest<{ Querystring: { url?: string } }>, reply: FastifyReply) => {
    const target = req.query.url
    if (!target || (!target.startsWith('http://') && !target.startsWith('https://'))) {
      return reply.status(400).send({ error: 'Invalid subtitle URL' })
    }
    try {
      const res = await fetch(target, { signal: AbortSignal.timeout(8000) })
      const contentType = res.headers.get('content-type') || 'text/vtt'
      const body = Buffer.from(await res.arrayBuffer())
      return reply.status(res.status).header('Content-Type', contentType).send(body)
    } catch {
      return reply.status(502).send({ error: 'Subtitle fetch failed' })
    }
  })

  // GNews: /api/news/* (optional, requires GNEWS_API_KEY)
  const gnewsKey = config.gnews.apiKey
  app.get('/news/*', async (req: FastifyRequest<{ Params: { '*': string } }>, reply: FastifyReply) => {
    if (!gnewsKey) {
      return reply.status(200).header('Content-Type', 'application/json').send({ articles: [] })
    }
    const splat = req.params['*'] ?? ''
    const apiPath = splat ? splat : ''
    const qs = req.url.split('?')[1] ?? ''
    const target = `https://gnews.io/api/v4/${apiPath}?${qs ? qs + '&' : ''}apikey=${encodeURIComponent(gnewsKey)}`
    try {
      const res = await fetch(target, { signal: AbortSignal.timeout(10000) })
      const contentType = res.headers.get('content-type') || 'application/json'
      const body = Buffer.from(await res.arrayBuffer())
      return reply.status(res.status).header('Content-Type', contentType).send(body)
    } catch (e) {
      return reply.status(502).send({ error: (e as Error).message })
    }
  })

  // FreeToGame: /api/freetogame/*
  app.get('/freetogame/*', async (req: FastifyRequest<{ Params: { '*': string } }>, reply: FastifyReply) => {
    const splat = req.params['*'] ?? ''
    const apiPath = splat ? splat : ''
    const qs = req.url.split('?')[1]
    const query = qs ? `?${qs}` : ''
    try {
      const target = `https://www.freetogame.com/api/${apiPath}${query}`
      const res = await fetch(target, { signal: AbortSignal.timeout(10000) })
      const contentType = res.headers.get('content-type') || 'application/json'
      const body = Buffer.from(await res.arrayBuffer())
      return reply.status(res.status).header('Content-Type', contentType).send(body)
    } catch (e) {
      return reply.status(502).send({ error: (e as Error).message })
    }
  })
}
