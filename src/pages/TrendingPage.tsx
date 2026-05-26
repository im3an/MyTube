import { useEffect, useState, useCallback, useRef } from 'react'
import { motion } from 'framer-motion'
import { AnimatePresence } from 'framer-motion'
import { TrendUp01, Globe01, ChevronDown } from '@untitledui/icons'
import { VideoCard } from '@/components/video/VideoCard'
import { VideoCardSkeleton } from '@/components/video/VideoCardSkeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { SeoHead } from '@/components/SeoHead'
import { useRegionPreference } from '@/hooks/useRegionPreference'
import { getTrending, toAppVideo } from '@/api/youtube'
import type { AppVideo } from '@/hooks/useYouTube'
import { cn } from '@/lib/utils'

const SKELETON_COUNT = 8

function useTrendingFeed(region: string) {
  const [videos, setVideos] = useState<AppVideo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const regionRef = useRef(region)

  useEffect(() => {
    regionRef.current = region
    setLoading(true)
    setError(null)

    getTrending(region)
      .then((data) => {
        if (regionRef.current !== region) return
        setVideos(data.map(toAppVideo))
      })
      .catch((e) => {
        if (regionRef.current !== region) return
        setError(e instanceof Error ? e.message : 'Failed to load trending')
        setVideos([])
      })
      .finally(() => {
        if (regionRef.current === region) setLoading(false)
      })
  }, [region])

  return { videos, loading, error }
}

export function TrendingPage() {
  const { region, setRegion, regionInfo, regions } = useRegionPreference()
  const [countryOpen, setCountryOpen] = useState(false)
  const { videos, loading, error } = useTrendingFeed(region)

  const handleRegionSelect = useCallback(
    (code: string) => {
      setRegion(code as Parameters<typeof setRegion>[0])
      setCountryOpen(false)
    },
    [setRegion],
  )

  return (
    <div className="space-y-6">
      <SeoHead
        title="Trending"
        description={`Top trending videos in ${regionInfo.name}`}
      />

      {/* Page header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-gray-100 dark:bg-gray-800">
            <TrendUp01 className="size-5 text-gray-700 dark:text-gray-300" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">Trending</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              What&apos;s hot right now in {regionInfo.name}
            </p>
          </div>
        </div>

        {/* Region selector */}
        <div className="relative shrink-0">
          <button
            onClick={() => setCountryOpen((o) => !o)}
            className={cn(
              'flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-[13px] font-medium transition-all duration-200',
              'bg-white/60 text-gray-600 ring-1 ring-gray-200/50 backdrop-blur-sm',
              'hover:bg-white/90 hover:text-gray-900 hover:ring-gray-300/60',
              'dark:bg-white/[0.04] dark:text-gray-400 dark:ring-gray-700/40',
              'dark:hover:bg-white/[0.08] dark:hover:text-white',
            )}
            aria-expanded={countryOpen}
            aria-haspopup="listbox"
            aria-label="Select region for trending videos"
          >
            <Globe01 className="size-3.5 text-gray-500 dark:text-gray-400" />
            <span className="text-base leading-none">{regionInfo.flag}</span>
            <span>{regionInfo.code}</span>
            <ChevronDown
              className={cn('size-3.5 transition-transform', countryOpen && 'rotate-180')}
            />
          </button>

          <AnimatePresence>
            {countryOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  aria-hidden
                  onClick={() => setCountryOpen(false)}
                />
                <motion.div
                  initial={{ opacity: 0, y: -8, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.96 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 top-full z-50 mt-2 max-h-64 w-56 overflow-y-auto rounded-xl border border-gray-200/60 bg-white/95 py-2 shadow-xl backdrop-blur-xl dark:border-gray-700/50 dark:bg-gray-900/95"
                  role="listbox"
                >
                  <p className="px-4 py-2 text-[11px] font-medium uppercase tracking-wider text-gray-400 dark:text-gray-500">
                    Trending from
                  </p>
                  {regions.map((r) => (
                    <button
                      key={r.code}
                      onClick={() => handleRegionSelect(r.code)}
                      role="option"
                      aria-selected={region === r.code}
                      className={cn(
                        'flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors',
                        region === r.code
                          ? 'bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-white'
                          : 'text-gray-600 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-gray-800/80',
                      )}
                    >
                      <span className="text-lg">{r.flag}</span>
                      <span className="flex-1 font-medium">{r.name}</span>
                      {region === r.code && (
                        <span className="text-xs text-gray-500 dark:text-gray-400">✓</span>
                      )}
                    </button>
                  ))}
                </motion.div>
              </>
            )}
          </AnimatePresence>
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
          icon={<TrendUp01 className="size-8 text-gray-400 dark:text-gray-500" />}
          title="Couldn't load trending"
          description={error}
        />
      )}

      {/* Empty state */}
      {!loading && !error && videos.length === 0 && (
        <EmptyState
          icon={<TrendUp01 className="size-8 text-gray-400 dark:text-gray-500" />}
          title="No trending videos"
          description={`Nothing trending in ${regionInfo.name} right now. Try a different region.`}
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
    </div>
  )
}
