import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { VideoCard } from '@/components/video/VideoCard'
import { Avatar } from '@/components/base/avatar/avatar'
import { Button } from '@/components/base/buttons/button'
import { useChannel } from '@/hooks/useYouTube'
import { useResolvedChannelId } from '@/hooks/useResolvedChannelId'
import { useUserData } from '@/hooks/useUserData'
import { formatViews, isCanonicalChannelId } from '@/api/youtube'
import {
  CheckVerified01,
  Heart,
  HeartRounded,
  Play,
  VideoRecorder,
  InfoCircle,
} from '@untitledui/icons'

type Tab = 'videos' | 'about'

function LoadingSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-32 w-full rounded-2xl bg-gray-100 dark:bg-gray-800/50 sm:h-44 lg:h-56" />
      <div className="flex items-center gap-4 px-2">
        <div className="size-16 rounded-full bg-gray-100 dark:bg-gray-800/50 sm:size-20" />
        <div className="flex-1 space-y-2">
          <div className="h-5 w-40 rounded-lg bg-gray-100 dark:bg-gray-800/50" />
          <div className="h-3 w-24 rounded-lg bg-gray-100 dark:bg-gray-800/50" />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {[...Array(8)].map((_, i) => (
          <div key={i}>
            <div className="aspect-video rounded-2xl bg-gray-100 dark:bg-gray-800/50" />
            <div className="mt-3 space-y-2">
              <div className="h-4 w-3/4 rounded-lg bg-gray-100 dark:bg-gray-800/50" />
              <div className="h-3 w-1/2 rounded-lg bg-gray-100 dark:bg-gray-800/50" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function ChannelPage() {
  const { id } = useParams<{ id: string }>()
  const channelId = id ?? ''
  const navigate = useNavigate()
  const { resolvedId, error: resolveError, isLoading: isResolving } =
    useResolvedChannelId(channelId)

  // Resolve @handle → UC before fetching. Prevents blank page + double-fetch.
  const effectiveChannelId = isCanonicalChannelId(channelId)
    ? channelId
    : resolvedId

  const { channel, videos, loading, loadingMore, hasMore, loadMore, error } =
    useChannel(effectiveChannelId)
  const { toggleFavoriteCreator, isFavoriteCreator } = useUserData()

  const displayError = error || resolveError

  // Redirect @handle URL to canonical UC URL once resolved
  useEffect(() => {
    if (
      channelId &&
      !isCanonicalChannelId(channelId) &&
      resolvedId &&
      resolvedId !== channelId
    ) {
      navigate(`/channel/${resolvedId}`, { replace: true })
    }
  }, [channelId, resolvedId, navigate])
  const [activeTab, setActiveTab] = useState<Tab>('videos')

  // ----- Infinite scroll sentinel -----
  const sentinelRef = useRef<HTMLDivElement>(null)
  const loadMoreRef = useRef(loadMore)
  loadMoreRef.current = loadMore

  const handleIntersect = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      if (entries[0]?.isIntersecting) loadMoreRef.current()
    },
    [],
  )

  useEffect(() => {
    const el = sentinelRef.current
    if (!el || !hasMore || activeTab !== 'videos') return
    const observer = new IntersectionObserver(handleIntersect, {
      rootMargin: '400px',
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [handleIntersect, hasMore, videos.length, activeTab])

  // Scroll to top on channel change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
    setActiveTab('videos')
  }, [channelId])

  // ─── Loading: handle resolution or channel fetch ─────────────────
  if (loading || isResolving) {
    return <LoadingSkeleton />
  }

  // ─── Error state (never return null) ────────────────────────────
  if (displayError) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="mb-4 flex size-16 items-center justify-center rounded-2xl bg-gray-100 dark:bg-gray-800">
          <InfoCircle className="size-7 text-gray-400" />
        </div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          Channel not found
        </h2>
        <p className="mt-1 text-sm text-gray-400 dark:text-gray-500">
          {displayError}
        </p>
      </div>
    )
  }

  // No channel (e.g. not found) — skeleton (never blank)
  if (!channel) {
    return <LoadingSkeleton />
  }

  // ─── Main render ──────────────────────
  const tabs: { id: Tab; label: string; icon: typeof Play }[] = [
    { id: 'videos', label: 'Videos', icon: VideoRecorder },
    { id: 'about', label: 'About', icon: InfoCircle },
  ]

  return (
    <div className="space-y-6">
      {/* ─── Banner ─── */}
      {channel.bannerUrl ? (
        <motion.div
          className="relative h-32 w-full overflow-hidden rounded-2xl sm:h-44 lg:h-56"
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
        >
          <img
            src={channel.bannerUrl}
            alt=""
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
        </motion.div>
      ) : (
        <div className="h-32 w-full rounded-2xl bg-gradient-to-r from-gray-200 to-gray-100 dark:from-gray-800 dark:to-gray-900 sm:h-44 lg:h-56" />
      )}

      {/* ─── Channel info row ─── */}
      <motion.div
        className="flex flex-col gap-4 px-2 sm:flex-row sm:items-center"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
      >
        <Avatar
          src={channel.avatarUrl}
          alt={channel.name}
          size="xl"
          verified={channel.verified}
          className="size-16 shrink-0 ring-4 ring-white dark:ring-gray-950 sm:size-20"
        />
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-xl font-bold text-gray-900 dark:text-white sm:text-2xl">
            {channel.name}
          </h1>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-gray-500 dark:text-gray-400">
            <span>@{channel.name.replace(/\s+/g, '')}</span>
            {channel.subscriberCount > 0 && (
              <>
                <span className="text-gray-300 dark:text-gray-600">·</span>
                <span>{formatViews(channel.subscriberCount)} subscribers</span>
              </>
            )}
            <span className="text-gray-300 dark:text-gray-600">·</span>
            <span>{videos.length}{hasMore ? '+' : ''} videos</span>
          </div>
          {channel.description && (
            <p className="mt-2 line-clamp-2 text-sm text-gray-500 dark:text-gray-400">
              {channel.description.split('\n')[0]}
            </p>
          )}
        </div>
        <div className="flex gap-2 sm:shrink-0">
          <Button
            color={isFavoriteCreator(channel.id) ? 'primary' : 'tertiary'}
            size="md"
            className="rounded-full"
            iconLeading={isFavoriteCreator(channel.id) ? HeartRounded : Heart}
            onClick={() =>
              toggleFavoriteCreator(channel.id, channel.name, channel.avatarUrl)
            }
          >
            {isFavoriteCreator(channel.id) ? 'Favorited' : 'Favorite'}
          </Button>
        </div>
      </motion.div>

      {/* ─── Tabs ─── */}
      <div className="flex items-center gap-1 border-b border-gray-100 dark:border-gray-800/50">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`relative flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors duration-200 ${
              activeTab === tab.id
                ? 'text-gray-900 dark:text-white'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            <tab.icon className="size-4" />
            {tab.label}
            {activeTab === tab.id && (
              <motion.div
                layoutId="channel-tab-indicator"
                className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-gray-900 dark:bg-white"
                transition={{ type: 'spring', bounce: 0.15, duration: 0.5 }}
              />
            )}
          </button>
        ))}
      </div>

      {/* ─── Tab content ─── */}
      {activeTab === 'videos' && (
        <div className="space-y-6">
          {/* Video grid */}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {videos.map((video, i) => (
              <VideoCard key={`${video.id}-${i}`} video={video} index={i} />
            ))}
          </div>

          {/* Loading more skeletons */}
          {loadingMore && (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {[...Array(4)].map((_, i) => (
                <div key={`skel-${i}`} className="animate-pulse">
                  <div className="aspect-video rounded-2xl bg-gray-100 dark:bg-gray-800/50" />
                  <div className="mt-3 space-y-2">
                    <div className="h-4 w-3/4 rounded-lg bg-gray-100 dark:bg-gray-800/50" />
                    <div className="h-3 w-1/2 rounded-lg bg-gray-100 dark:bg-gray-800/50" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Infinite scroll sentinel */}
          {hasMore && !loadingMore && <div ref={sentinelRef} className="h-1" />}

          {/* Empty state */}
          {videos.length === 0 && (
            <div className="py-16 text-center">
              <Play className="mx-auto mb-3 size-10 text-gray-300 dark:text-gray-600" />
              <p className="text-sm text-gray-400 dark:text-gray-500">
                This channel hasn't uploaded any videos yet.
              </p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'about' && (
        <motion.div
          className="mx-auto max-w-3xl space-y-8"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {/* Description */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Description
            </h3>
            <div className="rounded-2xl bg-gray-50/80 p-5 dark:bg-white/[0.03]">
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-600 dark:text-gray-400">
                {channel.description || 'No description available.'}
              </p>
            </div>
          </div>

          {/* Stats */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Stats
            </h3>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              {channel.subscriberCount > 0 && (
                <div className="rounded-2xl bg-gray-50/80 p-4 dark:bg-white/[0.03]">
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {formatViews(channel.subscriberCount)}
                  </p>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Subscribers
                  </p>
                </div>
              )}
              <div className="rounded-2xl bg-gray-50/80 p-4 dark:bg-white/[0.03]">
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {videos.length}{hasMore ? '+' : ''}
                </p>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Videos
                </p>
              </div>
              {channel.verified && (
                <div className="flex items-center gap-2 rounded-2xl bg-gray-50/80 p-4 dark:bg-white/[0.03]">
                  <CheckVerified01 className="size-5 text-blue-500" />
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    Verified
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Channel ID */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Details
            </h3>
            <div className="rounded-2xl bg-gray-50/80 p-5 dark:bg-white/[0.03]">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500 dark:text-gray-400">Channel ID</span>
                <code className="rounded-lg bg-gray-100 px-2 py-0.5 text-xs text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                  {channel.id}
                </code>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  )
}
