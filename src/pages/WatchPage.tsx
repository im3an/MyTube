import { useParams, useNavigate } from 'react-router-dom'
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
import { useVideo, useVideoComments } from '@/hooks/useYouTube'
import { toAppVideo } from '@/api/youtube'
import { useUserData } from '@/hooks/useUserData'

export function WatchPage() {
  const { id } = useParams<{ id: string }>()
  const videoId = id ?? 'pHCLGs4GGvQ'
  const { video, loading, error } = useVideo(videoId)
  const {
    comments,
    loading: commentsLoading,
    loadingMore: commentsLoadingMore,
    hasMore: commentsHasMore,
    loadMore: commentsLoadMore,
  } = useVideoComments(videoId, video?.liveNow ?? false)
  const navigate = useNavigate()
  const { addToHistory, toggleFavorite, isFavorite, toggleDislike, isDisliked, getPlaybackPosition, setPlaybackPosition } = useUserData()
  const [saveModalOpen, setSaveModalOpen] = useState(false)
  const [downloadModalOpen, setDownloadModalOpen] = useState(false)
  const [autoplayCountdown, setAutoplayCountdown] = useState<number | null>(null)
  const [transcriptOpen, setTranscriptOpen] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const playerRef = useRef<VideoPlayerHandle>(null)

  useEffect(() => {
    addToHistory(videoId)
  }, [videoId, addToHistory])

  // Scroll to top on video change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [videoId])

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
  const nextVideo = relatedVideos[0]

  const handleVideoEnded = useCallback(() => {
    if (nextVideo) setAutoplayCountdown(5)
  }, [nextVideo?.id])

  useEffect(() => {
    if (autoplayCountdown === null) return
    if (autoplayCountdown <= 0) {
      if (nextVideo) navigate(`/watch/${nextVideo.id}`, { replace: false })
      setAutoplayCountdown(null)
      return
    }
    const t = setTimeout(() => setAutoplayCountdown((c) => (c ?? 0) - 1), 1000)
    return () => clearTimeout(t)
  }, [autoplayCountdown, nextVideo, navigate])

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

  return (
    <div
      className={`grid grid-cols-1 gap-8 lg:gap-10 ${hasSubtitles ? 'lg:grid-cols-[1fr_320px]' : ''}`}
    >
      {/* Left column: video + info + related + comments */}
      <div className="space-y-10">
      {/* Centered player */}
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
          onTimeProgress={setCurrentTime}
          onEnded={primaryStreamUrl ? handleVideoEnded : undefined}
        />
        <AnimatePresence>
          {autoplayCountdown !== null && nextVideo && (
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
                  Up next: {nextVideo.title}
                </p>
                <p className="text-xs text-white/60">Click anywhere to cancel</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Video info */}
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

      {/* Related videos — horizontal scroll */}
      {relatedVideos.length > 0 && (
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

      {/* Comments */}
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
      </div>

      {/* Right column: transcript (only when subtitles available) */}
      {hasSubtitles && (
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <TranscriptPanel
            subtitles={video.subtitles ?? []}
            currentTime={currentTime}
            onSeek={(time) => playerRef.current?.seek(time)}
            isOpen={transcriptOpen}
            onToggle={() => setTranscriptOpen((o) => !o)}
          />
        </aside>
      )}
    </div>
  )
}
