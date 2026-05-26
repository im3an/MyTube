import { useState, useRef, useCallback, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/base/buttons/button'
import { useUserData } from '@/hooks/useUserData'
import { useVideosByIds } from '@/hooks/useYouTube'
import { PageHeader } from '@/components/ui/PageHeader'
import { EmptyState } from '@/components/ui/EmptyState'
import { DatePicker } from '@/components/application/date-picker/date-picker'
import { parseDate } from '@internationalized/date'
import { Clock, Trash01, SearchMd, CheckSquare, Square, X, PauseCircle, PlayCircle } from '@untitledui/icons'

const INITIAL_COUNT = 24
const LOAD_MORE_COUNT = 24
const PAUSE_HISTORY_KEY = 'mytube-pause-history'

type DateGroup = 'Today' | 'Yesterday' | 'This week' | 'Last month' | 'Older'

function getDateGroup(watchedAt: string | number): DateGroup {
  const d = new Date(watchedAt)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return 'This week'
  if (diffDays < 30) return 'Last month'
  return 'Older'
}

function formatWatchedAt(watchedAt: string | number): string {
  const d = new Date(watchedAt)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  if (diffDays === 0) {
    return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
  }
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays} days ago`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: d.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  })
}

function fuzzyMatch(text: string, query: string): boolean {
  if (!query.trim()) return true
  const t = text.toLowerCase()
  const q = query.toLowerCase().trim()
  let j = 0
  for (let i = 0; i < t.length && j < q.length; i++) {
    if (t[i] === q[j]) j++
  }
  return j === q.length
}

const DATE_GROUP_ORDER: DateGroup[] = ['Today', 'Yesterday', 'This week', 'Last month', 'Older']

export function HistoryPage() {
  const { history, clearHistory, removeFromHistory, removeMultipleFromHistory } = useUserData()
  const { videos, loading } = useVideosByIds(history.map((h) => h.videoId))
  const [visibleCount, setVisibleCount] = useState(INITIAL_COUNT)
  const [filterDate, setFilterDate] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectMode, setSelectMode] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  const [pauseHistory, setPauseHistory] = useState(() => localStorage.getItem(PAUSE_HISTORY_KEY) === 'true')
  const [removingIds, setRemovingIds] = useState<Set<string>>(new Set())
  const sentinelRef = useRef<HTMLDivElement>(null)

  const togglePause = useCallback(() => {
    setPauseHistory((prev) => {
      const next = !prev
      localStorage.setItem(PAUSE_HISTORY_KEY, String(next))
      return next
    })
  }, [])

  let historyWithVideos = history
    .map((entry, i) => ({ ...entry, video: videos[i] }))
    .filter(
      (entry): entry is typeof entry & { video: NonNullable<typeof entry.video> } => !!entry.video
    )

  if (filterDate) {
    historyWithVideos = historyWithVideos.filter(
      (entry) => new Date(entry.watchedAt).toDateString() === new Date(filterDate!).toDateString()
    )
  }

  if (searchQuery.trim()) {
    historyWithVideos = historyWithVideos.filter(
      (entry) =>
        fuzzyMatch(entry.video.title, searchQuery) ||
        fuzzyMatch(entry.video.channelName, searchQuery)
    )
  }

  const displayedHistory = historyWithVideos.slice(0, visibleCount)
  const hasMore = visibleCount < historyWithVideos.length

  const grouped = DATE_GROUP_ORDER.map((group) => ({
    group,
    items: displayedHistory.filter((e) => getDateGroup(e.watchedAt) === group),
  })).filter((g) => g.items.length > 0)

  const loadMore = useCallback(() => {
    setVisibleCount((c) => Math.min(c + LOAD_MORE_COUNT, historyWithVideos.length))
  }, [historyWithVideos.length])

  const handleIntersect = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      if (entries[0]?.isIntersecting) loadMore()
    },
    [loadMore]
  )

  useEffect(() => {
    setVisibleCount(INITIAL_COUNT)
  }, [searchQuery, filterDate])

  useEffect(() => {
    const el = sentinelRef.current
    if (!el || !hasMore) return
    const observer = new IntersectionObserver(handleIntersect, { rootMargin: '300px' })
    observer.observe(el)
    return () => observer.disconnect()
  }, [handleIntersect, hasMore, historyWithVideos.length])

  useEffect(() => {
    if (!selectMode) setSelected(new Set())
  }, [selectMode])

  const allIds = displayedHistory.map((e) => e.videoId)
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
      removeMultipleFromHistory(ids)
      setSelected(new Set())
      setRemovingIds(new Set())
      if (ids.length === historyWithVideos.length) setSelectMode(false)
    }, 250)
  }, [selected, removeMultipleFromHistory, historyWithVideos.length])

  const handleRemoveSingle = useCallback(
    (videoId: string) => {
      setRemovingIds((prev) => new Set([...prev, videoId]))
      setTimeout(() => {
        removeFromHistory(videoId)
        setRemovingIds((prev) => {
          const next = new Set(prev)
          next.delete(videoId)
          return next
        })
      }, 250)
    },
    [removeFromHistory]
  )

  if (history.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Watch history"
          description="0 videos"
          actions={
            <Button
              onClick={togglePause}
              color="tertiary"
              size="sm"
              iconLeading={pauseHistory ? PlayCircle : PauseCircle}
            >
              {pauseHistory ? 'Resume' : 'Pause'} history
            </Button>
          }
        />
        <EmptyState
          icon={<Clock className="size-10 text-gray-300 dark:text-gray-600" />}
          title="Your watch history is empty"
          description="Videos you watch will appear here."
        />
      </div>
    )
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Watch history" description="Loading..." />
        <div className="space-y-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
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
        title="Watch history"
        description={`${historyWithVideos.length} video${historyWithVideos.length === 1 ? '' : 's'} watched`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <SearchMd className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search history..."
                className="w-44 rounded-xl border border-gray-200/60 bg-white/80 py-2 pl-9 pr-3 text-sm text-gray-900 placeholder-gray-400 outline-none transition-colors focus:border-gray-400 dark:border-gray-700/60 dark:bg-gray-900/50 dark:text-white dark:placeholder-gray-500 dark:focus:border-gray-600"
              />
            </div>
            <DatePicker
              value={filterDate ? parseDate(filterDate) : null}
              onChange={(v) => setFilterDate(v ? v.toString() : null)}
              onApply={() => {}}
            />
            <Button
              onClick={togglePause}
              color="tertiary"
              size="sm"
              iconLeading={pauseHistory ? PlayCircle : PauseCircle}
            >
              {pauseHistory ? 'Resume' : 'Pause'}
            </Button>
            <Button
              onClick={() => setSelectMode((v) => !v)}
              color={selectMode ? 'secondary' : 'tertiary'}
              size="sm"
              iconLeading={CheckSquare}
            >
              {selectMode ? 'Cancel' : 'Select'}
            </Button>
            <Button
              onClick={() => setShowClearConfirm(true)}
              color="tertiary"
              size="sm"
              iconLeading={Trash01}
            >
              Clear all
            </Button>
          </div>
        }
      />

      {pauseHistory && (
        <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-800/40 dark:bg-amber-900/20 dark:text-amber-300">
          <PauseCircle className="size-4 shrink-0" />
          History tracking is paused. New videos won't be recorded.
        </div>
      )}

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
              Delete selected
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {historyWithVideos.length === 0 ? (
        <p className="py-16 text-center text-sm text-gray-400 dark:text-gray-500">
          {searchQuery.trim() ? `No videos match "${searchQuery}"` : 'No history entries found.'}
        </p>
      ) : (
        <div className="space-y-8">
          {grouped.map(({ group, items }) => (
            <div key={group}>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                  {group}
                </h2>
                {selectMode && (
                  <button
                    onClick={() => {
                      const groupIds = items.map((e) => e.videoId)
                      const allGroupSelected = groupIds.every((id) => selected.has(id))
                      setSelected((prev) => {
                        const next = new Set(prev)
                        if (allGroupSelected) groupIds.forEach((id) => next.delete(id))
                        else groupIds.forEach((id) => next.add(id))
                        return next
                      })
                    }}
                    className="text-xs text-gray-400 hover:text-gray-700 dark:text-gray-500 dark:hover:text-gray-300"
                  >
                    {items.every((e) => selected.has(e.videoId)) ? 'Deselect group' : 'Select group'}
                  </button>
                )}
              </div>
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                <AnimatePresence initial={false}>
                  {items.map((entry) => (
                    <motion.div
                      key={entry.videoId}
                      layout
                      initial={{ opacity: 1 }}
                      animate={{ opacity: removingIds.has(entry.videoId) ? 0 : 1, scale: removingIds.has(entry.videoId) ? 0.97 : 1 }}
                      exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                      transition={{ duration: 0.22 }}
                      className="group relative flex items-center gap-3 py-2 first:pt-0"
                    >
                      {selectMode && (
                        <button
                          onClick={() => toggleSelect(entry.videoId)}
                          className="shrink-0 text-gray-400 hover:text-gray-700 dark:text-gray-500 dark:hover:text-gray-300"
                          aria-label={selected.has(entry.videoId) ? 'Deselect' : 'Select'}
                        >
                          {selected.has(entry.videoId) ? (
                            <CheckSquare className="size-5 text-brand-600" />
                          ) : (
                            <Square className="size-5" />
                          )}
                        </button>
                      )}
                      <Link
                        to={`/watch/${entry.videoId}`}
                        className="relative h-20 w-36 shrink-0 overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-800"
                      >
                        <img
                          src={entry.video.thumbnail}
                          alt=""
                          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                          loading="lazy"
                        />
                        {entry.video.duration && !entry.video.duration.startsWith('-') && (
                          <span className="absolute bottom-1 right-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-medium tabular-nums text-white/90">
                            {entry.video.duration}
                          </span>
                        )}
                      </Link>
                      <div className="min-w-0 flex-1">
                        <Link
                          to={`/watch/${entry.videoId}`}
                          className="line-clamp-2 text-[14px] font-medium leading-snug text-gray-900 hover:text-gray-700 dark:text-gray-100 dark:hover:text-white"
                        >
                          {entry.video.title}
                        </Link>
                        <p className="mt-0.5 text-[12px] text-gray-500 dark:text-gray-400">
                          {entry.video.channelName}
                        </p>
                        <p className="mt-0.5 flex items-center gap-1 text-[11px] text-gray-400 dark:text-gray-500">
                          <Clock className="size-3" />
                          {formatWatchedAt(entry.watchedAt)}
                        </p>
                      </div>
                      <button
                        onClick={() => handleRemoveSingle(entry.videoId)}
                        className="shrink-0 rounded-lg p-1.5 text-gray-300 opacity-0 transition-opacity hover:text-gray-600 group-hover:opacity-100 dark:text-gray-600 dark:hover:text-gray-300"
                        aria-label="Remove from history"
                      >
                        <X className="size-4" />
                      </button>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>
          ))}

          {selectMode && (
            <div className="flex items-center gap-3 pb-2 pt-1">
              <button
                onClick={() =>
                  setSelected(allSelected ? new Set() : new Set(allIds))
                }
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
      )}

      {hasMore && <div ref={sentinelRef} className="h-1" />}

      <AnimatePresence>
        {showClearConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
            onClick={() => setShowClearConfirm(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.18 }}
              onClick={(e) => e.stopPropagation()}
              className="mx-4 w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-900"
            >
              <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                Clear watch history?
              </h3>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                This will permanently remove all {historyWithVideos.length} videos from your history. This action cannot be undone.
              </p>
              <div className="mt-5 flex gap-3">
                <Button
                  onClick={() => setShowClearConfirm(false)}
                  color="secondary"
                  size="sm"
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    clearHistory()
                    setShowClearConfirm(false)
                    setSelectMode(false)
                  }}
                  color="primary-destructive"
                  size="sm"
                  className="flex-1"
                >
                  Clear history
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
