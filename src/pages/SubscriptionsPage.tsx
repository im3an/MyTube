import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { PageHeader } from '@/components/ui/PageHeader'
import { Avatar } from '@/components/base/avatar/avatar'
import { getInitials } from '@/components/base/avatar/utils'
import { Button } from '@/components/base/buttons/button'
import { VideoCard } from '@/components/video/VideoCard'
import { useUserData } from '@/hooks/useUserData'
import { useSubscriptionFeed } from '@/hooks/useSubscriptionFeed'
import { useChannelAvatar } from '@/hooks/useChannelAvatar'
import { toAppVideo } from '@/api/youtube'
import { cn } from '@/lib/utils'
import {
  Heart,
  LayoutGrid01,
  List,
  RefreshCw01,
  SearchMd,
  X,
} from '@untitledui/icons'

const LAST_VISITED_KEY = 'subFeedLastVisited'
const GRID_MODE_KEY = 'subFeedGridMode'
const MAX_FEED_VIDEOS = 30

function CreatorChip({
  id,
  name,
  avatar,
  selected,
  onClick,
}: {
  id: string
  name: string
  avatar?: string
  selected: boolean
  onClick: () => void
}) {
  const resolved = useChannelAvatar(id, avatar ?? '')
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex shrink-0 flex-col items-center gap-1.5 rounded-2xl px-3 py-2 transition-all duration-200',
        selected
          ? 'bg-gray-900 dark:bg-white'
          : 'hover:bg-gray-100 dark:hover:bg-gray-800/60',
      )}
    >
      <div
        className={cn(
          'relative rounded-full ring-2 transition-all duration-200',
          selected
            ? 'ring-white dark:ring-gray-900'
            : 'ring-transparent',
        )}
      >
        <Avatar
          src={resolved}
          alt={name}
          size="lg"
          initials={!resolved ? getInitials(name).toUpperCase() || undefined : undefined}
        />
      </div>
      <span
        className={cn(
          'max-w-[72px] truncate text-center text-[11px] font-medium',
          selected
            ? 'text-white dark:text-gray-900'
            : 'text-gray-600 dark:text-gray-400',
        )}
      >
        {name}
      </span>
    </button>
  )
}

function ManageModal({
  creators,
  onUnsubscribe,
  onClose,
}: {
  creators: { id: string; name: string; avatar?: string }[]
  onUnsubscribe: (id: string) => void
  onClose: () => void
}) {
  const overlayRef = useRef<HTMLDivElement>(null)

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose()
      }}
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 8 }}
        transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
        className="relative z-10 w-full max-w-md rounded-2xl bg-white shadow-2xl dark:bg-gray-900"
      >
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4 dark:border-gray-800">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">
            Manage subscriptions
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
          >
            <X className="size-4" />
          </button>
        </div>
        {creators.length === 0 ? (
          <p className="px-6 py-8 text-center text-sm text-gray-400 dark:text-gray-500">
            No subscriptions
          </p>
        ) : (
          <ul className="max-h-[60vh] divide-y divide-gray-50 overflow-y-auto dark:divide-gray-800/60">
            {creators.map(({ id, name, avatar }) => (
              <ModalRow
                key={id}
                id={id}
                name={name}
                avatar={avatar}
                onUnsubscribe={() => onUnsubscribe(id)}
              />
            ))}
          </ul>
        )}
      </motion.div>
    </div>
  )
}

function ModalRow({
  id,
  name,
  avatar,
  onUnsubscribe,
}: {
  id: string
  name: string
  avatar?: string
  onUnsubscribe: () => void
}) {
  const resolved = useChannelAvatar(id, avatar ?? '')
  return (
    <li className="flex items-center gap-3 px-6 py-3">
      <Avatar
        src={resolved}
        alt={name}
        size="sm"
        initials={!resolved ? getInitials(name).toUpperCase() || undefined : undefined}
      />
      <Link
        to={`/channel/${id}`}
        className="min-w-0 flex-1 truncate text-sm font-medium text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
      >
        {name}
      </Link>
      <Button
        color="tertiary"
        size="sm"
        onClick={onUnsubscribe}
        className="shrink-0 rounded-lg text-xs text-red-500 hover:text-red-600"
      >
        Unsubscribe
      </Button>
    </li>
  )
}

function FeedSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="animate-pulse space-y-3">
          <div className="aspect-video rounded-2xl bg-gray-100 dark:bg-gray-800" />
          <div className="flex gap-3">
            <div className="size-8 shrink-0 rounded-full bg-gray-100 dark:bg-gray-800" />
            <div className="flex-1 space-y-2">
              <div className="h-3 rounded bg-gray-100 dark:bg-gray-800" />
              <div className="h-3 w-3/4 rounded bg-gray-100 dark:bg-gray-800" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

