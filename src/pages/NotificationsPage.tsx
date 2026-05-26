import { Link } from 'react-router-dom'
import { Bell01, Trash01 } from '@untitledui/icons'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button } from '@/components/base/buttons/button'
import { useNotifications } from '@/hooks/useNotifications'
import { cn, formatRelativeTime } from '@/lib/utils'

function getDayLabel(timestampMs: number): string {
  const now = new Date()
  const d = new Date(timestampMs)
  const diffDays = Math.floor(
    (now.setHours(0, 0, 0, 0) - d.setHours(0, 0, 0, 0)) / (1000 * 60 * 60 * 24),
  )
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return 'This week'
  return new Date(timestampMs).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
}

export function NotificationsPage() {
  const { notifications, markAllRead, dismiss, isRead } = useNotifications()

  // Group notifications by day label
  const groups: { label: string; items: typeof notifications }[] = []
  const seenLabels: string[] = []

  for (const notif of notifications) {
    const label = getDayLabel(notif.publishedAt)
    if (!seenLabels.includes(label)) {
      seenLabels.push(label)
      groups.push({ label, items: [] })
    }
    const group = groups.find((g) => g.label === label)
    if (group) group.items.push(notif)
  }

  if (notifications.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center animate-fade-in">
        <div className="flex size-20 items-center justify-center rounded-2xl bg-gray-50 dark:bg-gray-800">
          <Bell01 className="size-10 text-gray-300 dark:text-gray-600" />
        </div>
        <h2 className="mt-5 text-lg font-semibold text-gray-900 dark:text-white">
          No notifications
        </h2>
        <p className="mt-2 max-w-xs text-sm text-gray-400 dark:text-gray-500">
          New uploads from your favorite creators will appear here.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notifications"
        description={`${notifications.length} notification${notifications.length === 1 ? '' : 's'}`}
        actions={
          <div className="flex items-center gap-2">
            <Button
              onClick={markAllRead}
              color="tertiary"
              size="sm"
              className="rounded-xl"
              iconLeading={Bell01}
            >
              Mark all read
            </Button>
            <Button
              onClick={() => {
                for (const n of notifications) dismiss(n.videoId)
              }}
              color="tertiary"
              size="sm"
              className="rounded-xl"
              iconLeading={Trash01}
            >
              Clear all
            </Button>
          </div>
        }
      />

      <div className="space-y-8">
        {groups.map(({ label, items }) => (
          <div key={label} className="space-y-1">
            <p className="mb-3 px-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-400 dark:text-gray-600">
              {label}
            </p>
            <div className="divide-y divide-gray-100/60 overflow-hidden rounded-2xl border border-gray-100/60 dark:divide-gray-800/60 dark:border-gray-800/60">
              {items.map((notif) => {
                const read = isRead(notif.videoId)
                return (
                  <div
                    key={notif.videoId}
                    className={cn(
                      'relative flex items-start gap-4 px-4 py-4 transition-colors duration-150',
                      !read
                        ? 'bg-blue-50/30 dark:bg-blue-950/10'
                        : 'bg-white/60 dark:bg-gray-900/40',
                    )}
                  >
                    <Link
                      to={`/watch/${notif.videoId}`}
                      onClick={() => dismiss(notif.videoId)}
                      className="group flex flex-1 items-start gap-4 hover:opacity-90"
                    >
                      <div className="relative shrink-0">
                        <img
                          src={notif.thumbnailUrl}
                          alt={notif.title}
                          className="h-[63px] w-[112px] rounded-xl object-cover"
                          loading="lazy"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p
                          className={cn(
                            'line-clamp-2 text-sm leading-snug',
                            read
                              ? 'text-gray-500 dark:text-gray-400'
                              : 'font-medium text-gray-900 dark:text-white',
                          )}
                        >
                          {notif.title}
                        </p>
                        <Link
                          to={`/channel/${notif.channelId}`}
                          onClick={(e) => e.stopPropagation()}
                          className="mt-1 block text-xs text-gray-400 transition-colors hover:text-gray-700 dark:text-gray-500 dark:hover:text-gray-300"
                        >
                          {notif.channelName}
                        </Link>
                        <p className="mt-0.5 text-xs text-gray-300 dark:text-gray-600">
                          {formatRelativeTime(notif.publishedAt)}
                        </p>
                      </div>
                    </Link>

                    {/* Unread indicator + dismiss */}
                    <div className="flex shrink-0 items-center gap-2">
                      {!read && (
                        <span className="size-2 rounded-full bg-blue-500" />
                      )}
                      <button
                        onClick={() => dismiss(notif.videoId)}
                        className="rounded-lg p-1.5 text-gray-300 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
                        aria-label="Dismiss notification"
                      >
                        <span className="block size-3.5">
                          <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                            <path d="M2 2l10 10M12 2L2 12" />
                          </svg>
                        </span>
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
