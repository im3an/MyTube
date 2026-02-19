import { useEffect, useState, useMemo } from 'react'
import { getChannel } from '@/api/youtube'
import { toAppVideo } from '@/api/youtube'
import { useVideosByIds } from '@/hooks/useYouTube'
import type { AppVideo } from '@/hooks/useYouTube'

/**
 * Returns a featured video based on user's watch history:
 * - If user has history, finds the most-watched channel and features a video from that channel
 * - Falls back to first trending video if no history or channel fetch fails
 */
export function useFeaturedFromHistory(
  historyVideoIds: string[],
  trendingVideos: AppVideo[]
): { featured: AppVideo | null; loading: boolean; reason: 'channel' | 'trending' | null } {
  const recentIds = useMemo(() => historyVideoIds.slice(0, 20), [historyVideoIds.join(',')])
  const { videos: historyVideos, loading: historyLoading } = useVideosByIds(recentIds)
  const [channelVideo, setChannelVideo] = useState<AppVideo | null>(null)
  const [channelLoading, setChannelLoading] = useState(false)

  const topChannelId = useMemo(() => {
    const counts = new Map<string, number>()
    historyVideos.forEach((v) => {
      const id = v.channelId
      if (id) counts.set(id, (counts.get(id) ?? 0) + 1)
    })
    const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1])
    return sorted[0]?.[0] ?? null
  }, [historyVideos])

  useEffect(() => {
    if (!topChannelId) {
      setChannelVideo(null)
      setChannelLoading(false)
      return
    }
    let cancelled = false
    setChannelLoading(true)
    getChannel(topChannelId)
      .then((channel) => {
        if (cancelled || !channel?.videos?.length) return
        const first = channel.videos[0]
        if (first) setChannelVideo(toAppVideo(first))
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setChannelLoading(false)
      })
    return () => { cancelled = true }
  }, [topChannelId])

  const featured = channelVideo ?? trendingVideos[0] ?? null
  const reason = channelVideo ? 'channel' : trendingVideos[0] ? 'trending' : null
  const loading = historyLoading || channelLoading

  return { featured, loading, reason }
}