export function SubscriptionsPage() {
  const { favoriteCreators, removeFavoriteCreator } = useUserData()
  const { videos: rawVideos, loading, error, refresh } = useSubscriptionFeed(favoriteCreators)

  const [selectedCreatorId, setSelectedCreatorId] = useState<string | null>(null)
  const [showManage, setShowManage] = useState(false)
  const [isGrid, setIsGrid] = useState<boolean>(() => {
    try {
      return localStorage.getItem(GRID_MODE_KEY) !== 'list'
    } catch {
      return true
    }
  })
  const [lastVisited] = useState<number>(() => {
    try {
      return parseInt(localStorage.getItem(LAST_VISITED_KEY) ?? '0', 10)
    } catch {
      return 0
    }
  })

  // Record this visit so next session can compare against it.
  // We do NOT update lastVisited state — we keep the value from the previous
  // visit so "New" badges stay visible for the duration of the current session.
  useEffect(() => {
    try {
      localStorage.setItem(LAST_VISITED_KEY, String(Date.now()))
    } catch {}
  }, [])

  const toggleGrid = (grid: boolean) => {
    setIsGrid(grid)
    try {
      localStorage.setItem(GRID_MODE_KEY, grid ? 'grid' : 'list')
    } catch {}
  }

  const filtered = selectedCreatorId
    ? rawVideos.filter((v) => v.channelId === selectedCreatorId)
    : rawVideos

  const displayVideos = filtered.slice(0, MAX_FEED_VIDEOS)

  if (favoriteCreators.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center animate-fade-in">
        <div className="flex size-20 items-center justify-center rounded-2xl bg-gray-50 dark:bg-gray-800">
          <Heart className="size-10 text-gray-300 dark:text-gray-600" />
        </div>
        <h2 className="mt-5 text-lg font-semibold text-gray-900 dark:text-white">
          You haven't subscribed to any creators yet
        </h2>
        <p className="mt-2 max-w-sm text-sm text-gray-400 dark:text-gray-500">
          Visit any channel page and tap the heart to subscribe. Their latest uploads will appear here.
        </p>
        <Link
          to="/search"
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-gray-900 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-gray-800 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100"
        >
          <SearchMd className="size-4" />
          Find channels
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Subscriptions"
        description={
          loading
            ? 'Loading latest uploads…'
            : `${displayVideos.length} video${displayVideos.length === 1 ? '' : 's'}`
        }
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={refresh}
              disabled={loading}
              className="rounded-xl p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 disabled:opacity-40 dark:hover:bg-gray-800 dark:hover:text-gray-300"
              title="Refresh feed"
            >
              <RefreshCw01 className={cn('size-4', loading && 'animate-spin')} />
            </button>
            <div className="flex rounded-xl border border-gray-200/60 dark:border-gray-700/60">
              <button
                onClick={() => toggleGrid(true)}
                className={cn(
                  'rounded-l-xl p-2 transition-colors',
                  isGrid
                    ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900'
                    : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800',
                )}
                title="Grid view"
              >
                <LayoutGrid01 className="size-4" />
              </button>
              <button
                onClick={() => toggleGrid(false)}
                className={cn(
                  'rounded-r-xl p-2 transition-colors',
                  !isGrid
                    ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900'
                    : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800',
                )}
                title="List view"
              >
                <List className="size-4" />
              </button>
            </div>
            <Button
              color="tertiary"
              size="sm"
              onClick={() => setShowManage(true)}
              className="rounded-xl"
            >
              Manage
            </Button>
          </div>
        }
      />

      <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-hide">
        <button
          onClick={() => setSelectedCreatorId(null)}
          className={cn(
            'flex shrink-0 items-center rounded-2xl px-4 py-2 text-sm font-medium transition-all duration-200',
            selectedCreatorId === null
              ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900'
              : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800/60',
          )}
        >
          All
        </button>
        {favoriteCreators.map(({ id, name, avatar }) => (
          <CreatorChip
            key={id}
            id={id}
            name={name}
            avatar={avatar}
            selected={selectedCreatorId === id}
            onClick={() => setSelectedCreatorId(selectedCreatorId === id ? null : id)}
          />
        ))}
      </div>

      {loading && rawVideos.length === 0 ? (
        <FeedSkeleton />
      ) : error && rawVideos.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-sm text-gray-400 dark:text-gray-500">{error}</p>
          <button
            onClick={refresh}
            className="mt-3 text-sm font-medium text-gray-700 underline hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
          >
            Try again
          </button>
        </div>
      ) : displayVideos.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-sm text-gray-400 dark:text-gray-500">
            {selectedCreatorId
              ? 'No recent uploads from this creator.'
              : 'No recent uploads found. Try refreshing.'}
          </p>
        </div>
      ) : (
        <div
          className={cn(
            isGrid
              ? 'grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
              : 'flex flex-col gap-3',
          )}
        >
          {displayVideos.map((v, i) => {
            const appVideo = toAppVideo(v)
            const isNew = lastVisited > 0 && v.published > 0 && v.published * 1000 > lastVisited
            return (
              <div
                key={`${v.videoId}-${i}`}
                className="relative animate-fade-in"
                style={{ animationDelay: `${Math.min(i, 16) * 25}ms` }}
              >
                {isNew && (
                  <span className="absolute right-2 top-2 z-30 rounded-md bg-red-500 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white shadow-sm">
                    New
                  </span>
                )}
                <VideoCard video={appVideo} index={i} compact={!isGrid} />
              </div>
            )
          })}
        </div>
      )}

      <AnimatePresence>
        {showManage && (
          <ManageModal
            creators={favoriteCreators}
            onUnsubscribe={(id) => {
              removeFavoriteCreator(id)
              if (selectedCreatorId === id) setSelectedCreatorId(null)
            }}
            onClose={() => setShowManage(false)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
