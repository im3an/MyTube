import { useState, useCallback, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/base/buttons/button'
import { useUserData } from '@/hooks/useUserData'
import { useVideosByIds } from '@/hooks/useYouTube'
import type { AppVideo } from '@/hooks/useYouTube'
import { PageHeader } from '@/components/ui/PageHeader'
import { EmptyState } from '@/components/ui/EmptyState'
import { VideoCardSkeleton } from '@/components/video/VideoCardSkeleton'
import {
  Bookmark,
  Trash01,
  CheckSquare,
  Square,
  X,
  Play,
  SortDesc,
  Clock,
} from '@untitledui/icons'
import { cn } from '@/lib/utils'

type SortOption = 'date-added' | 'length' | 'alpha'

function parseDurationSeconds(duration?: string): number {
  if (!duration) return 0
  const parts = duration.split(':').map(Number)
  if (parts.length === 3) return (parts[0] ?? 0) * 3600 + (parts[1] ?? 0) * 60 + (parts[2] ?? 0)
  if (parts.length === 2) return (parts[0] ?? 0) * 60 + (parts[1] ?? 0)
  return parts[0] ?? 0
}

function formatTotalDuration(seconds: number): string {
  if (seconds <= 0) return ''
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

export function WatchLaterPage() {
  const { watchLater, removeFromWatchLater, removeMultipleFromWatchLater } = useUserData()
  const videoIds = watchLater
  const { videos, loading } = useVideosByIds(videoIds)
  const navigate = useNavigate()

  const [sortBy, setSortBy] = useState<SortOption>('date-added')
  const [selectMode, setSelectMode] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [removingIds, setRemovingIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!selectMode) setSelected(new Set())
  }, [selectMode])

  const sortedVideos = [...videos].sort((a, b) => {
    if (sortBy === 'length') {
      return parseDurationSeconds(b.duration) - parseDurationSeconds(a.duration)
    }
    if (sortBy === 'alpha') {
      return a.title.localeCompare(b.title)
    }
    // date-added: preserve watchLater order (most recently added first)
    return videoIds.indexOf(a.id) - videoIds.indexOf(b.id)
  })

  const totalSeconds = sortedVideos.reduce((acc, v) => acc + parseDurationSeconds(v.duration), 0)
  const totalDuration = formatTotalDuration(totalSeconds)

  const allIds = sortedVideos.map((v) => v.id)
  const allSelected = allIds.length > 0 && allIds.every((id) => selected.has(id))

  const toggleSelect = useCallback((videoId: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(videoId)) next.delete(videoId)
      else next.add(videoId)
      return next
    })
  }, [])

  const handleDeleteSelected = useCallback(() => {
    const ids = Array.from(selected)
    setRemovingIds(new Set(ids))
    setTimeout(() => {
      removeMultipleFromWatchLater(ids)
      setSelected(new Set())
      setRemovingIds(new Set())
      if (ids.length === sortedVideos.length) setSelectMode(false)
    }, 250)
  }, [selected, removeMultipleFromWatchLater, sortedVideos.length])

  const handleRemoveSingle = useCallback(
    (videoId: string) => {
      setRemovingIds((prev) => new Set([...prev, videoId]))
      setTimeout(() => {
        removeFromWatchLater(videoId)
        setRemovingIds((prev) => {
          const next = new Set(prev)
          next.delete(videoId)
          return next
        })
      }, 250)
    },
    [removeFromWatchLater]
  )

  const handleWatchAll = useCallback(() => {
    if (sortedVideos.length > 0 && sortedVideos[0]) {
      navigate(`/watch/${sortedVideos[0].id}`)
    }
  }, [sortedVideos, navigate])

  if (watchLater.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader title="Watch later" description="0 videos saved" />
        <EmptyState
          icon={<Bookmark className="size-10 text-gray-300 dark:text-gray-600" />}
          title="Save videos to watch them later."
          description="Click the Save button on any video to add it here."
        />
      </div>
    )
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Watch later" description="Loading..." />
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex animate-pulse gap-3 rounded-xl p-2">
              <div className="h-20 w-36 shrink-0 rounded-lg bg-gray-100 dark:bg-gray-800" />
              <div className="flex flex-1 flex-col justify-center gap-2">
                <div className="h-4 w-3/4 rounded bg-gray-100 dark:bg-gray-800" />
                <div className="h-3 w-1/2 rounded bg-gray-100 dark:bg-gray-800" />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Watch later"
        description={`${sortedVideos.length} video${sortedVideos.length === 1 ? '' : 's'} saved${totalDuration ? ` · ${totalDuration}` : ''}`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {/* Sort */}
            <div className="flex items-center gap-1 rounded-xl border border-gray-200/60 bg-white/80 px-2 py-1 dark:border-gray-700/60 dark:bg-gray-900/50">
              <SortDesc className="size-4 text-gray-400 dark:text-gray-500" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="bg-transparent text-sm text-gray-700 outline-none dark:text-gray-300"
              >
                <option value="date-added">Date added</option>
                <option value="length">Video length</option>
                <option value="alpha">Alphabetical</option>
              </select>
            </div>

            <Button
              onClick={() => setSelectMode((v) => !v)}
              color={selectMode ? 'secondary' : 'tertiary'}
              size="sm"
              iconLeading={CheckSquare}
            >
              {selectMode ? 'Cancel' : 'Select'}
            </Button>

            {sortedVideos.length > 0 && (
              <Button onClick={handleWatchAll} color="primary" size="sm" iconLeading={Play}>
                Watch all
              </Button>
            )}
          </div>
        }
      />

      {/* Bulk action bar */}
      <AnimatePresence>
        {selectMode && selected.size > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="sticky top-2 z-20 flex items-center gap-3 rounded-xl border border-gray-200 bg-white/95 px-4 py-2.5 shadow-sm backdrop-blur-sm dark:border-gray-700 dark:bg-gray-900/95"
          >
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {selected.size} selected
            </span>
            <Button
              onClick={handleDeleteSelected}
              color="tertiary-destructive"
              size="sm"
              iconLeading={Trash01}
            >
              Remove selected
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Video list */}
      <div className="divide-y divide-gray-100 dark:divide-gray-800">
        <AnimatePresence initial={false}>
          {sortedVideos.map((video) => (
            <WatchLaterRow
              key={video.id}
              video={video}
              selectMode={selectMode}
              selected={selected.has(video.id)}
              removing={removingIds.has(video.id)}
              onToggleSelect={toggleSelect}
              onRemove={handleRemoveSingle}
            />
          ))}
        </AnimatePresence>
      </div>

      {/* Select all / deselect all */}
      {selectMode && (
        <div className="flex items-center gap-3 pb-2 pt-1">
          <button
            onClick={() => setSelected(allSelected ? new Set() : new Set(allIds))}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
          >
            {allSelected ? (
              <CheckSquare className="size-4 text-brand-600" />
            ) : (
              <Square className="size-4" />
            )}
            {allSelected ? 'Deselect all' : 'Select all'}
          </button>
        </div>
      )}
    </div>
  )
}

