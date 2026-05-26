import { useEffect, useRef, useCallback } from 'react'
import { useParams, Navigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { VideoCard } from '@/components/video/VideoCard'
import { VideoCardSkeleton } from '@/components/video/VideoCardSkeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { SeoHead } from '@/components/SeoHead'
import { categories } from '@/data/mockCategories'
import { useInfiniteSearch } from '@/hooks/useYouTube'
import { useRegionPreference } from '@/hooks/useRegionPreference'
import { cn } from '@/lib/utils'

const SKELETON_COUNT = 8

export function CategoryPage() {
  const { slug } = useParams<{ slug: string }>()
  const { region } = useRegionPreference()

  const category = categories.find((c) => c.slug === slug)

  // Redirect unknown slugs to home
  if (!category) {
    return <Navigate to="/" replace />
  }

  // "all" category is the homepage itself
  if (category.slug === 'all') {
    return <Navigate to="/" replace />
  }

  return <CategoryContent key={category.slug} category={category} region={region} />
}

interface CategoryContentProps {
  category: (typeof categories)[number]
  region: string
}

function CategoryContent({ category, region }: CategoryContentProps) {
  const Icon = category.icon

  const searchQuery = category.query ?? category.keywords[0] ?? category.label

  const { videos, loading, loadingMore, hasMore, loadMore, error } = useInfiniteSearch(
    searchQuery,
    region,
  )

  // Infinite scroll sentinel
  const sentinelRef = useRef<HTMLDivElement>(null)
  const loadMoreRef = useRef(loadMore)
  loadMoreRef.current = loadMore

  const handleIntersect = useCallback((entries: IntersectionObserverEntry[]) => {
    if (entries[0]?.isIntersecting) loadMoreRef.current()
  }, [])

  useEffect(() => {
    const el = sentinelRef.current
    if (!el || !hasMore) return
    const observer = new IntersectionObserver(handleIntersect, { rootMargin: '400px' })
    observer.observe(el)
    return () => observer.disconnect()
  }, [handleIntersect, hasMore, videos.length])

  return (
    <div className="space-y-6">
      <SeoHead title={category.label} description={category.description} />

      {/* Page header */}
      <div className="flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-xl bg-gray-100 dark:bg-gray-800">
          <Icon className="size-5 text-gray-700 dark:text-gray-300" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">{category.label}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">{category.description}</p>
        </div>
      </div>

      {/* Skeleton grid */}
      {loading && (
        <div className="grid grid-cols-1 gap-x-4 gap-y-7 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: SKELETON_COUNT }).map((_, i) => (
            <VideoCardSkeleton key={i} />
          ))}
        </div>
      )}

      {/* Error state */}
      {!loading && error && (
        <EmptyState
          icon={<Icon className="size-8 text-gray-400 dark:text-gray-500" />}
          title={`Couldn't load ${category.label}`}
          description={error}
        />
      )}

      {/* Empty state */}
      {!loading && !error && videos.length === 0 && (
        <EmptyState
          icon={<Icon className="size-8 text-gray-400 dark:text-gray-500" />}
          title={`No ${category.label} videos`}
          description="Nothing here yet. Check back later."
        />
      )}

      {/* Video grid */}
      {!loading && !error && videos.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="grid grid-cols-1 gap-x-4 gap-y-7 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
        >
          {videos.map((video, i) => (
            <VideoCard key={video.id} video={video} index={i} />
          ))}
        </motion.div>
      )}

      {/* Load more spinner */}
      {loadingMore && (
        <div className="flex justify-center py-6">
          <div className="size-6 animate-spin rounded-full border-2 border-gray-300 border-t-gray-700 dark:border-gray-600 dark:border-t-gray-200" />
        </div>
      )}

      {/* Infinite scroll sentinel */}
      {!loading && hasMore && <div ref={sentinelRef} className="h-4" />}

      {/* End of results */}
      {!loading && !hasMore && videos.length > 0 && (
        <p
          className={cn(
            'py-6 text-center text-sm text-gray-400 dark:text-gray-500',
          )}
        >
          You&apos;ve seen all {category.label} videos
        </p>
      )}
    </div>
  )
}
