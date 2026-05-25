import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/base/buttons/button'
import { Avatar } from '@/components/base/avatar/avatar'
import {
  ThumbsDown,
  Share01,
  Bookmark,
  Heart,
  HeartRounded,
  ChevronDown,
  Download01,
  Check,
  Link01,
} from '@untitledui/icons'
import { ShareModal } from '@/components/video/ShareModal'
import { formatViews, formatDuration } from '@/api/youtube'
import { useChannelAvatar } from '@/hooks/useChannelAvatar'
import { useResolvedChannelId } from '@/hooks/useResolvedChannelId'
import { useUserData } from '@/hooks/useUserData'
import { cn } from '@/lib/utils'
import { sanitizeDescription } from '@/lib/sanitize'

// ─── Timestamp parsing ─────────────────────────────────────────

interface Timestamp {
  time: number
  label: string
}

function parseTimestamps(text: string): Timestamp[] {
  const regex = /\b(\d{1,2}):(\d{2})(?::(\d{2}))?\b/g
  const results: Timestamp[] = []
  const seen = new Set<number>()
  let m: RegExpExecArray | null
  while ((m = regex.exec(text)) !== null) {
    const hasHours = m[3] !== undefined
    const h = hasHours ? parseInt(m[1], 10) : 0
    const min = hasHours ? parseInt(m[2], 10) : parseInt(m[1], 10)
    const sec = hasHours ? parseInt(m[3], 10) : parseInt(m[2], 10)
    const time = h * 3600 + min * 60 + sec
    if (!seen.has(time)) {
      seen.add(time)
      results.push({ time, label: m[0] })
    }
  }
  return results
}

// ─── Props ────────────────────────────────────────────────────

interface VideoInfoProps {
  currentTime?: number
  video: {
    title: string
    views: string
    uploadedAt: string
    channelName: string
    channelId?: string
    channelAvatar: string
    channelVerified?: boolean
    description?: string
    descriptionHtml?: string
    subscriberCount?: number
    likeCount?: number
    dislikeCount?: number
    tags?: string[]
  }
  videoId?: string
  liked?: boolean
  disliked?: boolean
  onLike?: () => void
  onDislike?: () => void
  onSave?: () => void
  onDownload?: () => void
  onSeek?: (time: number) => void
  downloadLoading?: boolean
  downloadError?: string | null
}

// ─── Component ────────────────────────────────────────────────

