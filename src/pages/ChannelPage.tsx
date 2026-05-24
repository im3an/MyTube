import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { VideoCard } from '@/components/video/VideoCard'
import { Avatar } from '@/components/base/avatar/avatar'
import { Button } from '@/components/base/buttons/button'
import { useChannel } from '@/hooks/useYouTube'
import { useResolvedChannelId } from '@/hooks/useResolvedChannelId'
import { useUserData } from '@/hooks/useUserData'
import { formatViews, isCanonicalChannelId } from '@/api/youtube'
import { cn } from '@/lib/utils'
import {
  Bell01,
  BellRinging01,
  CheckVerified01,
  InfoCircle,
  List,
  SwitchVertical01,
  VideoRecorder,
} from '@untitledui/icons'
import type { AppVideo } from '@/hooks/useYouTube'

type Tab = 'videos' | 'playlists' | 'about'
type SortOrder = 'newest' | 'popular' | 'oldest'

const SORT_LABELS: Record<SortOrder, string> = {
  newest: 'Newest',
  popular: 'Popular',
  oldest: 'Oldest',
}

const TABS: { id: Tab; label: string; Icon: typeof VideoRecorder }[] = [
  { id: 'videos', label: 'Videos', Icon: VideoRecorder },
  { id: 'playlists', label: 'Playlists', Icon: List },
  { id: 'about', label: 'About', Icon: InfoCircle },
]

function sortVideos(videos: AppVideo[], order: SortOrder): AppVideo[] {
  const copy = [...videos]
  if (order === 'newest') return copy.sort((a, b) => (b.published ?? 0) - (a.published ?? 0))
  if (order === 'oldest') return copy.sort((a, b) => (a.published ?? 0) - (b.published ?? 0))
  return copy.sort((a, b) => (b.viewCount ?? 0) - (a.viewCount ?? 0))
}

function linkifyText(text: string): string {
  return text.replace(
    /(https?:\/\/[^\s]+)/g,
    (url) =>
      `<a href="${url}" target="_blank" rel="noopener noreferrer" class="text-blue-500 hover:underline break-all">${url}</a>`,
  )
}

function LoadingSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="h-32 w-full bg-gray-100 dark:bg-gray-800/50 sm:h-44 lg:h-52" />
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 py-4 sm:flex-row sm:items-end sm:pb-5">
          <div className="-mt-10 size-20 rounded-full bg-gray-200 ring-4 ring-white dark:bg-gray-700 dark:ring-gray-950 sm:-mt-12 sm:size-24" />
          <div className="flex-1 space-y-2">
            <div className="h-5 w-48 rounded-lg bg-gray-100 dark:bg-gray-800/50" />
            <div className="h-3 w-32 rounded-lg bg-gray-100 dark:bg-gray-800/50" />
          </div>
          <div className="h-9 w-28 rounded-full bg-gray-100 dark:bg-gray-800/50" />
        </div>
        <div className="h-px w-full bg-gray-100 dark:bg-gray-800/50" />
        <div className="flex gap-6 py-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-4 w-16 rounded-lg bg-gray-100 dark:bg-gray-800/50" />
          ))}
        </div>
        <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
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
    </div>
  )
}

