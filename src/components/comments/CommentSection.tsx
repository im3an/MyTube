import { useState, useEffect, useRef, useCallback, useMemo, type ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import {
  User01,
  ThumbsUp,
  Heart,
  Pin01,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  RefreshCw01,
  MessageCircle01,
} from '@untitledui/icons'
import { Avatar } from '@/components/base/avatar/avatar'
import { Button } from '@/components/base/buttons/button'
import { cn } from '@/lib/utils'
import { getCommentReplies, formatViews } from '@/api/youtube'
import type { InvidiousComment } from '@/api/youtube'
import { sanitizeComment } from '@/lib/sanitize'

export type { InvidiousComment as Comment }

function decodeEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
}

const COMMENT_TOKEN_RE =
  /<br\s*\/?>|<p>(.*?)<\/p>|<(b|i)>(.*?)<\/\2>|<a\s+[^>]*href=["']([^"']*)["'][^>]*>(.*?)<\/a>/gis

function formatCommentContent(html: string): ReactNode[] {
  const safe = sanitizeComment(html)
  const nodes: ReactNode[] = []
  const tokenRegex = new RegExp(COMMENT_TOKEN_RE.source, COMMENT_TOKEN_RE.flags)
  let lastIndex = 0
  let match: RegExpExecArray | null
  let key = 0

  while ((match = tokenRegex.exec(safe)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(decodeEntities(safe.slice(lastIndex, match.index)))
    }

    const tag = match[0].toLowerCase()
    if (tag.startsWith('<br')) {
      nodes.push(<br key={key++} />)
    } else if (tag.startsWith('<p')) {
      const inner = match[1] ?? ''
      nodes.push(<p key={key++} className="mb-1 last:mb-0">{decodeEntities(inner)}</p>)
    } else if (tag.startsWith('<b')) {
      nodes.push(<strong key={key++}>{decodeEntities(match[3] ?? '')}</strong>)
    } else if (tag.startsWith('<i')) {
      nodes.push(<em key={key++}>{decodeEntities(match[3] ?? '')}</em>)
    } else {
      // <a href="...">text</a>
      const href = decodeEntities(match[4] ?? '')
      const linkText = decodeEntities(match[5] ?? '')
      nodes.push(
        <a
          key={key++}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300"
        >
          {linkText}
        </a>,
      )
    }

    lastIndex = match.index + match[0].length
  }

  if (lastIndex < safe.length) {
    nodes.push(decodeEntities(safe.slice(lastIndex)))
  }

  return nodes
}

function CommentSkeleton({ isReply = false }: { isReply?: boolean }) {
  return (
    <div className={cn('flex gap-3 animate-pulse', isReply && 'pl-10')}>
      <div
        className={cn(
          'shrink-0 rounded-full bg-gray-200 dark:bg-gray-700/60',
          isReply ? 'size-8' : 'size-10',
        )}
      />
      <div className="flex-1 space-y-2 pt-0.5">
        <div className="h-3.5 w-28 rounded-md bg-gray-200 dark:bg-gray-700/60" />
        <div className="h-3 w-full rounded-md bg-gray-200 dark:bg-gray-700/60" />
        <div className="h-3 w-3/4 rounded-md bg-gray-200 dark:bg-gray-700/60" />
      </div>
    </div>
  )
}

interface ReplyThreadProps {
  comment: InvidiousComment
  videoId: string
  channelName?: string
}

