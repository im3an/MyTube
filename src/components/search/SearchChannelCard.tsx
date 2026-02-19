import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Avatar } from '@/components/base/avatar/avatar'
import { formatViews } from '@/api/youtube'
import { useChannelAvatar } from '@/hooks/useChannelAvatar'
import { useResolvedChannelId } from '@/hooks/useResolvedChannelId'
import type { SearchChannel } from '@/api/youtube'

interface SearchChannelCardProps {
  channel: SearchChannel
  index?: number
  /** Compact layout for horizontal scroll (mobile) */
  compact?: boolean
}

export function SearchChannelCard({ channel, index = 0, compact = false }: SearchChannelCardProps) {
  const { resolvedId } = useResolvedChannelId(channel.id)
  const avatarUrl = useChannelAvatar(channel.id, channel.avatarUrl)

  if (!resolvedId) return null

  if (compact) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: index * 0.03, ease: [0.4, 0, 0.2, 1] }}
        className="shrink-0"
      >
        <Link
          to={`/channel/${resolvedId}`}
          className="group flex w-20 flex-col items-center gap-2 rounded-xl p-3 transition-colors duration-200 hover:bg-gray-50 dark:hover:bg-white/[0.03]"
        >
          <Avatar
            src={avatarUrl}
            alt={channel.name}
            size="lg"
            verified={channel.verified}
            className="ring-2 ring-gray-100 transition-all duration-200 group-hover:ring-gray-200 dark:ring-gray-800 dark:group-hover:ring-gray-700"
          />
          <span className="line-clamp-2 text-center text-xs font-medium text-gray-900 dark:text-white">
            {channel.name}
          </span>
        </Link>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.03, ease: [0.4, 0, 0.2, 1] }}
    >
      <Link
        to={`/channel/${resolvedId}`}
        className="group flex items-center gap-3 rounded-xl p-3 transition-colors duration-200 hover:bg-gray-50 dark:hover:bg-white/[0.03]"
      >
        <Avatar
          src={avatarUrl}
          alt={channel.name}
          size="lg"
          verified={channel.verified}
          className="shrink-0 ring-2 ring-gray-100 transition-all duration-200 group-hover:ring-gray-200 dark:ring-gray-800 dark:group-hover:ring-gray-700"
        />
        <div className="min-w-0 flex-1">
          <span className="truncate font-medium text-gray-900 dark:text-white">
            {channel.name}
          </span>
          {(channel.subscriberCount > 0 || channel.videoCount > 0) && (
            <p className="mt-0.5 truncate text-xs text-gray-500 dark:text-gray-400">
              {channel.subscriberCount > 0 && (
                <>{formatViews(channel.subscriberCount)} subscribers</>
              )}
              {channel.subscriberCount > 0 && channel.videoCount > 0 && ' · '}
              {channel.videoCount > 0 && (
                <>{formatViews(channel.videoCount)} videos</>
              )}
            </p>
          )}
        </div>
      </Link>
    </motion.div>
  )
}
