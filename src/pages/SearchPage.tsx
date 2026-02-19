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
import { SearchMd, Users01 } from '@untitledui/icons'
import type { AppVideo } from '@/hooks/useYouTube'
import type { FilterOption, SortOption } from '@/components/search/SearchFilterBar'

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
  favoriteChannelIds: string[]
): AppVideo[] {
  let result = [...videos]

  // Filter
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
  const { sort, filter } = useSearchFilters()
  const { favoriteCreators, addSearchToHistory } = useUserData()

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
    () => applyFiltersAndSort(videos, sort, filter, favoriteChannelIds),
    [videos, sort, filter, favoriteChannelIds, cacheVersion]
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
    <div className="flex flex-col gap-6 animate-fade-in lg:flex-row lg:items-start">
      {/* Profiles section — left sidebar on desktop, horizontal strip at top on mobile */}
      {(channels.length > 0 || channelsLoading) && (
        <aside className="shrink-0 lg:w-72 lg:sticky lg:top-24">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            <Users01 className="size-4" />
            Channels
          </h3>
          {channelsLoading ? (
            <div className="flex gap-3 overflow-x-auto pb-2 lg:flex-col lg:overflow-visible lg:gap-1">
              {Array.from({ length: 5 }, (_, i) => (
                <SkeletonChannelCard key={i} />
              ))}
            </div>
          ) : (
            <>
              {/* Mobile: horizontal scroll with compact cards */}
              <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide lg:hidden">
                {channels.map((channel, i) => (
                  <SearchChannelCard
                    key={channel.id}
                    channel={channel}
                    index={i}
                    compact
                  />
                ))}
              </div>
              {/* Desktop: vertical sidebar list */}
              <div className="hidden space-y-1 overflow-y-auto max-h-[calc(100vh-12rem)] pr-2 scrollbar-thin lg:block">
                {channels.map((channel, i) => (
                  <SearchChannelCard
                    key={channel.id}
                    channel={channel}
                    index={i}
                  />
                ))}
              </div>
            </>
          )}
        </aside>
      )}

      {/* Main content — videos */}
      <div className="min-w-0 flex-1 space-y-6">
        <SectionHeader
          title={`Results for "${query}"`}
          description={
            loading
              ? 'Searching...'
              : `${filteredVideos.length}${hasMore ? '+' : ''} videos found`
          }
          divider={false}
        />

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

        {/* Video grid — hide when filtered to empty so we show the message instead */}
        {!loading &&
          videos.length > 0 &&
          filteredVideos.length > 0 && (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredVideos.map((video) => (
                <VideoCard key={video.id} video={video} />
              ))}

              {/* Loading more skeletons */}
              {loadingMore &&
                Array.from({ length: 4 }, (_, i) => (
                  <SkeletonCard key={`more-${i}`} />
                ))}
            </div>
          )}

        {/* Infinite scroll sentinel — keep loading when we have raw videos */}
        {hasMore && !loading && videos.length > 0 && (
          <div ref={sentinelRef} className="h-1" />
        )}

        {/* Empty state — no search results at all */}
        {!loading && !error && query && videos.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <SearchMd className="mb-3 size-10 text-gray-300 dark:text-gray-600" />
            <p className="text-sm text-gray-400 dark:text-gray-500">
              No videos found for "{query}". Try different keywords.
            </p>
          </div>
        )}

        {/* Filtered empty — we have results but none match filters */}
        {!loading &&
          !error &&
          query &&
          videos.length > 0 &&
          filteredVideos.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <SearchMd className="mb-3 size-10 text-gray-300 dark:text-gray-600" />
              <p className="text-sm text-gray-400 dark:text-gray-500">
                No videos match your filters. Try changing or clearing them.
              </p>
            </div>
          )}
      </div>
    </div>
  )
}
