import { useEffect, useRef, useCallback, useMemo } from 'react'
import { useSearchParams, useParams, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { VideoCard } from '@/components/video/VideoCard'
import { VideoCardSkeleton } from '@/components/video/VideoCardSkeleton'
import { ContinueWatchingSection } from '@/components/home/ContinueWatchingSection'
import { EmptyState } from '@/components/ui/EmptyState'
import { categories } from '@/data/mockCategories'
import { getHighQualityThumbnail, getFallbackThumbnail } from '@/api/youtube'
import { useHomeFeed } from '@/hooks/useYouTube'
import { useRecommendedFeed } from '@/hooks/useRecommendedFeed'
import { useUserData } from '@/hooks/useUserData'
import { useRegionPreference } from '@/hooks/useRegionPreference'
import { useFeaturedFromHistory } from '@/hooks/useFeaturedFromHistory'
import { CategoryTags } from '@/components/home/CategoryTags'
import { TodaysGamesSection } from '@/components/home/TodaysGamesSection'
import { TodaysNewsSection } from '@/components/home/TodaysNewsSection'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { SeoHead } from '@/components/SeoHead'
import { Wifi, RefreshCcw01 } from '@untitledui/icons'

export function HomePage() {
  const [searchParams] = useSearchParams()
  const { slug } = useParams<{ slug?: string }>()
  const categoryParam = slug ?? searchParams.get('category') ?? 'all'
  const { region } = useRegionPreference()
  const { history } = useUserData()

  const categoryQuery = useMemo(() => {
    const cat = categories.find((c) => c.slug === categoryParam)
    return cat?.query ?? null
  }, [categoryParam])

  const isAllTab = categoryParam === 'all'
  const recommendedFeed = useRecommendedFeed(region, { enabled: isAllTab })
  const homeFeed = useHomeFeed(categoryQuery, region)

  const { videos, loading, loadingMore, hasMore, loadMore, error } = isAllTab
    ? recommendedFeed
    : homeFeed

  const { featured: smartFeatured, reason: featuredReason } = useFeaturedFromHistory(
    history.map((h) => h.videoId),
    videos
  )

  const featuredVideo = categoryParam === 'all' ? smartFeatured : null
  const displayVideos = useMemo(() => {
    if (!featuredVideo) return videos
    const idx = videos.findIndex((v) => v.id === featuredVideo.id)
    if (idx < 0) return videos
    return [...videos.slice(0, idx), ...videos.slice(idx + 1)]
  }, [videos, featuredVideo])

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
    if (!el || !hasMore) return
    const observer = new IntersectionObserver(handleIntersect, {
      rootMargin: '400px',
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [handleIntersect, hasMore, videos.length])

  const currentCategory = categories.find((c) => c.slug === categoryParam)

  return (
    <div className="space-y-6">
      <SeoHead
        title={currentCategory?.label}
        description={currentCategory?.description}
      />

      {/* Category filters */}
      <CategoryTags selectedSlug={categoryParam} />

      {/* Continue Watching — above category content when on "All" tab */}
      {isAllTab && <ContinueWatchingSection />}

      {/* Featured hero — full-width with gradient overlay + Framer Motion fade-in */}
      <AnimatePresence>
        {!loading && !error && featuredVideo && (
          <motion.div
            key={featuredVideo.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          >
            <Link
              to={`/watch/${featuredVideo.id}`}
              className="group relative block overflow-hidden rounded-2xl bg-gray-100 transition-all duration-300 hover:shadow-2xl dark:bg-gray-800"
            >
              {/* Blurred color splash behind card */}
              <div
                className="absolute inset-0 -z-10 scale-105 opacity-40"
                style={{
                  backgroundImage: `url(${featuredVideo.thumbnail})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  filter: 'blur(40px) saturate(1.2)',
                }}
                aria-hidden
              />

              {/* Full-width 16:9 thumbnail (wider on desktop) with bottom gradient */}
              <div className="relative aspect-video w-full overflow-hidden md:aspect-[21/9]">
                <img
                  src={getHighQualityThumbnail(featuredVideo.id)}
                  alt=""
                  className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                  loading="eager"
                  onError={(e) => {
                    e.currentTarget.src = getFallbackThumbnail(featuredVideo!.id)
                  }}
                />

                {/* Gradient overlay at bottom */}
                <div
                  className="absolute inset-0"
                  style={{
                    background:
                      'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.5) 30%, rgba(0,0,0,0.15) 60%, transparent 100%)',
                  }}
                />

                {/* Live / duration badge */}
                {featuredVideo.liveNow ? (
                  <motion.span
                    className="absolute bottom-4 right-4 rounded-lg bg-red-500 px-2.5 py-1 text-xs font-semibold uppercase text-white shadow-[0_0_12px_rgba(239,68,68,0.5)]"
                    animate={{
                      opacity: [1, 0.85, 1],
                      boxShadow: [
                        '0 0 8px rgba(239,68,68,0.4)',
                        '0 0 16px rgba(239,68,68,0.7)',
                        '0 0 8px rgba(239,68,68,0.4)',
                      ],
                    }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                  >
                    Live
                  </motion.span>
                ) : featuredVideo.duration && !featuredVideo.duration.startsWith('-') ? (
                  <span className="absolute bottom-4 right-4 rounded-lg bg-black/60 px-2.5 py-1 text-xs font-medium tabular-nums text-white backdrop-blur-sm">
                    {featuredVideo.duration}
                  </span>
                ) : null}

                {/* "Picked for you" / "Trending" pill */}
                <span className="absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-full bg-red-500/90 px-3 py-1 text-xs font-semibold text-white backdrop-blur-sm">
                  {featuredReason === 'channel' ? 'Picked for you' : 'Trending'}
                </span>

                {/* Text overlay — title, channel, views */}
                <div className="absolute inset-x-0 bottom-0 px-5 pb-5 md:px-8 md:pb-7">
                  <h2 className="text-xl font-bold tracking-tight text-white drop-shadow-sm md:text-3xl">
                    {featuredVideo.title}
                  </h2>
                  <p className="mt-1.5 text-sm text-white/75">
                    {featuredVideo.channelName}
                    {featuredVideo.views ? ` · ${featuredVideo.views} views` : ''}
                  </p>
                  {featuredReason === 'channel' && (
                    <p className="mt-1 text-xs text-white/55">Based on your watch history</p>
                  )}
                </div>
              </div>
            </Link>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Today's selection */}
      {categoryParam === 'gaming' && <TodaysGamesSection />}
      {categoryParam === 'news' && <TodaysNewsSection />}

      {/* Section header */}
      <SectionHeader
        title={categoryParam === 'all' ? 'Trending' : categories.find((c) => c.slug === categoryParam)?.label ?? 'Videos'}
        videoCount={!loading && !error ? displayVideos.length : undefined}
        hasMore={hasMore}
        divider={false}
      />

      {/* Error empty state with retry button */}
      {error && (
        <EmptyState
          icon={<Wifi className="size-9 text-gray-400 dark:text-gray-500" />}
          title="Couldn't load videos"
          description="Check your connection or try again"
          action={{
            label: 'Try again',
            onClick: () => window.location.reload(),
          }}
        />
      )}

      {/* Loading skeleton grid — 12 cards */}
      {loading && (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {[...Array(12)].map((_, i) => (
            <VideoCardSkeleton key={i} />
          ))}
        </div>
      )}

      {/* Video grid */}
      {!loading && !error && (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {displayVideos.map((video, i) => (
            <VideoCard key={`${video.id}-${i}`} video={video} index={i} />
          ))}
        </div>
      )}

      {/* Loading more skeleton */}
      {loadingMore && (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <VideoCardSkeleton key={`skel-more-${i}`} />
          ))}
        </div>
      )}

      {/* Infinite scroll sentinel */}
      {hasMore && !loadingMore && <div ref={sentinelRef} className="h-1" />}

      {/* Empty state when no videos returned */}
      {!loading && !error && videos.length === 0 && (
        <EmptyState
          icon={<RefreshCcw01 className="size-9 text-gray-400 dark:text-gray-500" />}
          title="No videos found"
          description="Try a different category or check your connection"
          action={{
            label: 'Refresh',
            onClick: () => window.location.reload(),
          }}
        />
      )}
    </div>
  )
}
