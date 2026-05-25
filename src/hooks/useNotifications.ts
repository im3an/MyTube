/**
 * Notifications hook — tracks new uploads from favorite creators.
 * Fetches channel data from Piped API, rate-limited by per-channel timestamps in localStorage.
 */

import { useEffect, useState, useCallback } from 'react'
import { useUserData } from '@/hooks/useUserData'
import { pipedFetch } from '@/api/pipedClient'

const NOTIFICATIONS_STATE_KEY = 'mytube-notifications-state'
const CHANNEL_CHECK_CACHE_KEY = 'mytube-channel-check-times'
const CACHE_TTL_MS = 30 * 60 * 1000 // 30 minutes
const MAX_CREATORS_PER_FETCH = 5
const MAX_NOTIFICATIONS = 20

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

interface PipedStreamItem {
  url: string
  title: string
  thumbnail: string
  uploaderName: string
  uploaderUrl: string
  uploaded: number
  duration: number
  livestream?: boolean
}

interface PipedChannelResponse {
  relatedStreams?: PipedStreamItem[]
}

function loadNotificationsState(): NotificationsState {
  try {
    const raw = localStorage.getItem(NOTIFICATIONS_STATE_KEY)
    if (raw) return JSON.parse(raw) as NotificationsState
  } catch {}
  return { lastChecked: 0, seen: [] }
}

function saveNotificationsState(state: NotificationsState) {
  localStorage.setItem(NOTIFICATIONS_STATE_KEY, JSON.stringify(state))
}

function loadChannelCheckTimes(): Record<string, number> {
  try {
    const raw = localStorage.getItem(CHANNEL_CHECK_CACHE_KEY)
    if (raw) return JSON.parse(raw) as Record<string, number>
  } catch {}
  return {}
}

function saveChannelCheckTimes(times: Record<string, number>) {
  localStorage.setItem(CHANNEL_CHECK_CACHE_KEY, JSON.stringify(times))
}

function extractVideoId(url: string): string {
  const match = url?.match(/[?&]v=([^&]+)/)
  return match?.[1] ?? ''
}

async function fetchChannelVideos(
  channelId: string,
): Promise<PipedStreamItem[]> {
  const res = await pipedFetch(`/channel/${encodeURIComponent(channelId)}`)
  if (!res.ok) return []
  const data = (await res.json()) as PipedChannelResponse
  if (!data || 'error' in (data as unknown as Record<string, unknown>)) return []
  return data.relatedStreams ?? []
}

export function useNotifications() {
  const { favoriteCreators } = useUserData()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [state, setState] = useState<NotificationsState>(loadNotificationsState)

  useEffect(() => {
    if (favoriteCreators.length === 0) return

    const checkTimes = loadChannelCheckTimes()
    const now = Date.now()

    // Only check creators whose cache has expired
    const staleCreators = favoriteCreators.filter(
      (c) => !checkTimes[c.id] || now - checkTimes[c.id] > CACHE_TTL_MS,
    )

    // Limit to 5 at a time
    const toCheck = staleCreators.slice(0, MAX_CREATORS_PER_FETCH)
    if (toCheck.length === 0) return

    Promise.allSettled(
      toCheck.map(async (creator) => {
        const streams = await fetchChannelVideos(creator.id)
        return { creator, streams }
      }),
    ).then((results) => {
      const newCheckTimes = { ...loadChannelCheckTimes() }

      const newNotifications: Notification[] = []

      for (const result of results) {
        if (result.status === 'rejected') continue

        const { creator, streams } = result.value
        newCheckTimes[creator.id] = now

        for (const stream of streams) {
          if (!stream.url?.includes('/watch')) continue
          const videoId = extractVideoId(stream.url)
          if (!videoId) continue
          // Only include videos published after last check
          const publishedAt = stream.uploaded ?? 0
          if (publishedAt <= 0) continue

          const thumbnailUrl = videoId
            ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`
            : stream.thumbnail

          newNotifications.push({
            videoId,
            title: stream.title,
            thumbnailUrl,
            channelName: creator.name,
            channelId: creator.id,
            publishedAt,
          })
        }
      }

      saveChannelCheckTimes(newCheckTimes)

      if (newNotifications.length === 0) return

      setNotifications((prev) => {
        const existingIds = new Set(prev.map((n) => n.videoId))
        const merged = [
          ...newNotifications.filter((n) => !existingIds.has(n.videoId)),
          ...prev,
        ]
          .sort((a, b) => b.publishedAt - a.publishedAt)
          .slice(0, MAX_NOTIFICATIONS)
        return merged
      })

      // Update lastChecked to now
      setState((prev) => {
        const updated = { ...prev, lastChecked: now }
        saveNotificationsState(updated)
        return updated
      })
    })
  }, [favoriteCreators.map((c) => c.id).join(',')])

  const unreadCount = notifications.filter(
    (n) => !state.seen.includes(n.videoId) && n.publishedAt > state.lastChecked,
  ).length

  const markAllRead = useCallback(() => {
    setState((prev) => {
      const updated: NotificationsState = {
        lastChecked: Date.now(),
        seen: [...new Set([...prev.seen, ...notifications.map((n) => n.videoId)])],
      }
      saveNotificationsState(updated)
      return updated
    })
  }, [notifications])

  const dismiss = useCallback((videoId: string) => {
    setState((prev) => {
      const updated: NotificationsState = {
        ...prev,
        seen: [...new Set([...prev.seen, videoId])],
      }
      saveNotificationsState(updated)
      return updated
    })
    setNotifications((prev) => prev.filter((n) => n.videoId !== videoId))
  }, [])

  const isRead = useCallback(
    (videoId: string) => {
      if (state.seen.includes(videoId)) return true
      const found = notifications.find((n) => n.videoId === videoId)
      return found ? found.publishedAt <= state.lastChecked : false
    },
    [state, notifications],
  )

  return { notifications, unreadCount, markAllRead, dismiss, isRead }
}
