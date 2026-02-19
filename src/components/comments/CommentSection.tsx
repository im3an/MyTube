import { useEffect, useRef, useCallback, type ReactNode } from 'react'
import { motion } from 'framer-motion'
import { User01 } from '@untitledui/icons'
import { Avatar } from '@/components/base/avatar/avatar'
import { Button } from '@/components/base/buttons/button'

/**
 * Decode common HTML entities in a string.
 */
function decodeEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, '\u00A0')
}

/**
 * Safely parse comment HTML into React elements.
 * Only allows <br> (line breaks) and <a href> (links) – everything else is stripped.
 */
function formatCommentContent(html: string): ReactNode[] {
  const nodes: ReactNode[] = []
  // Split on <br>, <br/>, <br />, and <a ...>...</a> tags
  const tokenRegex = /<br\s*\/?>|<a\s+[^>]*href=["']([^"']*)["'][^>]*>(.*?)<\/a>/gi
  let lastIndex = 0
  let match: RegExpExecArray | null
  let key = 0

  while ((match = tokenRegex.exec(html)) !== null) {
    // Push text before the match
    if (match.index > lastIndex) {
      nodes.push(decodeEntities(html.slice(lastIndex, match.index)))
    }

    if (match[0].toLowerCase().startsWith('<br')) {
      nodes.push(<br key={key++} />)
    } else {
      // It's an <a> tag
      const href = decodeEntities(match[1])
      const linkText = decodeEntities(match[2])
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

  // Push remaining text
  if (lastIndex < html.length) {
    nodes.push(decodeEntities(html.slice(lastIndex)))
  }

  return nodes
}

export interface Comment {
  commentId?: string
  author: string
  authorThumbnails?: { url: string }[]
  content: string
  publishedText: string
  likeCount?: number
}

interface CommentSectionProps {
  comments?: Comment[]
  loading?: boolean
  loadingMore?: boolean
  hasMore?: boolean
  isLivestream?: boolean
  onLoadMore?: () => void
}

export function CommentSection({
  comments = [],
  loading,
  loadingMore,
  hasMore,
  isLivestream = false,
  onLoadMore,
}: CommentSectionProps) {
  // Intersection observer for auto-loading more comments
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

  return (
    <div className="mt-10 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <h2 className="text-lg font-semibold tracking-tight text-gray-900 dark:text-white">
          {loading ? 'Comments' : `${comments.length}${hasMore ? '+' : ''} Comments`}
        </h2>
        {isLivestream && (
          <span className="rounded-full bg-red-500/15 px-2.5 py-0.5 text-xs font-medium text-red-600 dark:text-red-400">
            Live
          </span>
        )}
        <div className="h-px flex-1 bg-gray-100 dark:bg-gray-800" />
      </div>

      {/* Loading skeleton */}
      {loading && (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex gap-4 animate-pulse rounded-xl bg-gray-50/80 p-4 dark:bg-white/[0.02]">
              <div className="size-11 shrink-0 rounded-full bg-gray-200 dark:bg-gray-700/50" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-28 rounded-lg bg-gray-200 dark:bg-gray-700/50" />
                <div className="h-3 w-full rounded-lg bg-gray-200 dark:bg-gray-700/50" />
                <div className="h-3 w-2/3 rounded-lg bg-gray-200 dark:bg-gray-700/50" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Comments list */}
      {!loading && (
        <div className="space-y-4">
          {comments.map((comment, i) => (
            <motion.div
              key={comment.commentId ?? i}
              className="flex gap-4 rounded-xl bg-gray-50/80 p-4 transition-colors dark:bg-white/[0.02] dark:hover:bg-white/[0.04]"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: Math.min(i, 10) * 0.04, ease: [0.4, 0, 0.2, 1] }}
            >
              <Avatar
                src={comment.authorThumbnails?.[0]?.url}
                alt={comment.author}
                size="lg"
                placeholderIcon={User01}
                className="size-11 shrink-0"
              />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                    {comment.author}
                  </span>
                  <span className="text-xs text-gray-400 dark:text-gray-500">
                    {comment.publishedText}
                  </span>
                </div>
                <p className="mt-1.5 text-sm leading-relaxed text-gray-600 dark:text-gray-400">
                  {formatCommentContent(comment.content)}
                </p>
                {comment.likeCount != null && comment.likeCount > 0 && (
                  <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                    {comment.likeCount} {comment.likeCount === 1 ? 'like' : 'likes'}
                  </p>
                )}
              </div>
            </motion.div>
          ))}

          {/* Loading more indicator */}
          {loadingMore && (
            <div className="space-y-4">
              {[1, 2].map((i) => (
                <div key={i} className="flex gap-4 animate-pulse rounded-xl bg-gray-50/80 p-4 dark:bg-white/[0.02]">
                  <div className="size-11 shrink-0 rounded-full bg-gray-200 dark:bg-gray-700/50" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-24 rounded-lg bg-gray-200 dark:bg-gray-700/50" />
                    <div className="h-3 w-full rounded-lg bg-gray-200 dark:bg-gray-700/50" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Load more sentinel + fallback button */}
          {hasMore && !loadingMore && (
            <>
              <div ref={sentinelRef} className="h-1" />
              <div className="flex justify-center">
                <Button
                  onClick={onLoadMore}
                  color="tertiary"
                  size="sm"
                  className="rounded-xl"
                >
                  Load more comments
                </Button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