interface WatchLaterRowProps {
  video: AppVideo
  selectMode: boolean
  selected: boolean
  removing: boolean
  onToggleSelect: (id: string) => void
  onRemove: (id: string) => void
}

function WatchLaterRow({
  video,
  selectMode,
  selected,
  removing,
  onToggleSelect,
  onRemove,
}: WatchLaterRowProps) {
  return (
    <motion.div
      layout
      initial={{ opacity: 1 }}
      animate={{ opacity: removing ? 0 : 1, scale: removing ? 0.97 : 1 }}
      exit={{ opacity: 0, height: 0, marginBottom: 0 }}
      transition={{ duration: 0.22 }}
      className="group relative flex items-center gap-3 py-2 first:pt-0"
    >
      {selectMode && (
        <button
          onClick={() => onToggleSelect(video.id)}
          className="shrink-0 text-gray-400 hover:text-gray-700 dark:text-gray-500 dark:hover:text-gray-300"
          aria-label={selected ? 'Deselect' : 'Select'}
        >
          {selected ? (
            <CheckSquare className="size-5 text-brand-600" />
          ) : (
            <Square className="size-5" />
          )}
        </button>
      )}

      <Link
        to={`/watch/${video.id}`}
        className="relative h-20 w-36 shrink-0 overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-800"
      >
        <img
          src={video.thumbnail}
          alt=""
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
        />
        {video.duration && !video.duration.startsWith('-') && (
          <span className="absolute bottom-1 right-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-medium tabular-nums text-white/90">
            {video.duration}
          </span>
        )}
      </Link>

      <div className="min-w-0 flex-1">
        <Link
          to={`/watch/${video.id}`}
          className="line-clamp-2 text-[14px] font-medium leading-snug text-gray-900 hover:text-gray-700 dark:text-gray-100 dark:hover:text-white"
        >
          {video.title}
        </Link>
        <p className="mt-0.5 text-[12px] text-gray-500 dark:text-gray-400">
          {video.channelName}
        </p>
        {video.duration && (
          <p className="mt-0.5 flex items-center gap-1 text-[11px] text-gray-400 dark:text-gray-500">
            <Clock className="size-3" />
            {video.duration}
          </p>
        )}
      </div>

      <button
        onClick={() => onRemove(video.id)}
        className={cn(
          'shrink-0 rounded-lg p-1.5 text-gray-300 transition-opacity hover:text-gray-600 dark:text-gray-600 dark:hover:text-gray-300',
          'opacity-0 group-hover:opacity-100'
        )}
        aria-label="Remove from watch later"
      >
        <X className="size-4" />
      </button>
    </motion.div>
  )
}
