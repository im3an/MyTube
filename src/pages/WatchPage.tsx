import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom'
import { useEffect, useState, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { VideoPlayer } from '@/components/video/VideoPlayer'
import type { VideoPlayerHandle } from '@/components/ui/VideoPlayer'
import { TranscriptPanel } from '@/components/video/TranscriptPanel'
import { SaveToPlaylistModal } from '@/components/video/SaveToPlaylistModal'
import { DownloadModal } from '@/components/video/DownloadModal'
import { VideoInfo } from '@/components/video/VideoInfo'
import { VideoCard } from '@/components/video/VideoCard'
import { CommentSection } from '@/components/comments/CommentSection'
import { useVideo, useVideoComments, useVideosByIds } from '@/hooks/useYouTube'
import { toAppVideo, getFallbackThumbnail } from '@/api/youtube'
import { useUserData } from '@/hooks/useUserData'
import { useMiniPlayer } from '@/components/providers/MiniPlayerContext'
import { List, Play } from '@untitledui/icons'
import { cn } from '@/lib/utils'

export function WatchPage() {
  const { id } = useParams<{ id: string }>()
  const videoId = id ?? 'pHCLGs4GGvQ'
  const [searchParams] = useSearchParams()
  const playlistId = searchParams.get('playlist')
  const playlistIndex = parseInt(searchParams.get('index') ?? '-1', 10)

  const { video, loading, error } = useVideo(videoId)
  const {
    comments,
    loading: commentsLoading,
    loadingMore: commentsLoadingMore,
    hasMore: commentsHasMore,
    loadMore: commentsLoadMore,
  } = useVideoComments(videoId, video?.liveNow ?? false)
  const navigate = useNavigate()
  const { addToHistory, toggleFavorite, isFavorite, toggleDislike, isDisliked, getPlaybackPosition, setPlaybackPosition, playlists } = useUserData()
  const { setMiniVideo, dismiss } = useMiniPlayer()
  const [saveModalOpen, setSaveModalOpen] = useState(false)
  const [downloadModalOpen, setDownloadModalOpen] = useState(false)
  const [autoplayCountdown, setAutoplayCountdown] = useState<number | null>(null)
  const [transcriptOpen, setTranscriptOpen] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [theaterMode, setTheaterMode] = useState(false)
  const playerRef = useRef<VideoPlayerHandle>(null)
  const currentTimeRef = useRef(0)

  // Playlist queue data
  const activePlaylist = playlists.find((p) => p.id === playlistId) ?? null
  const playlistVideoIds = activePlaylist?.videoIds ?? []
  const { videos: playlistVideos } = useVideosByIds(playlistVideoIds)

  const nextPlaylistIndex = playlistIndex >= 0 ? playlistIndex + 1 : -1
  const nextPlaylistVideoId =
    nextPlaylistIndex >= 0 && nextPlaylistIndex < playlistVideoIds.length
      ? playlistVideoIds[nextPlaylistIndex]
      : null

  useEffect(() => {
    addToHistory(videoId)
  }, [videoId, addToHistory])

  // Scroll to top on video change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [videoId])

  // Dismiss mini player when on watch page (full player is showing)
  useEffect(() => {
    dismiss()
  }, [videoId, dismiss])

  // Keep currentTimeRef in sync for mini player handoff
  const handleTimeProgress = useCallback((time: number) => {
    currentTimeRef.current = time
    setCurrentTime(time)
  }, [])

  const streamUrl =
    video?.formatStreams?.[0]?.url ??
    video?.adaptiveFormats?.find(
      (f) => f.qualityLabel && !f.type?.startsWith('audio')
    )?.url ??
    null

  const hlsUrl = video?.hlsUrl ?? null
  const dashUrl = video?.dashUrl ?? null
  const primaryStreamUrl = streamUrl ?? hlsUrl ?? dashUrl

  const appVideo = video ? toAppVideo(video) : null
  const relatedVideos = (video?.recommendedVideos ?? []).map(toAppVideo)
  const nextRelatedVideo = relatedVideos[0]

  // When navigating away from this watch page, spin up the mini player
  useEffect(() => {
    if (!video || !appVideo) return
    return () => {
      const time = currentTimeRef.current
      if (primaryStreamUrl && time > 0) {
        setMiniVideo({
          id: videoId,
          title: appVideo.title ?? video.title ?? '',
          streamUrl: streamUrl,
          hlsUrl: hlsUrl,
          dashUrl: dashUrl,
          initialTime: time,
        })
      }
    }
  }, [videoId, video, appVideo, primaryStreamUrl, streamUrl, hlsUrl, dashUrl, setMiniVideo])

  const handleVideoEnded = useCallback(() => {
    if (nextPlaylistVideoId || nextRelatedVideo) setAutoplayCountdown(5)
  }, [nextPlaylistVideoId, nextRelatedVideo?.id])

  useEffect(() => {
    if (autoplayCountdown === null) return
    if (autoplayCountdown <= 0) {
      if (nextPlaylistVideoId) {
        navigate(`/watch/${nextPlaylistVideoId}?playlist=${playlistId}&index=${nextPlaylistIndex}`, { replace: false })
      } else if (nextRelatedVideo) {
        navigate(`/watch/${nextRelatedVideo.id}`, { replace: false })
      }
      setAutoplayCountdown(null)
      return
    }
    const t = setTimeout(() => setAutoplayCountdown((c) => (c ?? 0) - 1), 1000)
    return () => clearTimeout(t)
  }, [autoplayCountdown, nextPlaylistVideoId, nextRelatedVideo, navigate, playlistId, nextPlaylistIndex])

  if (loading && !video) {
    return (
      <div className="mx-auto max-w-5xl space-y-6 animate-pulse">
        <div className="aspect-video rounded-2xl bg-gray-100 dark:bg-gray-800/50" />
        <div className="space-y-3">
          <div className="h-6 w-3/4 rounded-lg bg-gray-100 dark:bg-gray-800/50" />
          <div className="h-4 w-1/2 rounded-lg bg-gray-100 dark:bg-gray-800/50" />
        </div>
      </div>
    )
  }

  if (!loading && (error || !video)) {
    return (
      <div className="mx-auto max-w-5xl">
        <VideoPlayer
          videoId={videoId}
          initialTime={getPlaybackPosition(videoId)}
          onTimeUpdate={(time) => setPlaybackPosition(videoId, time)}
        />
        <div className="mt-4 text-sm text-gray-400 dark:text-gray-500">
          Video details could not be loaded.
        </div>
      </div>
    )
  }

  if (!video || !appVideo) return null

  const hasSubtitles = (video.subtitles?.length ?? 0) > 0
  const hasPlaylist = activePlaylist !== null && playlistVideoIds.length > 0

  const autoplayNextTitle = nextPlaylistVideoId
    ? (playlistVideos.find((v) => v.id === nextPlaylistVideoId)?.title ?? 'Next video')
    : nextRelatedVideo?.title ?? null

  const playerEl = (
    <motion.div
      className="relative"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
    >
      <VideoPlayer
        ref={playerRef}
        videoId={videoId}
        title={video.title}
        streamUrl={streamUrl}
        hlsUrl={hlsUrl}
        dashUrl={dashUrl}
        initialTime={getPlaybackPosition(videoId)}
        onTimeUpdate={(time) => setPlaybackPosition(videoId, time)}
        onTimeProgress={handleTimeProgress}
        onEnded={primaryStreamUrl ? handleVideoEnded : undefined}
        theaterMode={theaterMode}
        onTheaterModeToggle={() => setTheaterMode((t) => !t)}
        formatStreams={video.formatStreams}
        chapters={video.chapters}
      />
      <AnimatePresence>
        {autoplayCountdown !== null && autoplayNextTitle && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setAutoplayCountdown(null)}
            className="absolute inset-0 z-20 flex cursor-pointer flex-col items-center justify-center gap-4 rounded-2xl"
          >
            <div className="absolute inset-0 rounded-2xl bg-black/30 backdrop-blur-md" />
            <div
              className="relative flex flex-col items-center gap-3 rounded-3xl border border-white/30 bg-white/15 px-8 py-10 shadow-2xl backdrop-blur-2xl dark:border-white/20 dark:bg-white/10"
              onClick={(e) => e.stopPropagation()}
            >
              <span className="text-[8rem] font-bold tabular-nums leading-none text-white drop-shadow-lg md:text-[10rem]">
                {autoplayCountdown}
              </span>
              <p className="text-center text-sm font-medium text-white/90">
                Up next: {autoplayNextTitle}
              </p>
              <p className="text-xs text-white/60">Click anywhere to cancel</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )

  const sharedContent = (
    <>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1, ease: [0.4, 0, 0.2, 1] }}
      >
        <VideoInfo
          currentTime={currentTime}
          video={{
            title: appVideo.title ?? '',
            views: appVideo.views || '',
            uploadedAt: appVideo.uploadedAt ?? '',
            channelName: appVideo.channelName ?? '',
            channelId: appVideo.channelId ?? '',
            channelAvatar: appVideo.channelAvatar ?? '',
            channelVerified: appVideo.channelVerified,
            description: video.description,
            subscriberCount: video.subscriberCount,
            likeCount: video.likeCount,
          }}
          videoId={videoId}
          liked={isFavorite(videoId)}
          disliked={isDisliked(videoId)}
          onLike={() => toggleFavorite(videoId)}
          onDislike={() => toggleDislike(videoId)}
          onSave={() => setSaveModalOpen(true)}
          onDownload={() => setDownloadModalOpen(true)}
        />
      </motion.div>

      {relatedVideos.length > 0 && !hasPlaylist && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          <div className="mb-5 flex items-center gap-3">
            <h2 className="text-lg font-semibold tracking-tight text-gray-900 dark:text-white">
              Up next
            </h2>
            <div className="h-px flex-1 bg-gray-100 dark:bg-gray-800" />
          </div>
          <div className="-mx-4 overflow-visible md:-mx-8 lg:-mx-10">
            <div className="overflow-x-auto overflow-y-visible scrollbar-hide">
              <div className="flex gap-6 px-4 py-12 md:px-8 lg:px-10">
                {relatedVideos.map((v, i) => (
                  <div key={`${v.id}-${i}`} className="w-[280px] shrink-0 overflow-visible">
                    <VideoCard video={v} index={i} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      )}

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.3 }}
      >
        <CommentSection
          comments={comments}
          loading={commentsLoading}
          loadingMore={commentsLoadingMore}
          hasMore={commentsHasMore}
          isLivestream={video?.liveNow ?? false}
          onLoadMore={commentsLoadMore}
        />
      </motion.div>

      <SaveToPlaylistModal
        videoId={videoId}
        isOpen={saveModalOpen}
        onClose={() => setSaveModalOpen(false)}
      />
      <DownloadModal
        isOpen={downloadModalOpen}
        onClose={() => setDownloadModalOpen(false)}
        initialUrl={`https://www.youtube.com/watch?v=${videoId}`}
      />
    </>
  )

  if (theaterMode) {
    return (
      <div className="space-y-10">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="-mx-4 md:-mx-8 lg:-mx-10"
        >
          {playerEl}
        </motion.div>
        {sharedContent}
      </div>
    )
  }

  // Two-column layout when playlist is active or subtitles present
  const showSidebar = hasPlaylist || hasSubtitles

  return (
    <div
      className={cn(
        'grid grid-cols-1 gap-8 lg:gap-10',
        showSidebar && 'lg:grid-cols-[1fr_320px]'
      )}
    >
      <div className="space-y-10">
        {playerEl}
        {sharedContent}
      </div>

      {showSidebar && (
        <aside className="lg:sticky lg:top-24 lg:self-start lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto">
          {hasPlaylist && (
            <PlaylistQueuePanel
              playlist={activePlaylist}
              videos={playlistVideos}
              currentVideoId={videoId}
              currentIndex={playlistIndex}
            />
          )}
          {hasSubtitles && !hasPlaylist && (
            <TranscriptPanel
              subtitles={video.subtitles ?? []}
              currentTime={currentTime}
              onSeek={(time) => playerRef.current?.seek(time)}
              isOpen={transcriptOpen}
              onToggle={() => setTranscriptOpen((o) => !o)}
            />
          )}
        </aside>
      )}
    </div>
  )
}

