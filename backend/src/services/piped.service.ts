/**
 * Piped API client. Circuit breaker on repeated failures.
 */

import { config } from '../config.js'
import { logger } from '../utils/logger.js'

const PIPED_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; rv:131.0) Gecko/20100101 Firefox/131.0',
  Accept: 'application/json',
}

let circuitOpen = false
let circuitOpenSince = 0

function shouldTry(): boolean {
  if (!circuitOpen) return true
  if (Date.now() - circuitOpenSince > config.piped.circuitRetryMs) {
    circuitOpen = false
    return true
  }
  return false
}

function markDown(): void {
  circuitOpen = true
  circuitOpenSince = Date.now()
  logger.warn('Piped circuit open', { retryMs: config.piped.circuitRetryMs })
}

async function fetchFromInstance(
  instance: string,
  path: string,
  signal?: AbortSignal
): Promise<Response> {
  const url = `${instance.replace(/\/$/, '')}${path.startsWith('/') ? path : `/${path}`}`
  const res = await fetch(url, {
    redirect: 'manual',
    signal: signal ?? AbortSignal.timeout(config.piped.timeoutMs),
    headers: PIPED_HEADERS,
  })
  if (res.status >= 300 && res.status < 400) return res
  if (res.status === 401 || res.status === 403) return res
  const ct = res.headers.get('content-type') ?? ''
  if (ct.includes('text/html')) {
    throw new Error('Instance returned HTML')
  }
  return res
}

export async function pipedFetch<T>(
  path: string,
  signal?: AbortSignal
): Promise<T | null> {
  if (!shouldTry()) return null

  for (const instance of config.piped.instances) {
    try {
      const res = await fetchFromInstance(instance, path, signal)
      if (res.ok) {
        const data = (await res.json()) as T
        return data
      }
    } catch (e) {
      logger.warn('Piped request failed', { instance, path: path.slice(0, 60), error: (e as Error).message })
    }
  }

  markDown()
  return null
}

export async function getStreams(videoId: string): Promise<Record<string, unknown> | null> {
  return pipedFetch<Record<string, unknown>>(`/streams/${videoId}`)
}

export async function getTrending(region: string): Promise<unknown[] | null> {
  const data = await pipedFetch<unknown[]>(`/trending?region=${encodeURIComponent(region)}`)
  return Array.isArray(data) ? data : null
}

export async function search(
  q: string,
  filter: 'videos' | 'channels',
  nextpage?: string
): Promise<{ items: unknown[]; nextpage?: string | null } | null> {
  const path = nextpage
    ? `/nextpage/search?q=${encodeURIComponent(q)}&filter=${filter}&nextpage=${encodeURIComponent(nextpage)}`
    : `/search?q=${encodeURIComponent(q)}&filter=${filter}`
  const data = await pipedFetch<{ items?: unknown[]; nextpage?: string | null }>(path)
  if (!data) return null
  return {
    items: Array.isArray(data.items) ? data.items : [],
    nextpage: data.nextpage ?? null,
  }
}

function isCanonicalChannelId(id: string): boolean {
  return /^UC[\w-]{22}$/.test(id)
}

function extractChannelId(url: string): string {
  if (!url) return ''
  const m = url.match(/\/channel\/([^/?]+)/)
  return m ? m[1] : ''
}

/**
 * Resolve @handle to UC channel ID via search. /channel/@handle and /user/ are unreliable.
 */
export async function resolveHandleToChannelId(handle: string): Promise<string | null> {
  const cleanHandle = handle.replace(/^@/, '')
  const result = await search(cleanHandle, 'channels')
  if (!result?.items?.length) return null
  for (const item of result.items as Array<{ type?: string; url?: string }>) {
    if (item.type === 'channel' && item.url) {
      const id = extractChannelId(item.url)
      if (isCanonicalChannelId(id)) return id
    }
  }
  return null
}

export async function getChannel(channelId: string): Promise<Record<string, unknown> | null> {
  let ucId = channelId
  if (!isCanonicalChannelId(channelId)) {
    const resolved = await resolveHandleToChannelId(channelId)
    if (!resolved) return null
    ucId = resolved
  }
  return pipedFetch<Record<string, unknown>>(`/channel/${encodeURIComponent(ucId)}`)
}
