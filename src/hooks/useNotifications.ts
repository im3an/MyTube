import { useCallback, useEffect, useRef, useState } from 'react'
import { useUserData } from '@/hooks/useUserData'
import { pipedFetch } from '@/api/pipedClient'

export interface Notification {
  videoId: string
  title: string
  thumbnailUrl: string
  channelName: string
  channelId: string
  publishedAt: number
}

interface NotificationsState {
  lastChecked: number
  seen: string[]
}

interface ChannelCache {
  fetchedAt: number
}

const STATE_KEY = 'mytube-notifications-state'
const CHANNEL_CACHE_KEY = 'mytube-notifications-channel-cache'
const STALE_MS = 30 * 60 * 1000 // 30 minutes
const MAX_CREATORS = 5
const MAX_NOTIFICATIONS = 20

function loadState(): NotificationsState {
  try {
    const raw = localStorage.getItem(STATE_KEY)
    if (raw) return JSON.parse(raw) as NotificationsState
  } catch {}
  return { lastChecked: Date.now(), seen: [] }
}

function saveState(state: NotificationsState) {
  localStorage.setItem(STATE_KEY, JSON.stringify(state))
}

function loadChannelCache(): Record<string, ChannelCache> {
  try {
    const raw = localStorage.getItem(CHANNEL_CACHE_KEY)
    if (raw) return JSON.parse(raw) as Record<string, ChannelCache>
  } catch {}
  return {}
}

function saveChannelCache(cache: Record<string, ChannelCache>) {
  localStorage.setItem(CHANNEL_CACHE_KEY, JSON.stringify(cache))
}

interface PipedStreamItem {
  url: string
  title: string
  thumbnail: string
  uploaderName: string
  uploaded: number
}

function extractVideoId(url: string): string {
  const match = url?.match(/[?&]v=([^&]+)/)
  return match?.[1] ?? ''
}

async function fetchChannelVideos(channelId: string): Promise<Notification[]> {
  const res = await pipedFetch(`/channel/${encodeURIComponent(channelId)}`)
  if (!res.ok) throw new Error(`Channel fetch failed: ${res.status}`)
  const data = (await res.json()) as Record<string, unknown>
  if (!data || 'error' in data) throw new Error('Channel API error')

  const streams = (data.relatedStreams as PipedStreamItem[] | undefined) ?? []
  return streams
    .filter((s) => s.url?.includes('/watch'))
    .map((s) => {
      const videoId = extractVideoId(s.url)
      return {
        videoId,
        title: s.title ?? '',
        thumbnailUrl: s.thumbnail ?? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
        channelName: s.uploaderName ?? '',
        channelId,
        publishedAt: s.uploaded ? Math.floor(s.uploaded / 1000) : 0,
      }
    })
    .filter((n) => n.videoId)
}

export function useNotifications() {
  const { favoriteCreators } = useUserData()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [state, setState] = useState<NotificationsState>(loadState)
  const fetchingRef = useRef(false)

  const unreadCount = notifications.filter((n) => !state.seen.includes(n.videoId)).length

  const fetchNotifications = useCallback(async (creators: typeof favoriteCreators) => {
    if (fetchingRef.current || creators.length === 0) return
    fetchingRef.current = true

    try {
      const channelCache = loadChannelCache()
      const now = Date.now()
      const currentState = loadState()

      const staleCreators = creators.slice(0, MAX_CREATORS).filter((c) => {
        const cached = channelCache[c.id]
        return !cached || now - cached.fetchedAt > STALE_MS
      })

      if (staleCreators.length === 0) return

      const results = await Promise.allSettled(
        staleCreators.map((c) => fetchChannelVideos(c.id))
      )

      const freshNotifications: Notification[] = []

      results.forEach((result, idx) => {
        const channelId = staleCreators[idx].id
        if (result.status === 'fulfilled') {
          channelCache[channelId] = { fetchedAt: now }
          freshNotifications.push(...result.value)
        }
      })

      saveChannelCache(channelCache)

      const newNotifs = freshNotifications
        .filter((n) => n.publishedAt > 0 && n.publishedAt * 1000 > currentState.lastChecked)
        .sort((a, b) => b.publishedAt - a.publishedAt)

      if (newNotifs.length === 0) return

      setNotifications((prev) => {
        const merged = [...newNotifs, ...prev]
        const seen = new Set<string>()
        return merged
          .filter((n) => {
            if (seen.has(n.videoId)) return false
            seen.add(n.videoId)
            return true
          })
          .sort((a, b) => b.publishedAt - a.publishedAt)
          .slice(0, MAX_NOTIFICATIONS)
      })
    } finally {
      fetchingRef.current = false
    }
  }, [])

  useEffect(() => {
    if (favoriteCreators.length > 0) {
      void fetchNotifications(favoriteCreators)
    }
  }, [favoriteCreators, fetchNotifications])

  const markAllRead = useCallback(() => {
    const allIds = notifications.map((n) => n.videoId)
    setState((prev) => {
      const newState: NotificationsState = {
        ...prev,
        lastChecked: Date.now(),
        seen: [...new Set([...prev.seen, ...allIds])],
      }
      saveState(newState)
      return newState
    })
  }, [notifications])

  const dismiss = useCallback((videoId: string) => {
    setNotifications((prev) => prev.filter((n) => n.videoId !== videoId))
    setState((prev) => {
      const newState: NotificationsState = {
        ...prev,
        seen: [...new Set([...prev.seen, videoId])],
      }
      saveState(newState)
      return newState
    })
  }, [])

  const clearAll = useCallback(() => {
    setState((prev) => {
      const allIds = notifications.map((n) => n.videoId)
      const newState: NotificationsState = {
        lastChecked: Date.now(),
        seen: [...new Set([...prev.seen, ...allIds])],
      }
      saveState(newState)
      return newState
    })
    setNotifications([])
  }, [notifications])

  const isRead = useCallback((videoId: string) => state.seen.includes(videoId), [state.seen])

  return {
    notifications,
    unreadCount,
    markAllRead,
    dismiss,
    clearAll,
    isRead,
  }
}
