import { useCallback, useEffect, useRef, useState } from 'react'
import { getChannel } from '@/api/youtube'
import type { InvidiousVideo } from '@/api/youtube'
import type { FavoriteCreator } from '@/hooks/useUserData'

export interface FeedVideo extends InvidiousVideo {
  channelName: string
  channelId: string
}

const MAX_CREATORS = 5
const VIDEOS_PER_CREATOR = 12
const CACHE_TTL_MS = 10 * 60 * 1000

interface CacheEntry {
  videos: FeedVideo[]
  ts: number
}

function cacheKey(creatorIds: string[]): string {
  return `sub-feed-${creatorIds.slice(0, MAX_CREATORS).sort().join(',')}`
}

function readCache(key: string): FeedVideo[] | null {
  try {
    const raw = sessionStorage.getItem(key)
    if (!raw) return null
    const entry = JSON.parse(raw) as CacheEntry
    if (Date.now() - entry.ts > CACHE_TTL_MS) return null
    return entry.videos
  } catch {
    return null
  }
}

function writeCache(key: string, videos: FeedVideo[]): void {
  try {
    const entry: CacheEntry = { videos, ts: Date.now() }
    sessionStorage.setItem(key, JSON.stringify(entry))
  } catch {}
}

export function useSubscriptionFeed(creators: FavoriteCreator[]): {
  videos: FeedVideo[]
  loading: boolean
  error: string | null
  refresh: () => void
} {
  const [videos, setVideos] = useState<FeedVideo[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const refreshCountRef = useRef(0)

  const fetch = useCallback(
    async (signal: AbortController, bust = false) => {
      const top = creators.slice(0, MAX_CREATORS)
      if (top.length === 0) {
        setVideos([])
        setLoading(false)
        return
      }

      const key = cacheKey(top.map((c) => c.id))
      if (!bust) {
        const cached = readCache(key)
        if (cached) {
          setVideos(cached)
          setLoading(false)
          return
        }
      }

      setLoading(true)
      setError(null)

      const results = await Promise.allSettled(
        top.map((creator) =>
          getChannel(creator.id).then((ch): FeedVideo[] => {
            if (!ch) return []
            return ch.videos.slice(0, VIDEOS_PER_CREATOR).map((v) => ({
              ...v,
              channelName: creator.name,
              channelId: creator.id,
            }))
          })
        )
      )

      if (signal.signal.aborted) return

      const combined: FeedVideo[] = []
      let anyError = false
      for (const r of results) {
        if (r.status === 'fulfilled') {
          combined.push(...r.value)
        } else {
          anyError = true
        }
      }

      combined.sort((a, b) => (b.published ?? 0) - (a.published ?? 0))

      writeCache(key, combined)
      setVideos(combined)
      setError(anyError && combined.length === 0 ? 'Failed to load feed' : null)
      setLoading(false)
    },
    [creators.map((c) => c.id).join(',')]
  )

  useEffect(() => {
    const ctrl = new AbortController()
    setLoading(true)
    fetch(ctrl)
    return () => ctrl.abort()
  }, [fetch])

  const refresh = useCallback(() => {
    refreshCountRef.current += 1
    const ctrl = new AbortController()
    fetch(ctrl, true)
  }, [fetch])

  return { videos, loading, error, refresh }
}
