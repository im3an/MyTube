import { useCallback, useEffect, useState } from 'react'
import { getChannel } from '@/api/youtube'
import type { InvidiousVideo } from '@/api/youtube'
import type { FavoriteCreator } from '@/hooks/useUserData'

export interface SubFeedVideo extends InvidiousVideo {
  channelName: string
  channelId: string
}

interface CacheEntry {
  videos: SubFeedVideo[]
  expiresAt: number
}

const CACHE_KEY = 'sub-feed'
const TTL_MS = 10 * 60 * 1000
const MAX_CREATORS = 5
const VIDEOS_PER_CREATOR = 12

function readCache(): SubFeedVideo[] | null {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const entry = JSON.parse(raw) as CacheEntry
    if (Date.now() > entry.expiresAt) {
      sessionStorage.removeItem(CACHE_KEY)
      return null
    }
    return entry.videos
  } catch {
    return null
  }
}

function writeCache(videos: SubFeedVideo[]): void {
  try {
    const entry: CacheEntry = { videos, expiresAt: Date.now() + TTL_MS }
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(entry))
  } catch {}
}

export function useSubscriptionFeed(creators: FavoriteCreator[]): {
  videos: SubFeedVideo[]
  loading: boolean
  error: string | null
  refresh: () => void
} {
  const [videos, setVideos] = useState<SubFeedVideo[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const creatorIds = creators.map((c) => c.id).join(',')

  const fetchFeed = useCallback(
    async (bust: boolean) => {
      const limited = creators.slice(0, MAX_CREATORS)
      if (limited.length === 0) {
        setVideos([])
        setLoading(false)
        return
      }

      if (!bust) {
        const cached = readCache()
        if (cached) {
          setVideos(cached)
          setLoading(false)
          return
        }
      }

      setLoading(true)
      setError(null)

      const results = await Promise.allSettled(
        limited.map((creator) => getChannel(creator.id)),
      )

      const allVideos: SubFeedVideo[] = []
      results.forEach((result, i) => {
        if (result.status !== 'fulfilled' || !result.value) return
        const channel = result.value
        const creator = limited[i]
        const channelName = channel.name || creator.name
        const channelId = channel.id || creator.id

        channel.videos.slice(0, VIDEOS_PER_CREATOR).forEach((v: InvidiousVideo) => {
          if (!v.videoId) return
          allVideos.push({ ...v, channelName, channelId })
        })
      })

      const sorted = allVideos.sort((a, b) => (b.published ?? 0) - (a.published ?? 0))

      writeCache(sorted)
      setVideos(sorted)
      setLoading(false)
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [creatorIds],
  )

  useEffect(() => {
    fetchFeed(false).catch((e: unknown) => {
      setError(e instanceof Error ? e.message : 'Failed to load feed')
      setLoading(false)
    })
  }, [fetchFeed])

  const refresh = useCallback(() => {
    sessionStorage.removeItem(CACHE_KEY)
    fetchFeed(true).catch((e: unknown) => {
      setError(e instanceof Error ? e.message : 'Failed to load feed')
      setLoading(false)
    })
  }, [fetchFeed])

  return { videos, loading, error, refresh }
}
