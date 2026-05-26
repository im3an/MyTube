import { useRef, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useUserData } from '@/hooks/useUserData'
import { useVideosByIds } from '@/hooks/useYouTube'
import { cn } from '@/lib/utils'

const MIN_POSITION_SEC = 10
const MAX_VIDEOS = 8

export function ContinueWatchingSection() {
  const { playbackPositions } = useUserData()
  const scrollRef = useRef<HTMLDivElement>(null)

  const eligibleIds = useMemo(() => {
    return Object.entries(playbackPositions)
      .filter(([, sec]) => sec > MIN_POSITION_SEC)
      .sort((a, b) => b[1] - a[1])
      .slice(0, MAX_VIDEOS)
      .map(([id]) => id)
  }, [playbackPositions])

  const { videos, loading } = useVideosByIds(eligibleIds)

  if (eligibleIds.length === 0) return null
  if (!loading && videos.length === 0) return null

  return (
    <motion.section
      className="space-y-3"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold tracking-tight text-gray-900 dark:text-white">
          Continue watching
        </h2>
        <Link
          to="/history"
          className="text-xs font-medium text-gray-500 transition-colors hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
        >
          See all
        </Link>
      </div>

      <div
        ref={scrollRef}
        className="flex gap-3 overflow-x-auto scrollbar-hide pb-1"
      >
        {loading
          ? [...Array(Math.min(eligibleIds.length, 4))].map((_, i) => (
              <div
                key={i}
                className="w-52 shrink-0 animate-pulse sm:w-60"
              >
                <div className="aspect-video rounded-xl bg-gray-100 dark:bg-gray-800" />
                <div className="mt-2 space-y-1.5">
                  <div className="h-3.5 w-4/5 rounded bg-gray-100 dark:bg-gray-800" />
                  <div className="h-3 w-3/5 rounded bg-gray-100 dark:bg-gray-800" />
                </div>
              </div>
            ))
          : videos.map((video) => {
              const positionSec = playbackPositions[video.id] ?? 0
              const duration = video.lengthSeconds ?? 0
              const pct = duration > 0 ? Math.min((positionSec / duration) * 100, 100) : 0

              return (
                <Link
                  key={video.id}
                  to={`/watch/${video.id}?t=${positionSec}`}
                  className="group w-52 shrink-0 sm:w-60"
                >
                  <div className="relative aspect-video overflow-hidden rounded-xl bg-gray-100 dark:bg-gray-800">
                    <img
                      src={video.thumbnail}
                      alt=""
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      loading="lazy"
                    />
                    {video.duration && !video.duration.startsWith('-') && (
                      <span className="absolute bottom-6 right-1.5 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-medium tabular-nums text-white/90 backdrop-blur-sm">
                        {video.duration}
                      </span>
                    )}
                    <div className="absolute inset-x-0 bottom-0 h-1 bg-gray-700/60">
                      <div
                        className={cn(
                          'h-full rounded-r-full bg-red-500 transition-all duration-300',
                        )}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                  <div className="mt-2 space-y-0.5">
                    <p className="line-clamp-2 text-[13px] font-medium leading-snug text-gray-900 dark:text-gray-100">
                      {video.title}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {video.channelName}
                    </p>
                  </div>
                </Link>
              )
            })}
      </div>
    </motion.section>
  )
}