function ReplyThread({ comment, videoId, channelName }: ReplyThreadProps) {
  const [expanded, setExpanded] = useState(false)
  const [replies, setReplies] = useState<InvidiousComment[]>([])
  const [loadingReplies, setLoadingReplies] = useState(false)
  const [replyError, setReplyError] = useState(false)
  const fetchedRef = useRef(false)

  const replyCount = comment.replyCount ?? 0
  const hasReplies = replyCount > 0 || !!comment.repliesPage

  const fetchReplies = useCallback(async () => {
    if (!comment.repliesPage || fetchedRef.current) return
    fetchedRef.current = true
    setLoadingReplies(true)
    setReplyError(false)
    try {
      const { replies: fetched } = await getCommentReplies(videoId, comment.repliesPage)
      setReplies(fetched)
    } catch {
      setReplyError(true)
    } finally {
      setLoadingReplies(false)
    }
  }, [videoId, comment.repliesPage])

  const toggle = useCallback(() => {
    if (!expanded && replies.length === 0 && !fetchedRef.current) {
      fetchReplies()
    }
    setExpanded((v) => !v)
  }, [expanded, replies.length, fetchReplies])

  if (!hasReplies) return null

  return (
    <div className="mt-2">
      <button
        onClick={toggle}
        aria-expanded={expanded}
        aria-label={expanded ? 'Collapse replies' : `View ${replyCount} replies`}
        className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm font-semibold text-blue-600 transition-colors hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950/40"
      >
        {expanded ? (
          <ChevronUp className="size-4" />
        ) : (
          <ChevronDown className="size-4" />
        )}
        {replyCount > 0
          ? `${expanded ? 'Hide' : 'View'} ${replyCount} ${replyCount === 1 ? 'reply' : 'replies'}`
          : expanded
            ? 'Hide replies'
            : 'View replies'}
      </button>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
            className="overflow-hidden"
          >
            <div className="ml-5 mt-3 space-y-4 border-l-2 border-gray-100 pl-5 dark:border-gray-800">
              {loadingReplies && (
                <>
                  <CommentSkeleton isReply />
                  <CommentSkeleton isReply />
                </>
              )}
              {replyError && (
                <p className="text-xs text-gray-400 dark:text-gray-500">
                  Couldn&apos;t load replies.
                </p>
              )}
              {replies.map((reply, i) => (
                <CommentRow
                  key={reply.commentId ?? i}
                  comment={reply}
                  videoId={videoId}
                  channelName={channelName}
                  isReply
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

interface CommentRowProps {
  comment: InvidiousComment
  videoId: string
  channelName?: string
  isReply?: boolean
  index?: number
}

function CommentRow({ comment, videoId, channelName, isReply = false, index = 0 }: CommentRowProps) {
  const navigate = useNavigate()
  const avatarSrc = comment.authorThumbnails?.[0]?.url
  const authorPath = comment.authorId ? `/channel/${comment.authorId}` : undefined

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: Math.min(index, 8) * 0.04, ease: [0.4, 0, 0.2, 1] }}
    >
      {comment.isPinned && !isReply && (
        <div className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-gray-500 dark:text-gray-400">
          <Pin01 className="size-3.5 text-gray-400 dark:text-gray-500" />
          <span>Pinned{channelName ? ` by ${channelName}` : ''}</span>
        </div>
      )}

      <div className="flex gap-3">
        <button
          onClick={() => authorPath && navigate(authorPath)}
          aria-label={`View ${comment.author}'s channel`}
          disabled={!authorPath}
          className={cn(
            'shrink-0 rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand',
            !authorPath && 'cursor-default',
          )}
        >
          <Avatar
            src={avatarSrc}
            alt={comment.author}
            size={isReply ? 'sm' : 'md'}
            placeholderIcon={User01}
          />
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <button
              onClick={() => authorPath && navigate(authorPath)}
              disabled={!authorPath}
              aria-label={`View ${comment.author}'s channel`}
              className={cn(
                'text-sm font-semibold text-gray-800 dark:text-gray-200',
                authorPath && 'hover:underline',
                !authorPath && 'cursor-default',
              )}
            >
              {comment.author}
            </button>
            <span className="text-xs text-gray-400 dark:text-gray-500">
              {comment.publishedText}
            </span>
            {comment.isEdited && (
              <span className="rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-400 dark:bg-white/5 dark:text-gray-500">
                Edited
              </span>
            )}
          </div>

          <p className="mt-1 text-sm leading-relaxed text-gray-600 dark:text-gray-400">
            {formatCommentContent(comment.content)}
          </p>

          {comment.likeCount > 0 && (
            <div className="relative mt-2 flex items-center gap-1.5">
              <ThumbsUp className="size-3.5 text-gray-400 dark:text-gray-500" />
              <span className="text-xs text-gray-400 dark:text-gray-500">
                {formatViews(comment.likeCount)}
              </span>
              {comment.hearted && (
                <span
                  aria-label="Creator hearted this comment"
                  className="absolute -right-3.5 -top-2 flex size-5 items-center justify-center rounded-full bg-white shadow-md ring-1 ring-gray-100 dark:bg-gray-900 dark:ring-gray-800"
                >
                  <Heart className="size-3 text-red-500" />
                </span>
              )}
            </div>
          )}

          {!isReply && (
            <ReplyThread comment={comment} videoId={videoId} channelName={channelName} />
          )}
        </div>
      </div>
    </motion.div>
  )
}

type SortOrder = 'top' | 'newest'

interface CommentSectionProps {
  videoId?: string
  comments?: InvidiousComment[]
  loading?: boolean
  loadingMore?: boolean
  hasMore?: boolean
  isLivestream?: boolean
  channelName?: string
  onLoadMore?: () => void
  error?: boolean
  onRetry?: () => void
}

export function CommentSection({
  videoId = '',
  comments = [],
  loading,
  loadingMore,
  hasMore,
  isLivestream = false,
  channelName,
  onLoadMore,
  error,
  onRetry,
}: CommentSectionProps) {
  const [sortOrder, setSortOrder] = useState<SortOrder>('top')

  const sentinelRef = useRef<HTMLDivElement>(null)
  const onLoadMoreRef = useRef(onLoadMore)
  onLoadMoreRef.current = onLoadMore

  const handleIntersect = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      if (entries[0]?.isIntersecting) onLoadMoreRef.current?.()
    },
    [],
  )

  useEffect(() => {
    const el = sentinelRef.current
    if (!el || !hasMore) return
    const observer = new IntersectionObserver(handleIntersect, {
      rootMargin: '200px',
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [handleIntersect, hasMore, comments.length])

  const displayComments = useMemo(() => {
    const sorted = [...comments]
    // Pinned comments always rise to the top regardless of sort order
    sorted.sort((a, b) => {
      const pinnedDiff = (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0)
      if (pinnedDiff !== 0) return pinnedDiff
      if (sortOrder === 'newest') return (b.publishedText < a.publishedText ? -1 : 1)
      return 0
    })
    return sorted
  }, [comments, sortOrder])

  return (
    <div className="mt-10 space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-lg font-semibold tracking-tight text-gray-900 dark:text-white">
          {loading ? 'Comments' : `${comments.length}${hasMore ? '+' : ''} Comments`}
        </h2>
        {isLivestream && (
          <span className="rounded-full bg-red-500/15 px-2.5 py-0.5 text-xs font-medium text-red-600 dark:text-red-400">
            Live
          </span>
        )}
        <div className="h-px flex-1 bg-gray-100 dark:bg-gray-800" />

        {!loading && comments.length > 0 && (
          <div
            className="flex items-center gap-1 rounded-full bg-gray-100 p-1 dark:bg-white/5"
            role="group"
            aria-label="Sort comments"
          >
            {(['top', 'newest'] as SortOrder[]).map((order) => (
              <motion.button
                key={order}
                onClick={() => setSortOrder(order)}
                aria-pressed={sortOrder === order}
                className={cn(
                  'relative rounded-full px-3 py-1 text-xs font-medium transition-colors',
                  sortOrder === order
                    ? 'text-gray-900 dark:text-white'
                    : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200',
                )}
              >
                {sortOrder === order && (
                  <motion.span
                    layoutId="sort-pill"
                    className="absolute inset-0 rounded-full bg-white shadow-xs dark:bg-gray-700"
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
                <span className="relative">
                  {order === 'top' ? 'Top comments' : 'Newest first'}
                </span>
              </motion.button>
            ))}
          </div>
        )}
      </div>

      {loading && (
        <div className="space-y-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <CommentSkeleton key={i} />
          ))}
        </div>
      )}

      {!loading && error && (
        <div className="flex flex-col items-center gap-3 py-10 text-center">
          <AlertCircle className="size-8 text-gray-300 dark:text-gray-600" />
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
            Couldn&apos;t load comments
          </p>
          {onRetry && (
            <Button
              onClick={onRetry}
              color="secondary"
              size="sm"
              aria-label="Retry loading comments"
            >
              <RefreshCw01 className="size-4" />
              Retry
            </Button>
          )}
        </div>
      )}

      {!loading && !error && comments.length === 0 && (
        <div className="flex flex-col items-center gap-3 py-10 text-center">
          <MessageCircle01 className="size-8 text-gray-300 dark:text-gray-600" />
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
            No comments available
          </p>
        </div>
      )}

      {!loading && !error && comments.length > 0 && (
        <div className="space-y-5">
          {displayComments.map((comment, i) => (
            <motion.div
              key={comment.commentId ?? i}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.2, delay: Math.min(i, 5) * 0.05 }}
              className={cn(
                'rounded-xl p-4 transition-colors',
                comment.isPinned
                  ? 'bg-yellow-50/60 ring-1 ring-yellow-200/60 dark:bg-yellow-950/20 dark:ring-yellow-800/30'
                  : 'bg-gray-50/80 hover:bg-gray-100/60 dark:bg-white/[0.02] dark:hover:bg-white/[0.04]',
              )}
            >
              <CommentRow
                comment={comment}
                videoId={videoId}
                channelName={channelName}
                index={i}
              />
            </motion.div>
          ))}

          {loadingMore && (
            <div className="space-y-5">
              <CommentSkeleton />
              <CommentSkeleton />
            </div>
          )}

          {hasMore && !loadingMore && (
            <>
              <div ref={sentinelRef} className="h-1" />
              <div className="flex justify-center">
                <Button
                  onClick={onLoadMore}
                  color="tertiary"
                  size="sm"
                  className="rounded-xl"
                  aria-label="Show more comments"
                >
                  Show more comments
                </Button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
