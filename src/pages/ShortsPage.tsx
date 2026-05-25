import {
  useRef,
  useState,
  useEffect,
  useCallback,
} from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft,
  Heart,
  Share07,
  Bookmark,
  VolumeX,
  VolumeMax,
  Play,
  Loading02,
} from '@untitledui/icons'
import { useHomeFeed, type AppVideo } from '@/hooks/useYouTube'
import { getVideoStreams } from '@/api/youtube'
import { useUserData } from '@/hooks/useUserData'
import { SaveToPlaylistModal } from '@/components/video/SaveToPlaylistModal'
import { cn } from '@/lib/utils'

const SHORTS_DURATION_MAX = 60
const PRELOAD_AHEAD = 2

interface ShortStream {
  url: string | null
  loading: boolean
  error: boolean
}

type StreamCache = Map<string, ShortStream>

function useShortStreams(
  videos: AppVideo[],
  activeIndex: number,
): StreamCache {
  const cacheRef = useRef<StreamCache>(new Map())

  useEffect(() => {
    const toLoad = videos.slice(
      Math.max(0, activeIndex),
      activeIndex + PRELOAD_AHEAD + 1,
    )

    for (const video of toLoad) {
      const cached = cacheRef.current.get(video.id)
      if (cached) continue

      cacheRef.current.set(video.id, { url: null, loading: true, error: false })

      getVideoStreams(video.id)
        .then((detail) => {
          const url =
            detail?.formatStreams?.[0]?.url ??
            detail?.adaptiveFormats?.find(
              (f) => f.qualityLabel && !f.type?.startsWith('audio'),
            )?.url ??
            null
          cacheRef.current.set(video.id, { url, loading: false, error: !url })
        })
        .catch(() => {
          cacheRef.current.set(video.id, {
            url: null,
            loading: false,
            error: true,
          })
        })
    }
  }, [activeIndex, videos.length])

  return cacheRef.current
}

interface ShortItemProps {
  video: AppVideo
  isActive: boolean
  isMuted: boolean
  streamCache: StreamCache
  onEnded: () => void
  onToggleMute: () => void
  onLike: () => void
  onShare: () => void
  onSave: () => void
  onChannelClick: () => void
  isLiked: boolean
  isSaved: boolean
}