export function ChannelPage() {
  const { id } = useParams<{ id: string }>()
  const channelId = id ?? ''
  const navigate = useNavigate()
  const { resolvedId, error: resolveError, isLoading: isResolving } =
    useResolvedChannelId(channelId)

  const effectiveChannelId = isCanonicalChannelId(channelId) ? channelId : resolvedId

  const { channel, videos, loading, loadingMore, hasMore, loadMore, error } =
    useChannel(effectiveChannelId)
  const { toggleFavoriteCreator, isFavoriteCreator } = useUserData()

  const displayError = error || resolveError

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
  const [sortOrder, setSortOrder] = useState<SortOrder>('newest')
  const [showSortMenu, setShowSortMenu] = useState(false)

  const sortMenuRef = useRef<HTMLDivElement>(null)
  const sentinelRef = useRef<HTMLDivElement>(null)
  const loadMoreRef = useRef(loadMore)
  loadMoreRef.current = loadMore

  useEffect(() => {
    if (!showSortMenu) return
    function handleOutsideClick(e: MouseEvent) {
      if (sortMenuRef.current && !sortMenuRef.current.contains(e.target as Node)) {
        setShowSortMenu(false)
      }
    }
    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [showSortMenu])

  const handleIntersect = useCallback((entries: IntersectionObserverEntry[]) => {
    if (entries[0]?.isIntersecting) loadMoreRef.current()
  }, [])

  useEffect(() => {
    const el = sentinelRef.current
    if (!el || !hasMore || activeTab !== 'videos') return
    const observer = new IntersectionObserver(handleIntersect, { rootMargin: '400px' })
    observer.observe(el)
    return () => observer.disconnect()
  }, [handleIntersect, hasMore, videos.length, activeTab])

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
    setActiveTab('videos')
    setSortOrder('newest')
  }, [channelId])

  const sortedVideos = useMemo(() => sortVideos(videos, sortOrder), [videos, sortOrder])

  if (loading || isResolving) return <LoadingSkeleton />

  if (displayError) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="mb-4 flex size-16 items-center justify-center rounded-2xl bg-gray-100 dark:bg-gray-800">
          <InfoCircle className="size-7 text-gray-400" />
        </div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          Channel not found
        </h2>
        <p className="mt-1 text-sm text-gray-400 dark:text-gray-500">{displayError}</p>
      </div>
    )
  }

  if (!channel) return <LoadingSkeleton />

  const isSubscribed = isFavoriteCreator(channel.id)

  return (
    <div className="-mx-4 sm:-mx-6 lg:-mx-8">
      {/* ─── Banner ─── */}
      <div className="relative h-32 w-full overflow-hidden sm:h-44 lg:h-52">
        {channel.bannerUrl ? (
          <motion.img
            src={channel.bannerUrl}
            alt=""
            className="h-full w-full object-cover"
            initial={{ opacity: 0, scale: 1.04 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.55, ease: [0.4, 0, 0.2, 1] }}
          />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-gray-700 via-gray-800 to-gray-900 dark:from-gray-800 dark:via-gray-900 dark:to-black" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
      </div>

      <div className="px-4 sm:px-6 lg:px-8">
        {/* ─── Channel info row ─── */}
        <motion.div
          className="flex flex-col gap-3 py-3 sm:flex-row sm:items-end sm:gap-4 sm:pb-4"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <Avatar
            src={channel.avatarUrl}
            alt={channel.name}
            size="2xl"
            verified={channel.verified}
            className="-mt-10 shrink-0 ring-4 ring-white dark:ring-gray-950 sm:-mt-12"
          />

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate text-xl font-bold text-gray-900 dark:text-white sm:text-2xl">
                {channel.name}
              </h1>
              {channel.verified && (
                <CheckVerified01 className="size-5 shrink-0 text-blue-500" />
              )}
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm text-gray-500 dark:text-gray-400">
              <span>@{channel.name.replace(/\s+/g, '').toLowerCase()}</span>
              {channel.subscriberCount > 0 && (
                <>
                  <span className="text-gray-300 dark:text-gray-600">·</span>
                  <span>{formatViews(channel.subscriberCount)} subscribers</span>
                </>
              )}
              <span className="text-gray-300 dark:text-gray-600">·</span>
              <span>
                {videos.length}
                {hasMore ? '+' : ''} videos
              </span>
            </div>
          </div>

          <Button
            color={isSubscribed ? 'secondary' : 'primary'}
            size="md"
            className="shrink-0 rounded-full"
            iconLeading={isSubscribed ? BellRinging01 : Bell01}
            onClick={() =>
              toggleFavoriteCreator(channel.id, channel.name, channel.avatarUrl)
            }
          >
            {isSubscribed ? 'Subscribed' : 'Subscribe'}
          </Button>
        </motion.div>

        {/* ─── Tabs ─── */}
        <div className="flex items-center overflow-x-auto border-b border-gray-100 scrollbar-none dark:border-gray-800/50">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'relative flex shrink-0 items-center gap-1.5 px-4 py-3 text-sm font-medium transition-colors duration-200',
                activeTab === tab.id
                  ? 'text-gray-900 dark:text-white'
                  : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300',
              )}
            >
              <tab.Icon className="size-4" />
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
        <AnimatePresence mode="wait">
          {activeTab === 'videos' && (
            <motion.div
              key="videos"
              className="space-y-5 py-6"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.22 }}
            >
              {videos.length > 0 && (
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {videos.length}
                    {hasMore ? '+' : ''} videos
                  </p>
                  <div ref={sortMenuRef} className="relative">
                    <button
                      onClick={() => setShowSortMenu((p) => !p)}
                      className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-gray-700 ring-1 ring-gray-200 hover:bg-gray-50 dark:text-gray-300 dark:ring-gray-700 dark:hover:bg-gray-800/60"
                    >
                      <SwitchVertical01 className="size-4" />
                      {SORT_LABELS[sortOrder]}
                    </button>
                    <AnimatePresence>
                      {showSortMenu && (
                        <motion.div
                          className="absolute right-0 z-20 mt-1.5 w-36 overflow-hidden rounded-xl bg-white shadow-lg ring-1 ring-gray-200 dark:bg-gray-900 dark:ring-gray-700"
                          initial={{ opacity: 0, scale: 0.96, y: -4 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.96, y: -4 }}
                          transition={{ duration: 0.15 }}
                        >
                          {(Object.keys(SORT_LABELS) as SortOrder[]).map((order) => (
                            <button
                              key={order}
                              onClick={() => {
                                setSortOrder(order)
                                setShowSortMenu(false)
                              }}
                              className={cn(
                                'w-full px-4 py-2.5 text-left text-sm transition-colors hover:bg-gray-50 dark:hover:bg-gray-800',
                                sortOrder === order
                                  ? 'font-semibold text-gray-900 dark:text-white'
                                  : 'text-gray-600 dark:text-gray-400',
                              )}
                            >
                              {SORT_LABELS[order]}
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {sortedVideos.map((video, i) => (
                  <VideoCard key={`${video.id}-${i}`} video={video} index={i} />
                ))}
              </div>

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

              {hasMore && !loadingMore && <div ref={sentinelRef} className="h-1" />}

              {videos.length === 0 && (
                <div className="py-20 text-center">
                  <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-2xl bg-gray-100 dark:bg-gray-800">
                    <VideoRecorder className="size-7 text-gray-400 dark:text-gray-500" />
                  </div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    No videos yet
                  </p>
                  <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                    This channel hasn&apos;t uploaded any videos.
                  </p>
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'playlists' && (
            <motion.div
              key="playlists"
              className="py-20 text-center"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.22 }}
            >
              <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-2xl bg-gray-100 dark:bg-gray-800">
                <List className="size-7 text-gray-400 dark:text-gray-500" />
              </div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                No playlists available
              </p>
              <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                This channel hasn&apos;t created any public playlists.
              </p>
            </motion.div>
          )}

          {activeTab === 'about' && (
            <motion.div
              key="about"
              className="mx-auto max-w-3xl space-y-8 py-6"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.22 }}
            >
              <div className="space-y-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                  Description
                </h3>
                <div className="rounded-2xl bg-gray-50/80 p-5 dark:bg-white/[0.03]">
                  {channel.description ? (
                    <p
                      className="whitespace-pre-wrap text-sm leading-relaxed text-gray-600 dark:text-gray-400"
                      dangerouslySetInnerHTML={{ __html: linkifyText(channel.description) }}
                    />
                  ) : (
                    <p className="text-sm text-gray-400 dark:text-gray-500">
                      No description available.
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
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
                      {videos.length}
                      {hasMore ? '+' : ''}
                    </p>
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Videos</p>
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

              <div className="space-y-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                  Details
                </h3>
                <div className="rounded-2xl bg-gray-50/80 p-5 dark:bg-white/[0.03]">
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      Channel ID
                    </span>
                    <code className="rounded-lg bg-gray-100 px-2 py-0.5 text-xs text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                      {channel.id}
                    </code>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
