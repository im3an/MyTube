import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Heart, LayoutGrid01, List, RefreshCw01, SearchMd, X, AlertCircle } from '@untitledui/icons'
import { Avatar } from '@/components/base/avatar/avatar'
import { PageHeader } from '@/components/ui/PageHeader'
import { VideoCard } from '@/components/video/VideoCard'
import { useUserData } from '@/hooks/useUserData'
import { useChannelAvatar } from '@/hooks/useChannelAvatar'
import { useSubscriptionFeed } from '@/hooks/useSubscriptionFeed'
import { toAppVideo } from '@/api/youtube'
import type { FeedVideo } from '@/hooks/useSubscriptionFeed'
import type { FavoriteCreator } from '@/hooks/useUserData'
import { cn } from '@/lib/utils'

const LAST_VISITED_KEY = 'subFeedLastVisited'
const VIEW_PREF_KEY = 'subFeedView'
const MAX_FEED = 30

function getLastVisited(): number {
  try {
    return parseInt(localStorage.getItem(LAST_VISITED_KEY) ?? '0', 10) || 0
  } catch {
    return 0
  }
}

function setLastVisited(ts: number): void {
  try {
    localStorage.setItem(LAST_VISITED_KEY, String(ts))
  } catch {}
}

function getViewPref(): 'grid' | 'list' {
  try {
    const v = localStorage.getItem(VIEW_PREF_KEY)
    return v === 'list' ? 'list' : 'grid'
  } catch {
    return 'grid'
  }
}

function setViewPref(v: 'grid' | 'list'): void {
  try {
    localStorage.setItem(VIEW_PREF_KEY, v)
  } catch {}
}

interface CreatorChipProps {
  creator: FavoriteCreator
  active: boolean
  newCount: number
  onClick: () => void
}

function CreatorChip({ creator, active, newCount, onClick }: CreatorChipProps) {
  const avatar = useChannelAvatar(creator.id, creator.avatar ?? '')
  return (
    <button
      onClick={onClick}
      className={cn(
        'group relative flex flex-col items-center gap-2 rounded-2xl px-3 py-3 transition-all duration-200 shrink-0',
        active
          ? 'bg-gray-900 dark:bg-white'
          : 'hover:bg-gray-100 dark:hover:bg-gray-800/60'
      )}
    >
      <div className="relative">
        <Avatar
          src={avatar}
          alt={creator.name}
          size="lg"
          className={cn(
            'transition-transform duration-300',
            active ? 'ring-2 ring-white dark:ring-gray-900' : 'group-hover:scale-105'
          )}
        />
        {newCount > 0 && (
          <span className="absolute -right-1 -top-1 flex size-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white ring-2 ring-white dark:ring-gray-900">
            {newCount > 9 ? '9+' : newCount}
          </span>
        )}
      </div>
      <span
        className={cn(
          'w-16 truncate text-center text-xs font-medium',
          active
            ? 'text-white dark:text-gray-900'
            : 'text-gray-600 dark:text-gray-400'
        )}
      >
        {creator.name}
      </span>
    </button>
  )
}

interface ListRowProps {
  video: FeedVideo
  isNew: boolean
}

function ListRow({ video, isNew }: ListRowProps) {
  const appVideo = toAppVideo(video)
  return (
    <Link
      to={`/watch/${appVideo.id}`}
      className="group flex gap-4 rounded-2xl p-3 transition-colors duration-200 hover:bg-gray-50 dark:hover:bg-gray-800/40"
    >
      <div className="relative h-[90px] w-40 shrink-0 overflow-hidden rounded-xl bg-gray-100 dark:bg-gray-800">
        <img
          src={appVideo.thumbnail}
          alt=""
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
        />
        {isNew && (
          <span className="absolute left-1.5 top-1.5 rounded-md bg-red-500 px-1.5 py-0.5 text-[10px] font-bold uppercase text-white">
            New
          </span>
        )}
        {appVideo.liveNow ? (
          <span className="absolute bottom-1 right-1 rounded border border-red-400/40 bg-red-500/90 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-white">
            Live
          </span>
        ) : appVideo.duration && !appVideo.duration.startsWith('-') ? (
          <span className="absolute bottom-1 right-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-medium tabular-nums text-white/90">
            {appVideo.duration}
          </span>
        ) : null}
      </div>
      <div className="flex min-w-0 flex-1 flex-col justify-center gap-1">
        <h3 className="line-clamp-2 text-[14px] font-medium leading-snug text-gray-900 dark:text-gray-100">
          {appVideo.title}
        </h3>
        <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
          {video.channelName}
        </p>
        <p className="text-xs text-gray-400 dark:text-gray-500">
          {appVideo.views ? `${appVideo.views} views` : ''}
          {appVideo.views && appVideo.uploadedAt ? ' · ' : ''}
          {appVideo.uploadedAt}
        </p>
      </div>
    </Link>
  )
}

interface ManageModalProps {
  creators: FavoriteCreator[]
  onClose: () => void
  onUnsubscribe: (id: string) => void
}