function ShortItem({
  video,
  isActive,
  isMuted,
  streamCache,
  onEnded,
  onToggleMute,
  onLike,
  onShare,
  onSave,
  onChannelClick,
  isLiked,
  isSaved,
}: ShortItemProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const stream = streamCache.get(video.id)

  useEffect(() => {
    const vid = videoRef.current
    if (!vid) return

    if (isActive && stream?.url) {
      vid.currentTime = 0
      const playPromise = vid.play()
      if (playPromise) {
        playPromise.catch(() => {})
      }
    } else {
      vid.pause()
    }
  }, [isActive, stream?.url])

  useEffect(() => {
    const vid = videoRef.current
    if (!vid) return
    vid.muted = isMuted
  }, [isMuted])

  const handleVideoClick = useCallback(() => {
    const vid = videoRef.current
    if (!vid) return
    if (vid.paused) {
      vid.play().catch(() => {})
    } else {
      vid.pause()
    }
  }, [])

  return (
    <div
      className="relative flex h-dvh w-full snap-start snap-always items-center justify-center bg-black"
    >
      <div className="relative flex h-full w-full max-w-[400px] flex-col overflow-hidden bg-black md:rounded-2xl md:shadow-2xl">
        {stream?.url ? (
          <video
            ref={videoRef}
            key={video.id}
            src={stream.url}
            loop
            playsInline
            muted={isMuted}
            onEnded={onEnded}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onClick={handleVideoClick}
            className="h-full w-full cursor-pointer object-cover"
          />
        ) : (
          <img
            src={video.thumbnail}
            alt={video.title}
            className="h-full w-full object-cover"
          />
        )}

        {(!stream || stream.loading) && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex size-14 items-center justify-center rounded-full bg-black/50 backdrop-blur-sm">
              <Loading02 className="size-7 animate-spin text-white" />
            </div>
          </div>
        )}

        {stream?.error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/60">
            <p className="text-sm text-white/70">Unavailable</p>
          </div>
        )}

        {isActive && stream?.url && !isPlaying && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex size-16 items-center justify-center rounded-full bg-black/40 backdrop-blur-sm">
              <Play className="ml-1 size-8 text-white" />
            </div>
          </div>
        )}

        {/* Gradient overlay */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />

        {/* Mute/unmute — top-left of video */}
        <button
          onClick={onToggleMute}
          className="absolute left-3 top-3 flex size-9 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm transition-colors hover:bg-black/60"
          aria-label={isMuted ? 'Unmute' : 'Mute'}
        >
          {isMuted ? (
            <VolumeX className="size-4" />
          ) : (
            <VolumeMax className="size-4" />
          )}
        </button>

        {/* Bottom overlay: title + channel */}
        <div className="absolute bottom-0 left-0 right-14 p-4">
          <p className="line-clamp-2 text-sm font-semibold leading-snug text-white drop-shadow">
            {video.title}
          </p>
          <button
            onClick={onChannelClick}
            className="mt-1 text-xs text-white/70 drop-shadow transition-colors hover:text-white"
          >
            @{video.channelName}
          </button>
          {video.views && (
            <p className="mt-0.5 text-xs text-white/50 drop-shadow">
              {video.views} views
            </p>
          )}
        </div>

        {/* Right-side action buttons: Like, Share, Save */}
        <div className="absolute bottom-16 right-3 flex flex-col items-center gap-5">
          <button
            onClick={onLike}
            className="flex flex-col items-center gap-1"
            aria-label={isLiked ? 'Unlike' : 'Like'}
          >
            <div
              className={cn(
                'flex size-10 items-center justify-center rounded-full transition-colors',
                isLiked
                  ? 'bg-red-500/20 text-red-500'
                  : 'bg-black/40 text-white backdrop-blur-sm',
              )}
            >
              <Heart
                className={cn(
                  'size-5 transition-all',
                  isLiked && 'fill-current',
                )}
              />
            </div>
            <span className="text-[10px] font-medium text-white/80">Like</span>
          </button>

          <button
            onClick={onShare}
            className="flex flex-col items-center gap-1"
            aria-label="Share"
          >
            <div className="flex size-10 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm">
              <Share07 className="size-5" />
            </div>
            <span className="text-[10px] font-medium text-white/80">Share</span>
          </button>

          <button
            onClick={onSave}
            className="flex flex-col items-center gap-1"
            aria-label={isSaved ? 'Unsave' : 'Save'}
          >
            <div
              className={cn(
                'flex size-10 items-center justify-center rounded-full transition-colors',
                isSaved
                  ? 'bg-brand-solid/20 text-brand-solid'
                  : 'bg-black/40 text-white backdrop-blur-sm',
              )}
            >
              <Bookmark
                className={cn(
                  'size-5 transition-all',
                  isSaved && 'fill-current',
                )}
              />
            </div>
            <span className="text-[10px] font-medium text-white/80">Save</span>
          </button>
        </div>
      </div>
    </div>
  )
}

function useShortsVideos() {
  const { videos, loading, loadingMore, hasMore, loadMore, error } =
    useHomeFeed(null, 'US')

  const shorts = videos.filter(
    (v) =>
      !v.liveNow &&
      v.lengthSeconds > 0 &&
      v.lengthSeconds <= SHORTS_DURATION_MAX,
  )

  return { shorts, loading, loadingMore, hasMore, loadMore, error }
}

