/**
 * Home feed with 2026-style recommendation ranking for the "All" tab.
 * Fetches trending + search, scores by personalization + intent + engagement,
 * and applies diversity constraints.
 */

import { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import { getTrending, searchVideosPage, toAppVideo } from '@/api/youtube'
import { useUserData } from '@/hooks/useUserData'
import { useVideosByIds } from '@/hooks/useYouTube'
import type { AppVideo } from '@/hooks/useYouTube'
import { rankVideos, getChannelWatchCount } from '@/lib/recommendation'

export function useRecommendedFeed(region = 'US', options?: { enabled?: boolean }) {
  const enabled = options?.enabled ?? true
  const [rawVideos, setRawVideos] = useState<AppVideo[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const nextpageRef = useRef<string | null>(null)
  const trendingExhaustedRef = useRef(false)

  const userData = useUserData()
  const historyIds = useMemo(
    () => userData.history.slice(0, 20).map((h) => h.videoId),
    [userData.history]
  )
  const { videos: historyVideos } = useVideosByIds(historyIds)

  const rankOptions = useMemo(() => {
    const historyChannelMap = new Map<string, string>()
    const videoLengthMap = new Map<string, number>()
    for (const v of historyVideos) {
      historyChannelMap.set(v.id, v.channelId)
      videoLengthMap.set(v.id, v.lengthSeconds ?? 0)
    }
    const channelWatchCount = getChannelWatchCount(userData.history, historyChannelMap)
    return { channelWatchCount, historyChannelMap, videoLengthMap }
  }, [historyVideos, userData.history])

  const videos = useMemo(
    () => rankVideos(rawVideos, userData, rankOptions),
    [rawVideos, userData, rankOptions]
  )

  // Reset & fetch first page when region changes (only when enabled)
  useEffect(() => {
    if (!enabled) return
    nextpageRef.current = null
    trendingExhaustedRef.current = false

    setLoading(true)
    setError(null)

    getTrending(region)
      .then((data) => {
        setRawVideos(data.map(toAppVideo))
      })
      .catch((e) => {
        setError(e.message)
        setRawVideos([])
      })
      .finally(() => setLoading(false))
  }, [region, enabled])

  const loadMore = useCallback(() => {
    if (!enabled || loadingMore) return

    if (!trendingExhaustedRef.current) {
      trendingExhaustedRef.current = true
      setLoadingMore(true)
      searchVideosPage('popular trending new', undefined, region)
        .then(({ videos: vids, nextpage }) => {
          const existingIds = new Set(rawVideos.map((v) => v.id))
          const newVids = vids
            .map(toAppVideo)
            .filter((v) => !existingIds.has(v.id))
          setRawVideos((prev) => [...prev, ...newVids])
          nextpageRef.current = nextpage
        })
        .catch(() => {})
        .finally(() => setLoadingMore(false))
      return
    }

    const np = nextpageRef.current
    if (!np) return

    setLoadingMore(true)
    searchVideosPage('popular trending new', np, region)
      .then(({ videos: vids, nextpage }) => {
        setRawVideos((prev) => {
          const existingIds = new Set(prev.map((v) => v.id))
          const newVids = vids
            .map(toAppVideo)
            .filter((v) => !existingIds.has(v.id))
          return [...prev, ...newVids]
        })
        nextpageRef.current = nextpage
      })
      .catch(() => {})
      .finally(() => setLoadingMore(false))
  }, [enabled, loadingMore, rawVideos, region])

  const hasMore = enabled && (!trendingExhaustedRef.current || !!nextpageRef.current)

  return { videos, loading, loadingMore, hasMore, loadMore, error }
}
