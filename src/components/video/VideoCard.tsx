import type { MouseEvent } from 'react'
import { useState, useRef, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Avatar } from '@/components/base/avatar/avatar'
import { Button } from '@/components/base/buttons/button'
import { Play } from '@untitledui/icons'
import { useChannelAvatar } from '@/hooks/useChannelAvatar'
import { useResolvedChannelId } from '@/hooks/useResolvedChannelId'

export interface VideoCardVideo {
  id: string
  title: string
  channelName: string
  channelId?: string
  channelAvatar: string
  channelVerified?: boolean
  views: string
  uploadedAt: string
  thumbnail: string
  category?: string
  duration?: string
  liveNow?: boolean
}

interface VideoCardProps {
  video: VideoCardVideo
  compact?: boolean
  showRemove?: boolean
  onRemove?: () => void
  index?: number
}

export function VideoCard({
  video,
  compact = false,
  showRemove = false,
  onRemove,
  index = 0,
}: VideoCardProps) {
  const [hovered, setHovered] = useState(false)
  const [mouse, setMouse] = useState({ x: 0.5, y: 0.5 })
  const cardRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
  const channelAvatar = useChannelAvatar(video.channelId, video.channelAvatar)
  const { resolvedId: resolvedChannelId } = useResolvedChannelId(video.channelId)
  const channelInitials = video.channelName
    ? video.channelName.split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase() || undefined
    : undefined

  const goToChannel = useCallback(
    (e: React.SyntheticEvent) => {
      e.preventDefault()
      e.stopPropagation()
      if (resolvedChannelId) navigate(`/channel/${resolvedChannelId}`)
    },
    [navigate, resolvedChannelId]
  )

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const el = cardRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const x = (e.clientX - rect.left) / rect.width
    const y = (e.clientY - rect.top) / rect.height
    setMouse({ x, y })
  }, [])

  const handleMouseLeave = useCallback(() => {
    setMouse({ x: 0.5, y: 0.5 })
  }, [])

  // Card tilt to face cursor: rotateY (left/right), rotateX (up/down)
  const tiltY = (mouse.x - 0.5) * 16
  const tiltX = (mouse.y - 0.5) * -14

  // Compact variant (for sidebar / related)
  if (compact) {
    return (
      <motion.div
        initial={{ opacity: 0, x: 8 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3, delay: index * 0.04, ease: [0.4, 0, 0.2, 1] }}
      >
        <Link
          to={`/watch/${video.id}`}
          className="group flex gap-3 rounded-xl p-1.5 transition-colors duration-200 hover:bg-gray-50 dark:hover:bg-white/[0.03]"
        >
          <div className="relative h-20 w-36 shrink-0 overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-800">
            <img
              src={video.thumbnail}
              alt=""
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
              loading="lazy"
            />
            {video.liveNow ? (
              <span className="absolute bottom-1 right-1 rounded border border-red-400/40 bg-red-500/90 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-white backdrop-blur-sm">
                Live
              </span>
            ) : video.duration && !video.duration.startsWith('-') && (
              <span className="absolute bottom-1 right-1 rounded bg-black/50 px-1.5 py-0.5 text-[10px] font-medium tabular-nums text-white/90 backdrop-blur-sm">
                {video.duration}
              </span>
            )}
          </div>
          <div className="flex min-w-0 flex-1 flex-col justify-center">
            <h3 className="line-clamp-2 text-[13px] font-medium leading-snug text-gray-700 dark:text-gray-300">
              {video.title}
            </h3>
            {resolvedChannelId ? (
              <span
                role="button"
                tabIndex={0}
                onClick={goToChannel}
                onKeyDown={(e) => e.key === 'Enter' && goToChannel(e)}
                className="mt-1 cursor-pointer text-xs text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
              >
                {video.channelName}
              </span>
            ) : (
              <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                {video.channelName}
              </p>
            )}
            <p className="text-xs text-gray-400 dark:text-gray-500">
              {video.views ? `${video.views} views` : ''}{video.views && video.uploadedAt ? ' · ' : ''}{video.uploadedAt}
            </p>
          </div>
        </Link>
      </motion.div>
    )
  }

  // Full card variant — glow layer separate from card to prevent clipping
  return (
    <div className="relative overflow-visible">
      {/* Glow layer — outside overflow-hidden card, bleeds beyond container */}
      <div
        className="pointer-events-none absolute -z-10 rounded-3xl transition-opacity duration-500"
        style={{
          backgroundImage: `url(${video.thumbnail})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          top: '-2rem',
          right: '-2rem',
          bottom: '-2rem',
          left: '-2rem',
          transform: 'translateZ(0) scale(1.15)',
          filter: 'blur(40px) saturate(1.3)',
          opacity: hovered ? 0.5 : 0.2,
          willChange: 'opacity',
        }}
        aria-hidden="true"
      />

      <motion.div
        ref={cardRef}
        initial={{ opacity: 0, y: 20 }}
        animate={{
          opacity: 1,
          y: 0,
          rotateX: hovered ? tiltX : 0,
          rotateY: hovered ? tiltY : 0,
        }}
        transition={{
          opacity: { duration: 0.5, delay: index * 0.06, ease: [0.16, 1, 0.3, 1] },
          y: { duration: 0.5, delay: index * 0.06, ease: [0.16, 1, 0.3, 1] },
          rotateX: { type: 'spring', stiffness: 350, damping: 20 },
          rotateY: { type: 'spring', stiffness: 350, damping: 20 },
        }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => {
          setHovered(false)
          handleMouseLeave()
        }}
        onMouseMove={handleMouseMove}
        className="relative rounded-2xl"
        style={{ perspective: 800, transformStyle: 'preserve-3d' }}
      >
        <Link to={`/watch/${video.id}`} className="group block">
        <motion.div
          className="relative aspect-video overflow-hidden rounded-2xl bg-gray-100 dark:bg-gray-800/50"
          animate={{
            scale: hovered ? 1.04 : 1,
            boxShadow: hovered
              ? '0 12px 40px rgba(0, 0, 0, 0.18), 0 4px 12px rgba(0, 0, 0, 0.08)'
              : '0 0px 0px rgba(0, 0, 0, 0)',
          }}
          transition={{ type: 'spring', stiffness: 260, damping: 22 }}
        >
          <img
            src={video.thumbnail}
            alt=""
            className="h-full w-full object-cover"
            loading="lazy"
          />

          {/* Cinematic overlay on hover */}
          <motion.div
            className="absolute inset-0 z-20 bg-gradient-to-t from-black/40 via-transparent to-transparent"
            animate={{ opacity: hovered ? 1 : 0 }}
            transition={{ duration: 0.3 }}
          />

          {/* Play button on hover */}
          <motion.div
            className="absolute inset-0 z-20 flex items-center justify-center"
            animate={{ opacity: hovered ? 1 : 0, scale: hovered ? 1 : 0.8 }}
            transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
          >
            <div className="flex size-12 items-center justify-center rounded-full bg-white/90 shadow-lg backdrop-blur-sm dark:bg-black/60">
              <Play className="ml-0.5 size-5 text-gray-900 dark:text-white" />
            </div>
          </motion.div>

          {/* Duration / Live badge */}
          {video.liveNow ? (
            <span className="absolute bottom-2.5 right-2.5 z-20 rounded-lg border border-red-400/40 bg-red-500/90 px-2 py-0.5 text-[11px] font-semibold uppercase text-white backdrop-blur-sm">
              Live
            </span>
          ) : video.duration && !video.duration.startsWith('-') && (
            <motion.span
              className="absolute bottom-2.5 right-2.5 z-20 rounded-lg bg-black/50 px-2 py-0.5 text-[11px] font-medium tabular-nums text-white/90 backdrop-blur-sm"
              animate={{ y: hovered ? -4 : 0 }}
              transition={{ duration: 0.3 }}
            >
              {video.duration}
            </motion.span>
          )}
        </motion.div>

        {/* Info */}
        <div className="mt-3.5 flex items-start gap-3">
          {resolvedChannelId ? (
            <span
              role="button"
              tabIndex={0}
              onClick={goToChannel}
              onKeyDown={(e) => e.key === 'Enter' && goToChannel(e)}
              className="shrink-0 cursor-pointer"
            >
              <Avatar
                src={channelAvatar}
                alt={video.channelName}
                size="sm"
                verified={video.channelVerified}
                initials={!channelAvatar ? channelInitials : undefined}
              />
            </span>
          ) : (
            <Avatar
              src={channelAvatar}
              alt={video.channelName}
              size="sm"
              verified={video.channelVerified}
              className="shrink-0"
              initials={!channelAvatar ? channelInitials : undefined}
            />
          )}
          <div className="min-w-0 flex-1">
            <h3 className="line-clamp-2 text-[15px] font-medium leading-snug text-gray-900 transition-colors duration-200 group-hover:text-gray-950 dark:text-gray-100 dark:group-hover:text-white">
              {video.title}
            </h3>
            <motion.div
              initial={{ opacity: 0.7, y: 0 }}
              animate={{ opacity: hovered ? 1 : 0.7, y: hovered ? 0 : 2 }}
              transition={{ duration: 0.3 }}
            >
              {resolvedChannelId ? (
            <span
              role="button"
              tabIndex={0}
              onClick={goToChannel}
              onKeyDown={(e) => e.key === 'Enter' && goToChannel(e)}
              className="mt-1 block cursor-pointer text-sm font-medium text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
            >
                  {video.channelName}
                </span>
              ) : (
                <p className="mt-1 text-sm font-medium text-gray-600 dark:text-gray-300">
                  {video.channelName}
                </p>
              )}
              <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                {video.views ? `${video.views} views` : ''}{video.views && video.uploadedAt ? ' · ' : ''}{video.uploadedAt}
              </p>
            </motion.div>
          </div>
        </div>
        </Link>

        {showRemove && onRemove && (
          <Button
            onClick={(e: MouseEvent) => {
              e.preventDefault()
              onRemove()
            }}
            color="tertiary"
            size="sm"
            className="mt-2 rounded-xl text-xs"
          >
            Remove
          </Button>
        )}
      </motion.div>
    </div>
  )
}