function ManageModal({ creators, onClose, onUnsubscribe }: ManageModalProps) {
  const [pendingId, setPendingId] = useState<string | null>(null)

  const handleUnsubscribe = useCallback(
    (id: string) => {
      if (pendingId === id) {
        onUnsubscribe(id)
        setPendingId(null)
      } else {
        setPendingId(id)
      }
    },
    [pendingId, onUnsubscribe]
  )

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 24 }}
        transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
        className="relative z-10 w-full max-w-md rounded-t-3xl bg-white p-6 shadow-2xl dark:bg-gray-900 sm:rounded-3xl"
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Manage subscriptions
          </h2>
          <button
            onClick={onClose}
            className="flex size-8 items-center justify-center rounded-xl text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800 dark:hover:text-gray-200"
          >
            <X className="size-4" />
          </button>
        </div>

        {creators.length === 0 ? (
          <p className="py-8 text-center text-sm text-gray-400">No subscriptions yet.</p>
        ) : (
          <ul className="max-h-[60vh] divide-y divide-gray-100 overflow-y-auto dark:divide-gray-800">
            {creators.map((c) => (
              <ManageRow
                key={c.id}
                creator={c}
                confirmPending={pendingId === c.id}
                onUnsubscribe={handleUnsubscribe}
                onCancelConfirm={() => setPendingId(null)}
              />
            ))}
          </ul>
        )}
      </motion.div>
    </div>
  )
}

interface ManageRowProps {
  creator: FavoriteCreator
  confirmPending: boolean
  onUnsubscribe: (id: string) => void
  onCancelConfirm: () => void
}

function ManageRow({ creator, confirmPending, onUnsubscribe, onCancelConfirm }: ManageRowProps) {
  const avatar = useChannelAvatar(creator.id, creator.avatar ?? '')
  return (
    <li className="flex items-center gap-3 py-3">
      <Link to={`/channel/${creator.id}`}>
        <Avatar src={avatar} alt={creator.name} size="sm" />
      </Link>
      <Link
        to={`/channel/${creator.id}`}
        className="min-w-0 flex-1 text-sm font-medium text-gray-900 hover:underline dark:text-white"
      >
        {creator.name}
      </Link>
      {confirmPending ? (
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">Remove?</span>
          <button
            onClick={() => onUnsubscribe(creator.id)}
            className="rounded-lg bg-red-500 px-2.5 py-1 text-xs font-semibold text-white transition-colors hover:bg-red-600"
          >
            Yes
          </button>
          <button
            onClick={onCancelConfirm}
            className="rounded-lg bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-700 transition-colors hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            No
          </button>
        </div>
      ) : (
        <button
          onClick={() => onUnsubscribe(creator.id)}
          className="shrink-0 rounded-xl px-3 py-1.5 text-xs font-medium text-gray-500 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:text-red-400"
        >
          Unsubscribe
        </button>
      )}
    </li>
  )
}

function EmptyState() {
  const suggested = [
    { label: 'Tech creators', query: 'tech youtuber' },
    { label: 'Gaming', query: 'gaming channel' },
    { label: 'Science', query: 'science education channel' },
  ]
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center animate-fade-in">
      <div className="flex size-20 items-center justify-center rounded-2xl bg-gray-50 dark:bg-gray-800">
        <Heart className="size-10 text-gray-300 dark:text-gray-600" />
      </div>
      <h2 className="mt-5 text-lg font-semibold text-gray-900 dark:text-white">
        You haven&apos;t subscribed to any creators yet
      </h2>
      <p className="mt-2 max-w-sm text-sm text-gray-400 dark:text-gray-500">
        Visit any channel page and tap the heart to subscribe. Their latest uploads will appear here.
      </p>
      <Link
        to="/search"
        className="mt-6 flex items-center gap-2 rounded-xl bg-gray-900 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-gray-800 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100"
      >
        <SearchMd className="size-4" />
        Discover creators
      </Link>
      <div className="mt-10 flex flex-wrap justify-center gap-3">
        {suggested.map((s) => (
          <Link
            key={s.label}
            to={`/search?q=${encodeURIComponent(s.query)}`}
            className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-600 shadow-sm transition-colors hover:border-gray-300 hover:text-gray-900 dark:border-gray-700 dark:bg-gray-800/50 dark:text-gray-400 dark:hover:border-gray-600 dark:hover:text-gray-200"
          >
            {s.label}
          </Link>
        ))}
      </div>
    </div>
  )
}