export function ShortsPage() {
  const navigate = useNavigate()
  const { shorts, loading, loadingMore, hasMore, loadMore } = useShortsVideos()
  const { toggleFavorite, isFavorite, playlists, watchLater } = useUserData()

  const [activeIndex, setActiveIndex] = useState(0)
  const [isMuted, setIsMuted] = useState(true)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [saveModalVideoId, setSaveModalVideoId] = useState<string | null>(null)

  const containerRef = useRef<HTMLDivElement>(null)
  const itemRefs = useRef<Map<number, HTMLDivElement | null>>(new Map())
  const copyToastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const streamCache = useShortStreams(shorts, activeIndex)
  const [, forceUpdate] = useState(0)

  // Poll for stream loading state updates (cache is a ref, not reactive state)
  useEffect(() => {
    const nearbyIds = shorts.slice(activeIndex, activeIndex + PRELOAD_AHEAD + 1).map((v) => v.id)
    const isAnyLoading = () => nearbyIds.some((id) => streamCache.get(id)?.loading)
    if (!isAnyLoading()) return
    const interval = setInterval(() => {
      if (isAnyLoading()) {
        forceUpdate((n) => n + 1)
      } else {
        clearInterval(interval)
      }
    }, 300)
    return () => clearInterval(interval)
  }, [shorts, activeIndex, streamCache])

  // Load more when approaching end
  useEffect(() => {
    if (
      !loading &&
      !loadingMore &&
      hasMore &&
      activeIndex >= shorts.length - 3
    ) {
      loadMore()
    }
  }, [activeIndex, shorts.length, loading, loadingMore, hasMore, loadMore])

  // IntersectionObserver for snap-scroll active index tracking
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
            const idx = Number(entry.target.getAttribute('data-index'))
            if (!Number.isNaN(idx)) {
              setActiveIndex(idx)
            }
          }
        }
      },
      { threshold: 0.5, root: container },
    )

    const items = container.querySelectorAll('[data-index]')
    items.forEach((el) => observer.observe(el))

    return () => observer.disconnect()
  }, [shorts.length])

  const scrollToIndex = useCallback((index: number) => {
    const container = containerRef.current
    const el = itemRefs.current.get(index)
    if (!container || !el) return
    container.scrollTo({ top: el.offsetTop, behavior: 'smooth' })
  }, [])

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        scrollToIndex(Math.min(activeIndex + 1, shorts.length - 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        scrollToIndex(Math.max(activeIndex - 1, 0))
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [activeIndex, shorts.length, scrollToIndex])

  const handleEnded = useCallback(() => {
    const next = activeIndex + 1
    if (next < shorts.length) {
      scrollToIndex(next)
    }
  }, [activeIndex, shorts.length, scrollToIndex])

  const handleShare = useCallback((videoId: string) => {
    const url = `${window.location.origin}/watch/${videoId}`
    navigator.clipboard.writeText(url).catch(() => {})
    setCopiedId(videoId)
    if (copyToastTimerRef.current) clearTimeout(copyToastTimerRef.current)
    copyToastTimerRef.current = setTimeout(() => setCopiedId(null), 2000)
  }, [])

  useEffect(() => () => {
    if (copyToastTimerRef.current) clearTimeout(copyToastTimerRef.current)
  }, [])

  /** A video is "saved" if it's in watch-later or any playlist */
  const isSaved = useCallback(
    (videoId: string) =>
      watchLater.includes(videoId) ||
      playlists.some((p) => p.videoIds.includes(videoId)),
    [watchLater, playlists],
  )

  return (
    <div className="fixed inset-0 z-40 bg-black">
      <div
        ref={containerRef}
        className="h-full w-full overflow-y-scroll snap-y snap-mandatory scrollbar-hide"
      >
        {loading && shorts.length === 0 ? (
          <div className="flex h-dvh items-center justify-center">
            <Loading02 className="size-10 animate-spin text-white/60" />
          </div>
        ) : shorts.length === 0 ? (
          <div className="flex h-dvh flex-col items-center justify-center gap-4 text-center">
            <p className="text-lg font-semibold text-white">No shorts found</p>
            <p className="text-sm text-white/50">Try again later</p>
          </div>
        ) : (
          <>
            {shorts.map((video, index) => (
              <div
                key={video.id}
                data-index={index}
                ref={(el) => itemRefs.current.set(index, el)}
              >
                <ShortItem
                  video={video}
                  isActive={activeIndex === index}
                  isMuted={isMuted}
                  streamCache={streamCache}
                  onEnded={handleEnded}
                  onToggleMute={() => setIsMuted((m) => !m)}
                  onLike={() => toggleFavorite(video.id)}
                  onShare={() => handleShare(video.id)}
                  onSave={() => setSaveModalVideoId(video.id)}
                  onChannelClick={() =>
                    video.channelId
                      ? navigate(`/channel/${video.channelId}`)
                      : undefined
                  }
                  isLiked={isFavorite(video.id)}
                  isSaved={isSaved(video.id)}
                />
              </div>
            ))}
            {loadingMore && (
              <div className="flex h-24 items-center justify-center">
                <Loading02 className="size-8 animate-spin text-white/40" />
              </div>
            )}
          </>
        )}
      </div>

      {/* Back button */}
      <button
        onClick={() => navigate(-1)}
        className="absolute left-4 top-4 z-50 flex size-10 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm transition-colors hover:bg-black/70"
        aria-label="Go back"
      >
        <ArrowLeft className="size-5" />
      </button>

      {/* Link copied toast */}
      <AnimatePresence>
        {copiedId && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="absolute bottom-8 left-1/2 -translate-x-1/2 rounded-full bg-white/90 px-4 py-2 text-sm font-medium text-gray-900 shadow-lg"
          >
            Link copied!
          </motion.div>
        )}
      </AnimatePresence>

      {/* Save to playlist modal */}
      {saveModalVideoId && (
        <SaveToPlaylistModal
          videoId={saveModalVideoId}
          isOpen={true}
          onClose={() => setSaveModalVideoId(null)}
        />
      )}
    </div>
  )
}
