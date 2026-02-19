import { useState, useRef, useCallback, useEffect } from 'react'
import { Button } from '@/components/base/buttons/button'
import { VideoCard } from '@/components/video/VideoCard'
import { useUserData } from '@/hooks/useUserData'
import { useVideosByIds } from '@/hooks/useYouTube'
import { PageHeader } from '@/components/ui/PageHeader'
import { DatePicker } from '@/components/application/date-picker/date-picker'
import { parseDate } from '@internationalized/date'
import { Clock, Trash01, SearchMd } from '@untitledui/icons'

const INITIAL_COUNT = 16
const LOAD_MORE_COUNT = 16

function formatWatchedAt(watchedAt: string | number): string {
  const d = new Date(watchedAt)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays} days ago`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: d.getFullYear() !== now.getFullYear() ? 'numeric' : undefined })
}

/** Fuzzy match: query chars must appear in order in text (case-insensitive) */
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

export function HistoryPage() {
  const { history, clearHistory } = useUserData()
  const { videos, loading } = useVideosByIds(history.map((h) => h.videoId))
  const [visibleCount, setVisibleCount] = useState(INITIAL_COUNT)
  const [filterDate, setFilterDate] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const sentinelRef = useRef<HTMLDivElement>(null)

  let historyWithVideos = history
    .map((entry, i) => ({ ...entry, video: videos[i] }))
    .filter(
      (entry): entry is typeof entry & { video: NonNullable<typeof entry.video> } =>
        !!entry.video
    )

  if (filterDate) {
    historyWithVideos = historyWithVideos.filter(
      (entry) =>
        new Date(entry.watchedAt).toDateString() === new Date(filterDate!).toDateString()
    )
  }

  if (searchQuery.trim()) {
    historyWithVideos = historyWithVideos.filter((entry) =>
      fuzzyMatch(entry.video.title, searchQuery) ||
      fuzzyMatch(entry.video.channelName, searchQuery)
    )
  }

  const displayedHistory = historyWithVideos.slice(0, visibleCount)
  const hasMore = visibleCount < historyWithVideos.length

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

  if (history.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center animate-fade-in">
        <div className="flex size-20 items-center justify-center rounded-2xl bg-gray-50 dark:bg-gray-800">
          <Clock className="size-10 text-gray-300 dark:text-gray-600" />
        </div>
        <h2 className="mt-5 text-lg font-semibold text-gray-900 dark:text-white">
          No watch history
        </h2>
        <p className="mt-2 max-w-xs text-sm text-gray-400 dark:text-gray-500">
          Videos you watch will appear here. Start watching to build your history.
        </p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Watch history" description="Loading..." />
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="aspect-video rounded-2xl bg-gray-100 dark:bg-gray-800" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (historyWithVideos.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader title="Watch history" />
        <p className="py-16 text-center text-sm text-gray-400 dark:text-gray-500">
          {searchQuery.trim()
            ? `No videos match "${searchQuery}"`
            : 'No history entries found.'}
        </p>
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
                className="w-48 rounded-xl border border-gray-200/60 bg-white/80 py-2 pl-9 pr-3 text-sm text-gray-900 placeholder-gray-400 outline-none transition-colors focus:border-gray-400 dark:border-gray-700/60 dark:bg-gray-900/50 dark:text-white dark:placeholder-gray-500 dark:focus:border-gray-600"
              />
            </div>
            <DatePicker
              value={filterDate ? parseDate(filterDate) : null}
              onChange={(v) => setFilterDate(v ? v.toString() : null)}
              onApply={() => {}}
            />
            <Button
              onClick={clearHistory}
              color="tertiary"
              size="sm"
              className="rounded-xl"
              iconLeading={Trash01}
            >
              Clear
            </Button>
          </div>
        }
      />
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {displayedHistory.map(({ videoId, watchedAt, video }, i) =>
          video ? (
            <div
              key={`${videoId}-${watchedAt}`}
              className="animate-fade-in"
              style={{ animationDelay: `${Math.min(i, 12) * 30}ms` }}
            >
              <VideoCard video={video} index={i} />
              <p className="mt-3 flex items-center gap-1.5 pl-11 text-sm text-gray-500 dark:text-gray-400">
                <Clock className="size-3.5 shrink-0" />
                <span>Watched {formatWatchedAt(watchedAt)}</span>
              </p>
            </div>
          ) : null
        )}
      </div>
      {hasMore && <div ref={sentinelRef} className="h-1" />}
    </div>
  )
}
