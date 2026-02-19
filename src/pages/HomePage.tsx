import { useEffect, useRef, useCallback, useMemo } from 'react'
import { useSearchParams, useParams, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { VideoCard } from '@/components/video/VideoCard'
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

export function HomePage() {
  const [searchParams] = useSearchParams()
  const { slug } = useParams<{ slug?: string }>()
  const categoryParam = slug ?? searchParams.get('category') ?? 'all'
  const { region } = useRegionPreference()
  const { history } = useUserData()

  // Map the slug to the category's search query (null for "All" → trending)
  const categoryQuery = useMemo(() => {
    const cat = categories.find((c) => c.slug === categoryParam)
    return cat?.query ?? null   // null means "All" → show trending
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

  // Featured: smart pick when "All", else null
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

      {/* Category filters + Country */}
      <CategoryTags selectedSlug={categoryParam} />

      {/* Featured hero (smart pick when "All": from top-watched channel or trending) */}
      {!loading && !error && featuredVideo && (
        <Link
          to={`/watch/${featuredVideo.id}`}
          className="group relative block overflow-hidden rounded-2xl bg-gray-100 transition-all duration-300 hover:shadow-xl dark:bg-gray-800 animate-fade-in"
        >
          {/* Color blur splash — original thumbnail (blurred, quality less critical) */}
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
          <div className="flex flex-col md:flex-row">
            <div className="relative aspect-video w-full md:w-2/3">
              <img
                src={getHighQualityThumbnail(featuredVideo.id)}
                alt=""
                className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                loading="eager"
                onError={(e) => {
                  e.currentTarget.src = getFallbackThumbnail(featuredVideo!.id)
                }}
              />
              <div
                className="absolute inset-0"
                style={{
                  background: 'linear-gradient(to right, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.15) 30%, rgba(0,0,0,0.05) 60%, transparent 100%)',
                }}
              />
              {featuredVideo.liveNow ? (
                <motion.span
                  className="absolute bottom-3 right-3 rounded-lg bg-red-500 px-2.5 py-1 text-xs font-semibold uppercase text-white shadow-[0_0_12px_rgba(239,68,68,0.5)]"
                  animate={{
                    opacity: [1, 0.85, 1],
                    boxShadow: [
                      '0 0 8px rgba(239,68,68,0.4)',
                      '0 0 16px rgba(239,68,68,0.7)',
                      '0 0 8px rgba(239,68,68,0.4)',
                    ],
                  }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    ease: 'easeInOut',
                  }}
                >
                  Live
                </motion.span>
              ) : featuredVideo.duration && !featuredVideo.duration.startsWith('-') && (
                <span className="absolute bottom-3 right-3 rounded-lg bg-black/60 px-2.5 py-1 text-xs font-medium tabular-nums text-white backdrop-blur-sm">
                  {featuredVideo.duration}
                </span>
              )}
              {featuredReason === 'channel' && (
                <span className="absolute top-3 left-3 rounded-full bg-emerald-500/90 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-white backdrop-blur-sm">
                  For you
                </span>
              )}
            </div>
            <div className="flex flex-1 flex-col justify-center p-6 md:p-8">
              <span className="mb-2 inline-flex w-fit items-center gap-1.5 rounded-full bg-red-500/90 px-3 py-1 text-xs font-semibold text-white backdrop-blur-sm">
                {featuredReason === 'channel' ? 'Picked for you' : 'Trending'}
              </span>
              <h2 className="text-lg font-semibold tracking-tight text-gray-900 dark:text-white md:text-xl">
                {featuredVideo.title}
              </h2>
              <p className="mt-2 text-sm text-gray-400 dark:text-gray-500">
                {featuredVideo.channelName}
                {featuredVideo.views ? ` · ${featuredVideo.views} views` : ''}
              </p>
              {featuredReason === 'channel' && (
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Based on your watch history
                </p>
              )}
            </div>
          </div>
        </Link>
      )}

      {/* Today's selection — FreeToGame when Gaming, GNews when News */}
      {categoryParam === 'gaming' && <TodaysGamesSection />}
      {categoryParam === 'news' && <TodaysNewsSection />}

      {/* Section header */}
      <SectionHeader
        title={categoryParam === 'all' ? 'Trending' : categories.find((c) => c.slug === categoryParam)?.label ?? 'Videos'}
        videoCount={!loading && !error ? displayVideos.length : undefined}
        hasMore={hasMore}
        divider={false}
      />

      {/* Error */}
      {error && (
        <div className="rounded-2xl bg-red-50 p-5 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
          {error}. Try again or check your connection.
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {[...Array(12)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="aspect-video rounded-2xl bg-gray-100 dark:bg-gray-800" />
              <div className="mt-3 flex gap-3">
                <div className="size-8 rounded-full bg-gray-100 dark:bg-gray-800" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-3/4 rounded-lg bg-gray-100 dark:bg-gray-800" />
                  <div className="h-3 w-1/2 rounded-lg bg-gray-100 dark:bg-gray-800" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Video grid */}
      {!loading && (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {displayVideos.map((video, i) => (
            <VideoCard key={`${video.id}-${i}`} video={video} index={i} />
          ))}
        </div>
      )}

      {/* Loading more spinner */}
      {loadingMore && (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={`skel-${i}`} className="animate-pulse">
              <div className="aspect-video rounded-2xl bg-gray-100 dark:bg-gray-800" />
              <div className="mt-3 flex gap-3">
                <div className="size-8 rounded-full bg-gray-100 dark:bg-gray-800" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-3/4 rounded-lg bg-gray-100 dark:bg-gray-800" />
                  <div className="h-3 w-1/2 rounded-lg bg-gray-100 dark:bg-gray-800" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Infinite scroll sentinel */}
      {hasMore && !loadingMore && <div ref={sentinelRef} className="h-1" />}

      {/* Empty state */}
      {!loading && !error && videos.length === 0 && (
        <div className="py-16 text-center">
          <p className="text-sm text-gray-400 dark:text-gray-500">
            No videos found. Try a different category.
          </p>
        </div>
      )}
    </div>
  )
}
