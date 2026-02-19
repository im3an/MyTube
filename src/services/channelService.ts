/**
 * Canonical channel resolution — single source of truth.
 * All channel identity (handle → UC ID, avatar, name) flows through here.
 * @see docs/MASTER_ARCHITECTURE_REFACTOR.md
 */

import { pipedFetch } from '@/api/pipedClient'

export interface CanonicalChannel {
  id: string
  name: string
  avatar: string | null
  handle?: string
}

/** Canonical UC IDs: ^UC[\w-]{22}$ */
export function isCanonicalChannelId(id: string): boolean {
  return /^UC[\w-]{22}$/.test(id)
}

function extractChannelIdFromUrl(url: string): string {
  if (!url) return ''
  const m = url.match(/\/channel\/([^/?]+)/)
  if (m) return m[1]
  const h = url.match(/\/@([^/?]+)/)
  if (h) return `@${h[1]}`
  return ''
}

interface PipedChannelItem {
  url: string
  type: string
  name: string
  thumbnail: string
}

/** Promise cache: same input returns same in-flight promise. Cache by both handle and UC. */
const identityCache = new Map<string, Promise<CanonicalChannel | null>>()

/**
 * Resolve handle or UC ID to canonical channel identity.
 * Never calls /channel/@handle — always uses search for handles, then /channel/UCxxx.
 */
export async function resolveChannelIdentity(
  input: string
): Promise<CanonicalChannel | null> {
  const key = input.trim()
  if (!key) return null

  const cached = identityCache.get(key)
  if (cached) return cached

  const promise = (async (): Promise<CanonicalChannel | null> => {
    try {
      if (isCanonicalChannelId(key)) {
        const channel = await fetchChannelByUcId(key)
        if (channel) {
          identityCache.set(key, Promise.resolve(channel))
          return channel
        }
        return null
      }

      const ucId = await resolveHandleToUcId(key)
      if (!ucId) return null

      const channel = await fetchChannelByUcId(ucId)
      if (channel) {
        identityCache.set(key, Promise.resolve(channel))
        identityCache.set(ucId, Promise.resolve(channel))
        return channel
      }
      return null
    } catch {
      return null
    }
  })()

  identityCache.set(key, promise)
  return promise
}

async function resolveHandleToUcId(handle: string): Promise<string | null> {
  const clean = handle.replace(/^@/, '')
  const res = await pipedFetch(
    `/search?q=${encodeURIComponent(clean)}&filter=channels`
  )
  if (!res.ok) return null
  const data = await res.json()
  const items: PipedChannelItem[] = Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : []
  const channel = items.find(
    (i) =>
      i.type === 'channel' &&
      i.url?.includes('/channel/') &&
      isCanonicalChannelId(extractChannelIdFromUrl(i.url))
  )
  return channel ? extractChannelIdFromUrl(channel.url) : null
}

async function fetchChannelByUcId(
  ucId: string
): Promise<CanonicalChannel | null> {
  const res = await pipedFetch(`/channel/${encodeURIComponent(ucId)}`)
  if (!res.ok) return null
  const d = await res.json()
  if (!d || (typeof d === 'object' && 'error' in d)) return null
  return {
    id: (d.id as string) ?? ucId,
    name: (d.name as string) ?? '',
    avatar: (d.avatarUrl as string) ?? null,
  }
}
