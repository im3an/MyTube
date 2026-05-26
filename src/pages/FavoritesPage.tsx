import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/base/buttons/button'
import { VideoCard } from '@/components/video/VideoCard'
import { VideoCardSkeleton } from '@/components/video/VideoCardSkeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { useVideosByIds } from '@/hooks/useYouTube'
import { useUserData } from '@/hooks/useUserData'
import { PageHeader } from '@/components/ui/PageHeader'
import type { AppVideo } from '@/hooks/useYouTube'
import { Heart, Trash01, CheckSquare, Square, X, FilterLines } from '@untitledui/icons'
import { cn } from '@/lib/utils'

type SortOption = 'date-added' | 'alpha'

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

export function FavoritesPage() {
  const { favorites, removeMultipleFromFavorites, toggleFavorite } = useUserData()
  const { videos, loading } = useVideosByIds(favorites)

  const [sortBy, setSortBy] = useState<SortOption>('date-added')
  const [selectMode, setSelectMode] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const sortedVideos = useCallback((): AppVideo[] => {
    const list = [...videos]
    if (sortBy === 'alpha') list.sort((a, b) => a.title.localeCompare(b.title))
    else {
      // date-added: preserve favorites order (most recent first)
      const order = [...favorites].reverse()
      list.sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id))
    }
    return list
  }, [videos, sortBy, favorites])

  const displayed = sortedVideos()
  const totalDuration = formatTotalDuration(
    displayed.reduce((sum, v) => sum + parseDurationSeconds(v.duration), 0)
  )

  const toggleSelect = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const selectAll = useCallback(() => {
    setSelected(new Set(displayed.map((v) => v.id)))
  }, [displayed])

  const clearSelect = useCallback(() => {
    setSelected(new Set())
    setSelectMode(false)
  }, [])

  const deleteSelected = useCallback(() => {
    removeMultipleFromFavorites(Array.from(selected))
    setSelected(new Set())
    setSelectMode(false)
    setShowDeleteConfirm(false)
  }, [selected, removeMultipleFromFavorites])

  if (favorites.length === 0) {
    return (
      <EmptyState
        icon={<Heart className="size-10 text-gray-300 dark:text-gray-600" />}
        title="No liked videos yet"
        description="Videos you like will appear here. Use the heart button on any video to save them."
      />
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <PageHeader
            title="Liked videos"
            description={[
              `${favorites.length} video${favorites.length === 1 ? '' : 's'}`,
              totalDuration ? `· ${totalDuration} total` : '',
            ]
              .filter(Boolean)
              .join(' ')}
          />
        </div>

        {/* Controls */}
        <div className="flex shrink-0 items-center gap-2">
          {/* Sort */}
          <div className="flex items-center gap-1 rounded-xl border border-gray-200/60 bg-white/70 p-1 backdrop-blur-sm dark:border-gray-700/40 dark:bg-gray-900/60">
            {(['date-added', 'alpha'] as const).map((opt) => (
              <button
                key={opt}
                onClick={() => setSortBy(opt)}
                className={cn(
                  'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all duration-200',
                  sortBy === opt
                    ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900'
                    : 'text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200'
                )}
              >
                {opt === 'date-added' ? (
                  <>
                    <FilterLines className="size-3.5" />
                    Recently liked
                  </>
                ) : (
                  'A–Z'
                )}
              </button>
            ))}
          </div>

          {/* Select mode */}
          {!selectMode ? (
            <Button
              color="secondary"
              size="sm"
              onClick={() => setSelectMode(true)}
            >
              <CheckSquare className="size-4" />
              Select
            </Button>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {selected.size} selected
              </span>
              <Button color="secondary" size="sm" onClick={selectAll}>
                All
              </Button>
              {selected.size > 0 && (
                <Button
                  color="secondary-destructive"
                  size="sm"
                  onClick={() => setShowDeleteConfirm(true)}
                >
                  <Trash01 className="size-4" />
                  Remove
                </Button>
              )}
              <Button color="secondary" size="sm" onClick={clearSelect}>
                <X className="size-4" />
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Delete confirmation */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="flex items-center justify-between rounded-xl border border-red-200/60 bg-red-50/80 px-4 py-3 dark:border-red-900/40 dark:bg-red-950/40"
          >
            <p className="text-sm text-red-700 dark:text-red-300">
              Remove {selected.size} video{selected.size === 1 ? '' : 's'} from liked?
            </p>
            <div className="flex gap-2">
              <Button
                color="secondary"
                size="sm"
                onClick={() => setShowDeleteConfirm(false)}
              >
                Cancel
              </Button>
              <Button color="primary-destructive" size="sm" onClick={deleteSelected}>
                Remove
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <VideoCardSkeleton key={i} />
          ))}
        </div>
      ) : displayed.length === 0 ? (
        <EmptyState
          icon={<Heart className="size-10 text-gray-300 dark:text-gray-600" />}
          title="No videos found"
          description="None of your liked videos could be loaded."
        />
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <AnimatePresence>
            {displayed.map((video, i) => (
              <motion.div
                key={video.id}
                layout
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2, delay: i * 0.02 }}
                className="relative"
              >
                {selectMode && (
                  <button
                    onClick={() => toggleSelect(video.id)}
                    className="absolute left-2 top-2 z-10 flex size-6 items-center justify-center rounded-md bg-white/90 shadow-sm backdrop-blur-sm transition-colors hover:bg-white dark:bg-gray-900/90 dark:hover:bg-gray-800"
                  >
                    {selected.has(video.id) ? (
                      <CheckSquare className="size-4 text-gray-900 dark:text-white" />
                    ) : (
                      <Square className="size-4 text-gray-400" />
                    )}
                  </button>
                )}
                <VideoCard
                  video={video}
                  index={i}
                  showRemove={!selectMode}
                  onRemove={() => toggleFavorite(video.id)}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}