function SkeletonGrid() {
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="space-y-3 animate-pulse">
          <div className="aspect-video rounded-2xl bg-gray-100 dark:bg-gray-800" />
          <div className="flex gap-3">
            <div className="size-8 shrink-0 rounded-full bg-gray-100 dark:bg-gray-800" />
            <div className="flex-1 space-y-2">
              <div className="h-3 w-4/5 rounded bg-gray-100 dark:bg-gray-800" />
              <div className="h-3 w-2/5 rounded bg-gray-100 dark:bg-gray-800" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

export function SubscriptionsPage() {
  const { favoriteCreators, removeFavoriteCreator } = useUserData()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [view, setView] = useState<'grid' | 'list'>(getViewPref)
  const [manageOpen, setManageOpen] = useState(false)
  const lastVisitedRef = useRef(getLastVisited())

  useEffect(() => {
    const now = Date.now()
    setLastVisited(now)
    lastVisitedRef.current = getLastVisited()
  }, [])

  const handleViewToggle = useCallback((v: 'grid' | 'list') => {
    setView(v)
    setViewPref(v)
  }, [])

  const { videos, loading, error, refresh } = useSubscriptionFeed(favoriteCreators)

  const filteredVideos = selectedId
    ? videos.filter((v) => v.channelId === selectedId)
    : videos

  const displayVideos = filteredVideos.slice(0, MAX_FEED)

  function newCountFor(creatorId: string): number {
    return videos.filter(
      (v) =>
        v.channelId === creatorId &&
        v.published > 0 &&
        v.published * 1000 > lastVisitedRef.current
    ).length
  }

  function isNew(video: FeedVideo): boolean {
    return video.published > 0 && video.published * 1000 > lastVisitedRef.current
  }

  if (favoriteCreators.length === 0) {
    return <EmptyState />
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Subscriptions"
        description={`${favoriteCreators.length} creator${favoriteCreators.length === 1 ? '' : 's'} you follow`}
        actions={
          <button
            onClick={() => setManageOpen(true)}
            className="rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 hover:text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-white"
          >
            Manage
          </button>
        }
      />

      {/* Creator filter row */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1">
        <button
          onClick={() => setSelectedId(null)}
          className={cn(
            'flex shrink-0 items-center gap-1.5 rounded-2xl px-4 py-2.5 text-sm font-medium transition-all duration-200',
            selectedId === null
              ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900'
              : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800/60'
          )}
        >
          All
        </button>

        {favoriteCreators.map((creator) => (
          <CreatorChip
            key={creator.id}
            creator={creator}
            active={selectedId === creator.id}
            newCount={newCountFor(creator.id)}
            onClick={() =>
              setSelectedId((prev) => (prev === creator.id ? null : creator.id))
            }
          />
        ))}
      </div>

      {/* Feed header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">
            Latest uploads
          </h2>
          {!loading && displayVideos.length > 0 && (
            <span className="rounded-lg bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500 dark:bg-gray-800 dark:text-gray-400">
              {displayVideos.length}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={refresh}
            className="flex size-8 items-center justify-center rounded-xl text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800 dark:hover:text-gray-200"
            title="Refresh feed"
          >
            <RefreshCw01 className="size-4" />
          </button>
          <div className="flex overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700">
            <button
              onClick={() => handleViewToggle('grid')}
              className={cn(
                'flex size-8 items-center justify-center transition-colors',
                view === 'grid'
                  ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900'
                  : 'bg-white text-gray-400 hover:text-gray-700 dark:bg-gray-800 dark:text-gray-500 dark:hover:text-gray-200'
              )}
              title="Grid view"
            >
              <LayoutGrid01 className="size-4" />
            </button>
            <button
              onClick={() => handleViewToggle('list')}
              className={cn(
                'flex size-8 items-center justify-center transition-colors',
                view === 'list'
                  ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900'
                  : 'bg-white text-gray-400 hover:text-gray-700 dark:bg-gray-800 dark:text-gray-500 dark:hover:text-gray-200'
              )}
              title="List view"
            >
              <List className="size-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-3 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm text-red-600 dark:border-red-900/30 dark:bg-red-900/10 dark:text-red-400">
          <AlertCircle className="size-5 shrink-0" />
          {error}
        </div>
      )}

      {/* Feed */}
      {loading ? (
        <SkeletonGrid />
      ) : displayVideos.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <p className="text-sm text-gray-400 dark:text-gray-500">No videos found.</p>
          {selectedId && (
            <button
              onClick={() => setSelectedId(null)}
              className="mt-3 text-sm font-medium text-gray-600 underline dark:text-gray-400"
            >
              Show all creators
            </button>
          )}
        </div>
      ) : view === 'grid' ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {displayVideos.map((v, i) => {
            const appVideo = toAppVideo(v)
            const cardVideo = {
              ...appVideo,
              channelId: v.channelId,
            }
            return (
              <div key={`${v.videoId}-${i}`} className="relative">
                {isNew(v) && (
                  <span className="absolute left-2 top-2 z-30 rounded-md bg-red-500 px-1.5 py-0.5 text-[10px] font-bold uppercase text-white shadow">
                    New
                  </span>
                )}
                <VideoCard video={cardVideo} index={i} />
              </div>
            )
          })}
        </div>
      ) : (
        <div className="space-y-1">
          {displayVideos.map((v, i) => (
            <ListRow key={`${v.videoId}-${i}`} video={v} isNew={isNew(v)} />
          ))}
        </div>
      )}

      {/* Manage modal */}
      <AnimatePresence>
        {manageOpen && (
          <ManageModal
            creators={favoriteCreators}
            onClose={() => setManageOpen(false)}
            onUnsubscribe={(id) => {
              removeFavoriteCreator(id)
              if (selectedId === id) setSelectedId(null)
            }}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