export function VideoInfo({
  video,
  videoId,
  currentTime = 0,
  liked = false,
  disliked = false,
  onLike,
  onDislike,
  onSave,
  onDownload,
  onSeek,
  downloadLoading = false,
  downloadError = null,
}: VideoInfoProps) {
  const [descExpanded, setDescExpanded] = useState(false)
  const [shareModalOpen, setShareModalOpen] = useState(false)
  const [copiedLink, setCopiedLink] = useState(false)
  const descRef = useRef<HTMLDivElement>(null)

  // Use plain text for truncation logic, HTML for rendering
  const plainText = video.description ?? ''
  const htmlContent = video.descriptionHtml || video.description || ''
  const descLines = plainText.split('\n')
  const isLongDesc = descLines.length > 5 || plainText.length > 300

  // Parse timestamps from plain text description
  const timestamps = parseTimestamps(plainText)

  const channelAvatar = useChannelAvatar(video.channelId, video.channelAvatar)
  const { resolvedId: resolvedChannelId } = useResolvedChannelId(video.channelId)
  const channelLink = resolvedChannelId ? `/channel/${resolvedChannelId}` : null
  const channelInitials = video.channelName
    ? video.channelName
        .split(/\s+/)
        .map((w) => w[0])
        .slice(0, 2)
        .join('')
        .toUpperCase() || undefined
    : undefined
  const { toggleFavoriteCreator, isFavoriteCreator } = useUserData()
  const isFavorited = resolvedChannelId ? isFavoriteCreator(resolvedChannelId) : false

  // Intercept timestamp-like anchor clicks inside rendered description HTML
  useEffect(() => {
    const container = descRef.current
    if (!container || !onSeek) return

    function handleClick(e: MouseEvent) {
      const target = e.target as HTMLElement
      const anchor = target.closest('a') as HTMLAnchorElement | null
      if (!anchor) return

      // Check href for ?t= or #t= timestamp params
      const href = anchor.getAttribute('href') ?? ''
      const tMatch = href.match(/[?&#]t=(\d+)/)
      if (tMatch) {
        e.preventDefault()
        onSeek?.(parseInt(tMatch[1], 10))
        return
      }

      // Check if the link text looks like a timestamp
      const text = anchor.textContent?.trim() ?? ''
      const tsMatch = text.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/)
      if (tsMatch) {
        e.preventDefault()
        const hasHours = tsMatch[3] !== undefined
        const h = hasHours ? parseInt(tsMatch[1], 10) : 0
        const min = hasHours ? parseInt(tsMatch[2], 10) : parseInt(tsMatch[1], 10)
        const sec = hasHours ? parseInt(tsMatch[3], 10) : parseInt(tsMatch[2], 10)
        onSeek?.(h * 3600 + min * 60 + sec)
      }
    }

    container.addEventListener('click', handleClick)
    return () => container.removeEventListener('click', handleClick)
  }, [onSeek, descExpanded])

  function handleCopyLink() {
    const base = `${window.location.origin}/watch/${videoId ?? ''}`
    const url = currentTime > 0 ? `${base}?t=${Math.floor(currentTime)}` : base
    navigator.clipboard.writeText(url).then(() => {
      setCopiedLink(true)
      setTimeout(() => setCopiedLink(false), 2000)
    })
  }

  return (
    <div className="space-y-5">
      {/* Title */}
      <h1 className="text-xl font-semibold tracking-tight text-gray-900 dark:text-white md:text-2xl">
        {video.title}
      </h1>

      {/* Views & date */}
      <p className="text-sm text-gray-500 dark:text-gray-400">
        {video.views ? `${video.views} views` : ''}
        {video.views && video.uploadedAt ? ' · ' : ''}
        {video.uploadedAt}
      </p>

      {/* Channel row + action pills */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {/* Channel */}
        <div className="flex items-center gap-3">
          {channelLink ? (
            <Link to={channelLink} className="shrink-0">
              <Avatar
                src={channelAvatar}
                alt={video.channelName}
                size="md"
                verified={video.channelVerified}
                initials={!channelAvatar ? channelInitials : undefined}
              />
            </Link>
          ) : (
            <Avatar
              src={channelAvatar}
              alt={video.channelName}
              size="md"
              verified={video.channelVerified}
              initials={!channelAvatar ? channelInitials : undefined}
            />
          )}
          <div>
            {channelLink ? (
              <Link
                to={channelLink}
                className="text-[15px] font-medium text-gray-900 hover:text-gray-700 dark:text-white dark:hover:text-gray-300"
              >
                {video.channelName}
              </Link>
            ) : (
              <p className="text-[15px] font-medium text-gray-900 dark:text-white">
                {video.channelName}
              </p>
            )}
            {video.subscriberCount ? (
              <p className="text-xs text-gray-400 dark:text-gray-500">
                {formatViews(video.subscriberCount)} subscribers
              </p>
            ) : null}
          </div>
          {resolvedChannelId && (
            <Button
              color={isFavorited ? 'primary' : 'tertiary'}
              size="sm"
              className="ml-4 rounded-full"
              iconLeading={isFavorited ? HeartRounded : Heart}
              onClick={() =>
                toggleFavoriteCreator(resolvedChannelId, video.channelName, channelAvatar)
              }
            >
              {isFavorited ? 'Subscribed' : 'Subscribe'}
            </Button>
          )}
        </div>

        {/* Action pills — glass style */}
        <motion.div
          className="flex flex-wrap items-center gap-1.5 rounded-full border border-gray-100 bg-gray-50/80 p-1 backdrop-blur-sm dark:border-gray-800 dark:bg-gray-800/50"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.15 }}
        >
          <Button
            onClick={onLike}
            color="tertiary"
            size="sm"
            className="rounded-full"
            iconLeading={<Heart className={liked ? 'fill-red-500 text-red-500' : ''} />}
          >
            {video.likeCount ? formatViews(video.likeCount) : 'Like'}
          </Button>
          <Button
            onClick={onDislike}
            color="tertiary"
            size="sm"
            className="rounded-full"
            iconLeading={
              <ThumbsDown
                className={
                  disliked ? 'fill-gray-600 text-gray-600 dark:fill-gray-400 dark:text-gray-400' : ''
                }
              />
            }
          >
            {video.dislikeCount ? formatViews(video.dislikeCount) : 'Dislike'}
          </Button>
          <Button
            onClick={() => setShareModalOpen(true)}
            color="tertiary"
            size="sm"
            className="rounded-full"
            iconLeading={Share01}
          >
            Share
          </Button>
          <Button
            onClick={handleCopyLink}
            color="tertiary"
            size="sm"
            className="rounded-full"
            iconLeading={copiedLink ? Check : Link01}
          >
            {copiedLink
              ? 'Copied!'
              : currentTime > 0
                ? `At ${formatDuration(Math.floor(currentTime))}`
                : 'Copy link'}
          </Button>
          <Button
            onClick={onSave}
            color="tertiary"
            size="sm"
            className="rounded-full"
            iconLeading={Bookmark}
          >
            Save
          </Button>
          {onDownload && (
            <Button
              onClick={onDownload}
              color="tertiary"
              size="sm"
              className="rounded-full"
              iconLeading={Download01}
              disabled={downloadLoading}
            >
              {downloadLoading ? '…' : downloadError ? 'Retry' : 'Download'}
            </Button>
          )}
        </motion.div>
      </div>

      <ShareModal
        isOpen={shareModalOpen}
        onClose={() => setShareModalOpen(false)}
        videoId={videoId}
        title={video.title}
        currentTime={currentTime}
      />

      {/* Description — expand / collapse */}
      {htmlContent && (
        <motion.div
          className="rounded-2xl bg-gray-50/80 p-5 transition-colors dark:bg-white/[0.03]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.2 }}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={descExpanded ? 'full' : 'collapsed'}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <div
                ref={descRef}
                className={cn(
                  'prose prose-sm max-w-none text-sm leading-relaxed text-gray-600 dark:text-gray-400',
                  '[&_a]:text-blue-500 [&_a]:no-underline [&_a:hover]:underline',
                  !descExpanded && isLongDesc ? 'line-clamp-5' : 'whitespace-pre-wrap',
                )}
                dangerouslySetInnerHTML={{ __html: sanitizeDescription(htmlContent) }}
              />
            </motion.div>
          </AnimatePresence>

          {isLongDesc && (
            <button
              className="mt-3 flex items-center gap-1 text-sm font-medium text-gray-900 dark:text-white"
              onClick={() => setDescExpanded(!descExpanded)}
            >
              {descExpanded ? 'Show less' : 'Show more'}
              <ChevronDown
                className={`size-4 transition-transform duration-200 ${descExpanded ? 'rotate-180' : ''}`}
              />
            </button>
          )}

          {/* Timestamps / Chapters section */}
          {timestamps.length > 0 && (
            <div className="mt-4 border-t border-gray-100/80 pt-4 dark:border-gray-800/50">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
                Chapters
              </p>
              <div className="flex flex-col gap-1">
                {timestamps.slice(0, 8).map(({ time, label }) => (
                  <button
                    key={time}
                    onClick={() => onSeek?.(time)}
                    className="group flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-gray-100/80 dark:hover:bg-white/[0.05]"
                  >
                    <span className="font-mono text-xs font-medium text-blue-500 dark:text-blue-400">
                      {label}
                    </span>
                    <span className="h-px flex-1 bg-gray-200/70 dark:bg-gray-700/40" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Tags */}
          {video.tags && video.tags.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-1.5 border-t border-gray-100/80 pt-4 dark:border-gray-800/50">
              {video.tags.slice(0, 10).map((tag) => (
                <Link
                  key={tag}
                  to={`/search?q=${encodeURIComponent(tag)}`}
                  className="rounded-full border border-gray-200/60 px-3 py-1 text-xs text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-800 dark:border-gray-700/40 dark:text-gray-400 dark:hover:bg-white/[0.05] dark:hover:text-gray-200"
                >
                  #{tag}
                </Link>
              ))}
            </div>
          )}
        </motion.div>
      )}
    </div>
  )
}
