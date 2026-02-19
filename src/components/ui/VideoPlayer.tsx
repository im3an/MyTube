import { useRef, useState, useCallback, useEffect, forwardRef, useImperativeHandle } from 'react'
import Hls from 'hls.js'
import {
  Play,
  PauseCircle,
  VolumeMax,
  VolumeMin,
  VolumeX,
  Maximize01,
  Minimize01,
} from '@untitledui/icons'
import { cx } from '@/utils/cx'

export interface VideoPlayerProps {
  videoId: string
  title?: string
  streamUrl?: string | null
  hlsUrl?: string | null
  dashUrl?: string | null
  /** Resume from saved position (seconds) */
  initialTime?: number
  /** Called when position should be saved (e.g. on pause) */
  onTimeUpdate?: (time: number) => void
  /** Called frequently for transcript sync (throttled) */
  onTimeProgress?: (time: number) => void
  /** Called when video ends */
  onEnded?: () => void
}

export interface VideoPlayerHandle {
  seek: (time: number) => void
}

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  return `${m}:${s.toString().padStart(2, '0')}`
}

type StreamType = 'direct' | 'hls' | 'dash'

export const VideoPlayer = forwardRef<VideoPlayerHandle, VideoPlayerProps>(function VideoPlayer(
  { videoId, title, streamUrl: directStreamUrl, hlsUrl, dashUrl, initialTime, onTimeUpdate, onTimeProgress, onEnded },
  ref
) {
  const effectiveUrl = directStreamUrl ?? hlsUrl ?? dashUrl ?? null
  const streamType: StreamType = directStreamUrl
    ? 'direct'
    : hlsUrl && effectiveUrl === hlsUrl
      ? 'hls'
      : dashUrl && effectiveUrl === dashUrl
        ? 'dash'
        : 'direct'
  const videoRef = useRef<HTMLVideoElement>(null)
  const hlsRef = useRef<Hls | null>(null)

  useImperativeHandle(ref, () => ({
    seek: (time: number) => {
      const v = videoRef.current
      if (v) {
        v.currentTime = time
        onTimeUpdate?.(time)
      }
    },
  }), [onTimeUpdate])
  const containerRef = useRef<HTMLDivElement>(null)
  const progressRef = useRef<HTMLDivElement>(null)
  const volumeRef = useRef<HTMLDivElement>(null)

  const [playing, setPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(1)
  const [muted, setMuted] = useState(false)
  const [showControls, setShowControls] = useState(true)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [buffered, setBuffered] = useState(0)
  const [hoverProgress, setHoverProgress] = useState<number | null>(null)
  const [showVolume, setShowVolume] = useState(false)

  const prevVolumeRef = useRef(1)
  const hideTimerRef = useRef<ReturnType<typeof setTimeout>>()
  const progressThrottleRef = useRef<number>(0)

  const video = videoRef.current

  const togglePlay = useCallback(() => {
    if (!video) return
    if (video.paused) {
      video.play()
    } else {
      video.pause()
    }
  }, [video])

  const handleProgressClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!video || !progressRef.current) return
      const rect = progressRef.current.getBoundingClientRect()
      const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
      const newTime = pct * duration
      video.currentTime = newTime
      if (onTimeUpdate && newTime > 0) onTimeUpdate(newTime)
    },
    [video, duration, onTimeUpdate]
  )

  const handleProgressHover = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!progressRef.current) return
      const rect = progressRef.current.getBoundingClientRect()
      const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
      setHoverProgress(pct)
    },
    []
  )

  const handleVolumeClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!video || !volumeRef.current) return
      const rect = volumeRef.current.getBoundingClientRect()
      const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
      video.volume = pct
      video.muted = pct === 0
      setVolume(pct)
      setMuted(pct === 0)
      if (pct > 0) prevVolumeRef.current = pct
    },
    [video]
  )

  const toggleMute = useCallback(() => {
    if (!video) return
    if (muted || volume === 0) {
      const restore = prevVolumeRef.current > 0 ? prevVolumeRef.current : 0.5
      video.volume = restore
      video.muted = false
      setVolume(restore)
      setMuted(false)
    } else {
      prevVolumeRef.current = volume
      video.muted = true
      setMuted(true)
    }
  }, [video, muted, volume])

  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return
    if (document.fullscreenElement) {
      document.exitFullscreen()
    } else {
      containerRef.current.requestFullscreen()
    }
  }, [])

  // Set initial time (resume) when video loads
  useEffect(() => {
    const v = videoRef.current
    if (!v || initialTime == null || initialTime < 1) return
    const handler = () => {
      if (v.duration && v.duration > initialTime! && v.currentTime < 1) {
        v.currentTime = initialTime!
      }
    }
    v.addEventListener('loadedmetadata', handler)
    if (v.duration) handler()
    return () => v.removeEventListener('loadedmetadata', handler)
  }, [effectiveUrl, initialTime])

  // HLS via hls.js (Chrome, Firefox, Edge); Safari uses native HLS via video src
  useEffect(() => {
    if (streamType !== 'hls' || !effectiveUrl) return
    if (!Hls.isSupported()) return // Safari: use native src, no effect needed

    const v = videoRef.current
    if (!v) return

    hlsRef.current?.destroy()
    const hls = new Hls()
    hlsRef.current = hls
    hls.loadSource(effectiveUrl)
    hls.attachMedia(v)

    return () => {
      hls.destroy()
      hlsRef.current = null
    }
  }, [effectiveUrl, streamType])

  // Video event listeners
  useEffect(() => {
    const v = videoRef.current
    if (!v) return

    const onTimeUpdateEvt = () => {
      const t = v.currentTime
      setCurrentTime(t)
      if (onTimeProgress && t - progressThrottleRef.current > 0.5) {
        progressThrottleRef.current = t
        onTimeProgress(t)
      }
    }
    const onDurationChange = () => setDuration(v.duration || 0)
    const onPlay = () => setPlaying(true)
    const onPause = () => {
      setPlaying(false)
      if (onTimeUpdate && v.currentTime > 0 && v.duration - v.currentTime > 5) {
        onTimeUpdate(v.currentTime)
      }
    }
    const onSeeked = () => {
      if (onTimeUpdate && v.currentTime > 0) onTimeUpdate(v.currentTime)
    }
    const onEndedEvt = () => {
      setPlaying(false)
      onEnded?.()
    }
    const onProgress = () => {
      if (v.buffered.length > 0) {
        setBuffered(v.buffered.end(v.buffered.length - 1))
      }
    }

    v.addEventListener('timeupdate', onTimeUpdateEvt)
    v.addEventListener('durationchange', onDurationChange)
    v.addEventListener('play', onPlay)
    v.addEventListener('pause', onPause)
    v.addEventListener('ended', onEndedEvt)
    v.addEventListener('progress', onProgress)
    v.addEventListener('seeked', onSeeked)

    return () => {
      v.removeEventListener('timeupdate', onTimeUpdateEvt)
      v.removeEventListener('durationchange', onDurationChange)
      v.removeEventListener('play', onPlay)
      v.removeEventListener('pause', onPause)
      v.removeEventListener('ended', onEndedEvt)
      v.removeEventListener('progress', onProgress)
      v.removeEventListener('seeked', onSeeked)
    }
  }, [effectiveUrl, onTimeUpdate, onTimeProgress, onEnded])

  // Fullscreen change listener
  useEffect(() => {
    const onFsChange = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', onFsChange)
    return () => document.removeEventListener('fullscreenchange', onFsChange)
  }, [])

  // Auto-hide controls
  const showControlsTemporarily = useCallback(() => {
    setShowControls(true)
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current)
    hideTimerRef.current = setTimeout(() => {
      if (playing) setShowControls(false)
    }, 3000)
  }, [playing])

  useEffect(() => {
    return () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current)
    }
  }, [])

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return

      switch (e.key) {
        case ' ':
        case 'k':
          e.preventDefault()
          togglePlay()
          break
        case 'f':
          e.preventDefault()
          toggleFullscreen()
          break
        case 'm':
          e.preventDefault()
          toggleMute()
          break
        case 'ArrowLeft':
          e.preventDefault()
          if (video) video.currentTime = Math.max(0, video.currentTime - 5)
          break
        case 'ArrowRight':
          e.preventDefault()
          if (video) video.currentTime = Math.min(duration, video.currentTime + 5)
          break
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [togglePlay, toggleFullscreen, toggleMute, video, duration])

  // No playable stream — YouTube embed as fallback (or DASH defer)
  if (!effectiveUrl || streamType === 'dash') {
    const embedParams = new URLSearchParams()
    if (initialTime != null && initialTime > 0) embedParams.set('start', String(Math.floor(initialTime)))
    const embedSrc = `https://www.youtube.com/embed/${videoId}${embedParams.toString() ? `?${embedParams}` : ''}`

    return (
      <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-black">
        <iframe
          title={title ?? 'Video player'}
          src={embedSrc}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="h-full w-full"
        />
        <div className="absolute bottom-2 left-2 rounded-lg bg-black/70 px-2 py-1 text-[10px] text-white/80">
          Custom player unavailable — using YouTube embed
        </div>
      </div>
    )
  }

  const progressPct = duration > 0 ? (currentTime / duration) * 100 : 0
  const bufferedPct = duration > 0 ? (buffered / duration) * 100 : 0
  const effectiveVolume = muted ? 0 : volume
  const VolumeIcon = muted || volume === 0 ? VolumeX : volume < 0.5 ? VolumeMin : VolumeMax

  return (
    <div
      ref={containerRef}
      className="group relative aspect-video w-full overflow-hidden rounded-2xl bg-black select-none"
      onMouseMove={showControlsTemporarily}
      onMouseLeave={() => playing && setShowControls(false)}
    >
      {/* Video element — direct & Safari HLS use src; hls.js handles HLS in other browsers */}
      <video
        ref={videoRef}
        key={effectiveUrl}
        src={
          streamType === 'direct' || (streamType === 'hls' && !Hls.isSupported())
            ? effectiveUrl
            : undefined
        }
        playsInline
        onClick={togglePlay}
        className="h-full w-full cursor-pointer"
      >
        Your browser does not support the video tag.
      </video>

      {/* Center play button (when paused) */}
      {!playing && (
        <button
          onClick={togglePlay}
          className="absolute inset-0 flex items-center justify-center animate-fade-in"
        >
          <div className="flex size-16 items-center justify-center rounded-full bg-white/90 shadow-xl backdrop-blur-sm transition-transform duration-200 hover:scale-110 dark:bg-black/70">
            <Play className="ml-1 size-7 text-gray-900 dark:text-white" />
          </div>
        </button>
      )}

      {/* Controls overlay */}
      <div
        className={cx(
          'absolute inset-x-0 bottom-0 transition-all duration-300',
          showControls ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
        )}
      >
        {/* Gradient background */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

        <div className="relative px-4 pb-4 pt-10">
          {/* Progress bar */}
          <div
            ref={progressRef}
            className="group/progress mb-3 h-1 w-full cursor-pointer rounded-full bg-white/20 transition-all hover:h-1.5"
            onClick={handleProgressClick}
            onMouseMove={handleProgressHover}
            onMouseLeave={() => setHoverProgress(null)}
          >
            {/* Buffered */}
            <div
              className="absolute h-full rounded-full bg-white/20"
              style={{ width: `${bufferedPct}%` }}
            />
            {/* Progress */}
            <div
              className="absolute h-full rounded-full bg-white transition-all"
              style={{ width: `${progressPct}%` }}
            />
            {/* Hover indicator */}
            {hoverProgress !== null && (
              <div
                className="absolute h-full rounded-full bg-white/30"
                style={{ width: `${hoverProgress * 100}%` }}
              />
            )}
            {/* Thumb */}
            <div
              className="absolute top-1/2 size-3 -translate-y-1/2 rounded-full bg-white opacity-0 shadow-md transition-opacity group-hover/progress:opacity-100"
              style={{ left: `calc(${progressPct}% - 6px)` }}
            />
          </div>

          {/* Bottom controls row */}
          <div className="flex items-center gap-3">
            {/* Play/Pause */}
            <button
              onClick={(e) => { e.stopPropagation(); togglePlay() }}
              className="flex size-8 items-center justify-center rounded-lg text-white/90 transition-all duration-150 hover:bg-white/10 hover:text-white"
              aria-label={playing ? 'Pause' : 'Play'}
            >
              {playing ? (
                <PauseCircle className="size-5" />
              ) : (
                <Play className="ml-0.5 size-5" />
              )}
            </button>

            {/* Time */}
            <span className="text-xs font-medium tabular-nums text-white/80">
              {formatTime(currentTime)}
              <span className="text-white/40"> / {formatTime(duration)}</span>
            </span>

            {/* Spacer */}
            <div className="flex-1" />

            {/* Volume */}
            <div
              className="flex items-center gap-1.5"
              onMouseEnter={() => setShowVolume(true)}
              onMouseLeave={() => setShowVolume(false)}
            >
              <button
                onClick={(e) => { e.stopPropagation(); toggleMute() }}
                className="flex size-8 items-center justify-center rounded-lg text-white/90 transition-all duration-150 hover:bg-white/10 hover:text-white"
                aria-label={muted ? 'Unmute' : 'Mute'}
              >
                <VolumeIcon className="size-5" />
              </button>
              <div
                className={cx(
                  'overflow-hidden transition-all duration-200',
                  showVolume ? 'w-20 opacity-100' : 'w-0 opacity-0'
                )}
              >
                <div
                  ref={volumeRef}
                  className="h-1 w-full cursor-pointer rounded-full bg-white/20"
                  onClick={(e) => { e.stopPropagation(); handleVolumeClick(e) }}
                >
                  <div
                    className="h-full rounded-full bg-white transition-all"
                    style={{ width: `${effectiveVolume * 100}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Fullscreen */}
            <button
              onClick={(e) => { e.stopPropagation(); toggleFullscreen() }}
              className="flex size-8 items-center justify-center rounded-lg text-white/90 transition-all duration-150 hover:bg-white/10 hover:text-white"
              aria-label={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
            >
              {isFullscreen ? (
                <Minimize01 className="size-5" />
              ) : (
                <Maximize01 className="size-5" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
})
