import { useEffect, useRef, useCallback, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { VideoCard } from '@/components/video/VideoCard'
import { SearchChannelCard } from '@/components/search/SearchChannelCard'
import { SearchFilterBar, useSearchFilters } from '@/components/search/SearchFilterBar'
import { useRegionPreference } from '@/hooks/useRegionPreference'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { useInfiniteSearch, useSearchChannels } from '@/hooks/useYouTube'
import { useUserData } from '@/hooks/useUserData'
import {
  getCachedChannelId,
  channelIdCache,
} from '@/hooks/useResolvedChannelId'
import { resolveChannelIdentity } from '@/services/channelService'
import { isCanonicalChannelId } from '@/api/youtube'
import { SearchMd, Users01, Film01 } from '@untitledui/icons'
import { cn } from '@/lib/utils'
import type { AppVideo } from '@/hooks/useYouTube'
import type { FilterOption, SortOption, DurationOption } from '@/components/search/SearchFilterBar'

type SearchTab = 'videos' | 'channels'

function SkeletonCard() {
  return (
    <div className="animate-pulse">
      <div className="aspect-video rounded-2xl bg-gray-100 dark:bg-gray-800" />
      <div className="mt-3 flex gap-3">
        <div className="size-8 shrink-0 rounded-full bg-gray-100 dark:bg-gray-800" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-3/4 rounded-lg bg-gray-100 dark:bg-gray-800" />
          <div className="h-3 w-1/2 rounded-lg bg-gray-100 dark:bg-gray-800" />
        </div>
      </div>
    </div>
  )
}

function SkeletonChannelCard() {
  return (
    <div className="animate-pulse flex items-center gap-3 rounded-xl p-3">
      <div className="size-12 shrink-0 rounded-full bg-gray-100 dark:bg-gray-800" />
      <div className="flex-1 space-y-2">
        <div className="h-4 w-24 rounded-lg bg-gray-100 dark:bg-gray-800" />
        <div className="h-3 w-16 rounded-lg bg-gray-100 dark:bg-gray-800" />
      </div>
    </div>
  )
}

function applyFiltersAndSort(
  videos: AppVideo[],
  sort: SortOption,
  filter: FilterOption,
  duration: DurationOption,
  favoriteChannelIds: string[]
): AppVideo[] {
  let result = [...videos]

  // Type filter
  switch (filter) {
    case 'from-my-channels':
      result = result.filter((v) =>
        favoriteChannelIds.some(
          (id) => id === getCachedChannelId(v.channelId) || id === v.channelId
        )
      )
      break
    case 'live':
      result = result.filter((v) => v.liveNow)
      break
    case 'shorts':
      result = result.filter(
        (v) =>
          v.lengthSeconds > 0 &&
          v.lengthSeconds <= 60 &&
          !v.liveNow
      )
      break
    case 'long':
      result = result.filter(
        (v) => v.lengthSeconds > 0 && v.lengthSeconds >= 20 * 60
      )
      break
    default:
      break
  }

  // Duration filter (applied after type filter; skipped for live/shorts which imply duration)
  if (filter !== 'live' && filter !== 'shorts' && filter !== 'long') {
    switch (duration) {
      case 'short':
        result = result.filter((v) => v.lengthSeconds > 0 && v.lengthSeconds < 4 * 60)
        break
      case 'medium':
        result = result.filter(
          (v) => v.lengthSeconds >= 4 * 60 && v.lengthSeconds <= 20 * 60
        )
        break
      case 'long':
        result = result.filter((v) => v.lengthSeconds > 20 * 60)
        break
      default:
        break
    }
  }

  // Sort
  switch (sort) {
    case 'recent':
      result.sort((a, b) => (b.published ?? 0) - (a.published ?? 0))
      break
    case 'popular':
      result.sort((a, b) => (b.viewCount ?? 0) - (a.viewCount ?? 0))
      break
    default:
      // relevant — keep API order
      break
  }

  return result
}

export function SearchPage() {
  const [searchParams] = useSearchParams()
  const query = searchParams.get('q') || ''
  const { region } = useRegionPreference()
  const { sort, filter, duration } = useSearchFilters()
  const { favoriteCreators, addSearchToHistory } = useUserData()
  const [activeTab, setActiveTab] = useState<SearchTab>('videos')

  // Reset to videos tab when query changes
  useEffect(() => {
    setActiveTab('videos')
  }, [query])

  // Track search history for recommendation intent scoring
  useEffect(() => {
    if (query.trim()) addSearchToHistory(query)
  }, [query, addSearchToHistory])
  const { videos, loading, loadingMore, hasMore, loadMore, error } =
    useInfiniteSearch(query || null, region)
  const { channels, loading: channelsLoading } = useSearchChannels(
    query || null,
    region,
  )

  const favoriteChannelIds = useMemo(
    () => favoriteCreators.map((c) => c.id),
    [favoriteCreators]
  )

  // Prefetch channel IDs for "From my channels" filter (resolves @handle → UCxxx)
  const [cacheVersion, setCacheVersion] = useState(0)
  useEffect(() => {
    if (filter !== 'from-my-channels' || favoriteChannelIds.length === 0) return
    const toResolve = [
      ...new Set(
        videos
          .map((v) => v.channelId)
          .filter((id) => id && !isCanonicalChannelId(id) && !channelIdCache.has(id))
      ),
    ]
    toResolve.slice(0, 10).forEach((id) => {
      resolveChannelIdentity(id).then((identity) => {
        if (identity?.id && isCanonicalChannelId(identity.id)) {
          channelIdCache.set(id, identity.id)
          channelIdCache.set(identity.id, identity.id)
          setCacheVersion((n: number) => n + 1)
        }
      })
    })
  }, [videos, filter, favoriteChannelIds.length])

  const filteredVideos = useMemo(
    () => applyFiltersAndSort(videos, sort, filter, duration, favoriteChannelIds),
    [videos, sort, filter, duration, favoriteChannelIds, cacheVersion]
  )

  // Intersection observer for infinite scroll
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
    if (!el) return
    const observer = new IntersectionObserver(handleIntersect, {
      rootMargin: '400px',
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [handleIntersect, videos.length])

  // No query — show empty prompt
  if (!query) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center animate-fade-in">
        <div className="mb-4 flex size-16 items-center justify-center rounded-2xl bg-gray-100 dark:bg-gray-800">
          <SearchMd className="size-7 text-gray-400 dark:text-gray-500" />
        </div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          Search for videos
        </h2>
        <p className="mt-1 text-sm text-gray-400 dark:text-gray-500">
          Use the search bar above or press <kbd className="mx-0.5 rounded border border-gray-200 bg-gray-50 px-1.5 py-0.5 text-xs font-medium dark:border-gray-700 dark:bg-gray-800">⌘K</kbd> to get started.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      {/* Header */}
      <SectionHeader
        title={`Results for "${query}"`}
        description={
          activeTab === 'channels'
            ? (channelsLoading ? 'Searching...' : `${channels.length} channels found`)
            : (loading ? 'Searching...' : `${filteredVideos.length}${hasMore ? '+' : ''} videos found`)
        }
        divider={false}
      />

      {/* Tab pills */}
      <div className="flex gap-1 rounded-xl border border-gray-200/60 bg-white/70 p-1 w-fit backdrop-blur-sm dark:border-gray-700/40 dark:bg-white/[0.04]">
        {(['videos', 'channels'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              'flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-[13px] font-medium transition-all duration-200',
              activeTab === tab
                ? 'bg-gray-900 text-white shadow-sm dark:bg-white dark:text-gray-900'
                : 'text-gray-500 hover:bg-gray-100/60 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-white/[0.06] dark:hover:text-white'
            )}
          >
            {tab === 'videos'
              ? <Film01 className="size-3.5" />
              : <Users01 className="size-3.5" />
            }
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Videos tab */}
      {activeTab === 'videos' && (
        <div className="space-y-6">
          {/* Filter bar */}
          <SearchFilterBar hasFavoriteChannels={favoriteChannelIds.length > 0} />

          {/* Error */}
          {error && (
            <div className="rounded-2xl bg-red-50 p-5 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
              {error}. Try again or check your connection.
            </div>
          )}

          {/* Initial loading */}
          {loading && (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {Array.from({ length: 12 }, (_, i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          )}

          {/* Video grid */}
          {!loading && videos.length > 0 && filteredVideos.length > 0 && (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredVideos.map((video) => (
                <VideoCard key={video.id} video={video} />
              ))}
              {loadingMore &&
                Array.from({ length: 4 }, (_, i) => (
                  <SkeletonCard key={`more-${i}`} />
                ))}
            </div>
          )}

          {/* Infinite scroll sentinel */}
          {hasMore && !loading && videos.length > 0 && (
            <div ref={sentinelRef} className="h-1" />
          )}

          {/* Empty state — no results */}
          {!loading && !error && query && videos.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <SearchMd className="mb-3 size-10 text-gray-300 dark:text-gray-600" />
              <p className="text-sm text-gray-400 dark:text-gray-500">
                No videos found for "{query}". Try different keywords.
              </p>
            </div>
          )}

          {/* Filtered empty */}
          {!loading && !error && query && videos.length > 0 && filteredVideos.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <SearchMd className="mb-3 size-10 text-gray-300 dark:text-gray-600" />
              <p className="text-sm text-gray-400 dark:text-gray-500">
                No videos match your filters. Try changing or clearing them.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Channels tab */}
      {activeTab === 'channels' && (
        <div className="space-y-3">
          {/* Loading */}
          {channelsLoading && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {Array.from({ length: 8 }, (_, i) => (
                <SkeletonChannelCard key={i} />
              ))}
            </div>
          )}

          {/* Channel grid */}
          {!channelsLoading && channels.length > 0 && (
            <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
              {channels.map((channel, i) => (
                <SearchChannelCard
                  key={channel.id}
                  channel={channel}
                  index={i}
                />
              ))}
            </div>
          )}

          {/* Empty state */}
          {!channelsLoading && channels.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Users01 className="mb-3 size-10 text-gray-300 dark:text-gray-600" />
              <p className="text-sm text-gray-400 dark:text-gray-500">
                No channels found for "{query}". Try different keywords.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