// ─── Playlist Queue Panel ──────────────────────────────────────

interface PlaylistQueuePanelProps {
  playlist: { id: string; name: string; description: string; videoIds: string[] }
  videos: ReturnType<typeof toAppVideo>[]
  currentVideoId: string
  currentIndex: number
}

function PlaylistQueuePanel({
  playlist,
  videos,
  currentVideoId,
  currentIndex,
}: PlaylistQueuePanelProps) {
  const videoIds = playlist.videoIds
  const videoMap = new Map(videos.map((v) => [v.id, v]))

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white dark:border-gray-800 dark:bg-gray-900">
      {/* Panel header */}
      <div className="flex items-center gap-2.5 border-b border-gray-100 px-4 py-3 dark:border-gray-800">
        <List className="size-4 shrink-0 text-brand-500" />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-brand-600 dark:text-brand-400">
            Playing from playlist
          </p>
          <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">
            {playlist.name}
          </p>
        </div>
        <span className="shrink-0 text-xs text-gray-400 dark:text-gray-500">
          {currentIndex + 1} / {videoIds.length}
        </span>
      </div>

      {/* Up next label */}
      <div className="px-4 pt-3 pb-1">
        <p className="text-xs font-medium text-gray-400 uppercase tracking-wider dark:text-gray-500">
          Up next from playlist
        </p>
      </div>

      {/* Video list */}
      <div className="space-y-0.5 px-2 pb-2">
        {videoIds.map((vid, index) => {
          const videoData = videoMap.get(vid)
          const isCurrent = vid === currentVideoId
          const watchUrl = `/watch/${vid}?playlist=${playlist.id}&index=${index}`

          return (
            <Link
              key={vid}
              to={watchUrl}
              className={cn(
                'flex items-center gap-2.5 rounded-xl p-2 transition-colors',
                isCurrent
                  ? 'bg-brand-50 dark:bg-brand-950/30'
                  : 'hover:bg-gray-50 dark:hover:bg-gray-800/60'
              )}
            >
              <span className={cn(
                'w-5 shrink-0 text-center text-xs tabular-nums',
                isCurrent ? 'text-brand-600 dark:text-brand-400 font-semibold' : 'text-gray-400 dark:text-gray-500'
              )}>
                {isCurrent ? (
                  <Play className="size-3 mx-auto" />
                ) : (
                  index + 1
                )}
              </span>

              <div className="relative h-10 w-[72px] shrink-0 overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-800">
                <img
                  src={videoData?.thumbnail || getFallbackThumbnail(vid)}
                  alt=""
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
                {videoData?.duration && (
                  <span className="absolute bottom-0.5 right-0.5 rounded bg-black/70 px-1 py-0.5 text-[9px] tabular-nums text-white leading-none">
                    {videoData.duration}
                  </span>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <p className={cn(
                  'line-clamp-2 text-xs font-medium leading-tight',
                  isCurrent ? 'text-brand-600 dark:text-brand-400' : 'text-gray-800 dark:text-gray-100'
                )}>
                  {videoData?.title ?? 'Loading…'}
                </p>
                {videoData?.channelName && (
                  <p className="mt-0.5 truncate text-[11px] text-gray-400 dark:text-gray-500">
                    {videoData.channelName}
                  </p>
                )}
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
