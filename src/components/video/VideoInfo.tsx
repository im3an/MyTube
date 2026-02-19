import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/base/buttons/button'
import { Avatar } from '@/components/base/avatar/avatar'
import { ThumbsDown, Share01, Bookmark, Heart, HeartRounded, ChevronDown, Download01 } from '@untitledui/icons'
import { ShareModal } from '@/components/video/ShareModal'
import { formatViews } from '@/api/youtube'
import { useChannelAvatar } from '@/hooks/useChannelAvatar'
import { useResolvedChannelId } from '@/hooks/useResolvedChannelId'
import { useUserData } from '@/hooks/useUserData'

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
    subscriberCount?: number
    likeCount?: number
  }
  videoId?: string
  liked?: boolean
  disliked?: boolean
  onLike?: () => void
  onDislike?: () => void
  onSave?: () => void
  onDownload?: () => void
  downloadLoading?: boolean
  downloadError?: string | null
}

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
  downloadLoading = false,
  downloadError = null,
}: VideoInfoProps) {
  const [descExpanded, setDescExpanded] = useState(false)
  const [shareModalOpen, setShareModalOpen] = useState(false)
  const descriptionLines = video.description?.split('\n') ?? []
  const isLongDesc = descriptionLines.length > 4 || (video.description?.length ?? 0) > 300

  const channelAvatar = useChannelAvatar(video.channelId, video.channelAvatar)
  const { resolvedId: resolvedChannelId } = useResolvedChannelId(video.channelId)
  const channelLink = resolvedChannelId ? `/channel/${resolvedChannelId}` : null
  const channelInitials = video.channelName
    ? video.channelName.split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase() || undefined
    : undefined
  const { toggleFavoriteCreator, isFavoriteCreator } = useUserData()
  const isFavorited = resolvedChannelId ? isFavoriteCreator(resolvedChannelId) : false

  return (
    <div className="space-y-6">
      {/* Title */}
      <h1 className="text-xl font-semibold tracking-tight text-gray-900 dark:text-white md:text-2xl">
        {video.title}
      </h1>

      {/* Views & date */}
      <p className="text-sm text-gray-500 dark:text-gray-400">
        {video.views ? `${video.views} views` : ''}
        {video.views && video.uploadedAt ? ' · ' : ''}
        {video.uploadedAt}
        {video.likeCount ? ` · ${formatViews(video.likeCount)} likes` : ''}
      </p>

      {/* Channel row + floating action pills */}
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
              {isFavorited ? 'Favorited' : 'Favorite'}
            </Button>
          )}
        </div>

        {/* Action pills — glass style */}
        <motion.div
          className="flex items-center gap-1.5 rounded-full border border-gray-100 bg-gray-50/80 p-1 backdrop-blur-sm dark:border-gray-800 dark:bg-gray-800/50"
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
            iconLeading={<ThumbsDown className={disliked ? 'fill-gray-600 text-gray-600 dark:fill-gray-400 dark:text-gray-400' : ''} />}
          >
            Dislike
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
      {video.description && (
        <motion.div
          className="cursor-pointer rounded-2xl bg-gray-50/80 p-5 transition-colors hover:bg-gray-100/80 dark:bg-white/[0.03] dark:hover:bg-white/[0.05]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.2 }}
          onClick={() => isLongDesc && setDescExpanded(!descExpanded)}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={descExpanded ? 'full' : 'collapsed'}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <p className={`whitespace-pre-wrap text-sm leading-relaxed text-gray-600 dark:text-gray-400 ${
                !descExpanded && isLongDesc ? 'line-clamp-3' : ''
              }`}>
                {video.description}
              </p>
            </motion.div>
          </AnimatePresence>
          {isLongDesc && (
            <button
              className="mt-3 flex items-center gap-1 text-sm font-medium text-gray-900 dark:text-white"
              onClick={(e) => {
                e.stopPropagation()
                setDescExpanded(!descExpanded)
              }}
            >
              {descExpanded ? 'Show less' : 'Show more'}
              <ChevronDown
                className={`size-4 transition-transform duration-200 ${descExpanded ? 'rotate-180' : ''}`}
              />
            </button>
          )}
        </motion.div>
      )}
    </div>
  )
}
