import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Bell01, X, CheckDone01 } from '@untitledui/icons'
import { useNotifications } from '@/hooks/useNotifications'
import { cn, formatRelativeTime } from '@/lib/utils'

const GROUP_ORDER = ['Today', 'Yesterday', 'This week', 'Older']

function getDayLabel(publishedAt: number): string {
  const now = new Date()
  const date = new Date(publishedAt * 1000)
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterday = new Date(today.getTime() - 86400000)
  const weekAgo = new Date(today.getTime() - 7 * 86400000)
  const itemDate = new Date(date.getFullYear(), date.getMonth(), date.getDate())

  if (itemDate.getTime() === today.getTime()) return 'Today'
  if (itemDate.getTime() === yesterday.getTime()) return 'Yesterday'
  if (itemDate >= weekAgo) return 'This week'
  return 'Older'
}

export function NotificationsPage() {
  const { notifications, unreadCount, markAllRead, dismiss, clearAll, isRead } = useNotifications()

  // Group notifications by day label, preserving order
  const groups: Array<{ label: string; items: typeof notifications }> = []

  for (const n of notifications) {
    const label = getDayLabel(n.publishedAt)
    const existing = groups.find((g) => g.label === label)
    if (existing) {
      existing.items.push(n)
    } else {
      groups.push({ label, items: [n] })
    }
  }

  groups.sort((a, b) => GROUP_ORDER.indexOf(a.label) - GROUP_ORDER.indexOf(b.label))

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 pt-24">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Bell01 className="size-6 text-gray-700 dark:text-gray-300" />
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Notifications</h1>
          {unreadCount > 0 && (
            <span className="rounded-full bg-red-500 px-2 py-0.5 text-[11px] font-semibold text-white">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-800 dark:text-gray-400 dark:hover:bg-gray-800/60 dark:hover:text-gray-200"
            >
              <CheckDone01 className="size-4" />
              Mark all read
            </button>
          )}
          {notifications.length > 0 && (
            <button
              onClick={clearAll}
              className="rounded-lg px-3 py-1.5 text-sm text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-800 dark:text-gray-400 dark:hover:bg-gray-800/60 dark:hover:text-gray-200"
            >
              Clear all
            </button>
          )}
        </div>
      </div>

      {/* Empty state */}
      {notifications.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="mb-4 flex size-16 items-center justify-center rounded-2xl bg-gray-100 dark:bg-gray-800/60">
            <Bell01 className="size-8 text-gray-400 dark:text-gray-500" />
          </div>
          <p className="text-base font-medium text-gray-600 dark:text-gray-400">No notifications yet</p>
          <p className="mt-1 text-sm text-gray-400 dark:text-gray-500">
            Add favourite creators to get notified when they upload.
          </p>
          <Link
            to="/subscriptions"
            className="mt-4 rounded-xl bg-gray-900 px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-80 dark:bg-white dark:text-gray-900"
          >
            Browse creators
          </Link>
        </div>
      )}

      {/* Grouped notification list */}
      <AnimatePresence initial={false}>
        {groups.map(({ label, items }) => (
          <div key={label} className="mb-6">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">
              {label}
            </p>
            <div className="space-y-1">
              {items.map((n) => {
                const read = isRead(n.videoId)
                return (
                  <motion.div
                    key={n.videoId}
                    layout
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.2 }}
                    className={cn(
                      'group relative flex items-start gap-3 rounded-xl p-3 transition-colors',
                      read
                        ? 'bg-transparent hover:bg-gray-50 dark:hover:bg-gray-800/40'
                        : 'bg-blue-50/60 hover:bg-blue-50 dark:bg-blue-950/20 dark:hover:bg-blue-950/30'
                    )}
                  >
                    {/* Unread dot */}
                    {!read && (
                      <span className="absolute right-3 top-3 size-2 rounded-full bg-blue-500" />
                    )}

                    <Link to={`/watch/${n.videoId}`} className="contents">
                      {/* Thumbnail */}
                      <div className="relative shrink-0">
                        <img
                          src={n.thumbnailUrl}
                          alt={n.title}
                          className="h-[54px] w-24 rounded-lg object-cover"
                          loading="lazy"
                          onError={(e) => {
                            const img = e.currentTarget
                            if (!img.src.includes('hqdefault')) {
                              img.src = `https://img.youtube.com/vi/${n.videoId}/hqdefault.jpg`
                            }
                          }}
                        />
                      </div>

                      {/* Text */}
                      <div className="min-w-0 flex-1 pr-6">
                        <p
                          className={cn(
                            'line-clamp-2 text-sm leading-snug',
                            read
                              ? 'text-gray-600 dark:text-gray-400'
                              : 'font-medium text-gray-900 dark:text-white'
                          )}
                        >
                          {n.title}
                        </p>
                        <p className="mt-0.5 truncate text-xs text-gray-400 dark:text-gray-500">
                          {n.channelName}
                          {n.publishedAt > 0 && (
                            <span className="ml-1.5">· {formatRelativeTime(n.publishedAt)}</span>
                          )}
                        </p>
                      </div>
                    </Link>

                    {/* Dismiss button */}
                    <button
                      onClick={() => dismiss(n.videoId)}
                      className="absolute right-2.5 top-2.5 hidden size-6 items-center justify-center rounded-md text-gray-400 transition-colors hover:bg-gray-200/60 hover:text-gray-600 group-hover:flex dark:hover:bg-gray-700/60 dark:hover:text-gray-300"
                      aria-label="Dismiss notification"
                    >
                      <X className="size-3.5" />
                    </button>
                  </motion.div>
                )
              })}
            </div>
          </div>
        ))}
      </AnimatePresence>
    </div>
  )
}
