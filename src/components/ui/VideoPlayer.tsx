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
  Expand01,
  Minimize02,
  Expand03,
  Check,
  Repeat01,
  Speedometer01,
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
  /** Theater mode state */
  theaterMode?: boolean
  /** Called to toggle theater mode */
  onTheaterModeToggle?: () => void
  /** All available format streams for quality selection */
  formatStreams?: { url: string; quality: string; qualityLabel: string }[]
  /** Chapter markers to show on progress bar */
  chapters?: { title: string; start: number; image?: string }[]
  /** Controlled playback speed (optional) */
  speed?: number
  /** Called when speed changes */
  onSpeedChange?: (speed: number) => void
  /** Controlled loop state (optional) */
  loop?: boolean
  /** Called when loop changes */
  onLoopChange?: (loop: boolean) => void
}

export interface VideoPlayerHandle {
  seek: (time: number) => void
}

const SPEEDS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2]

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  return `${m}:${s.toString().padStart(2, '0')}`
}

function parseQualityHeight(label: string): number {
  const m = label.match(/^(\d+)/)
  return m ? parseInt(m[1], 10) : 0
}

function getChapterAtTime(
  chapters: { title: string; start: number }[],
  time: number
): string | undefined {
  if (!chapters.length) return undefined
  let current: string | undefined
  for (const c of chapters) {
    if (c.start <= time) current = c.title
    else break
  }
  return current
}

type StreamType = 'direct' | 'hls' | 'dash'

interface ShortcutToast {
  id: number
  label: string
}

export const VideoPlayer = forwardRef<VideoPlayerHandle, VideoPlayerProps>(function VideoPlayer(
  {
    videoId,
    title,
    streamUrl: directStreamUrl,
    hlsUrl,
    dashUrl,
    initialTime,
    onTimeUpdate,
    onTimeProgress,
    onEnded,
    theaterMode,
    onTheaterModeToggle,
    formatStreams,
    chapters,
    speed,
    onSpeedChange,
    loop,
    onLoopChange,
  },
  ref
) {
  const [selectedStreamUrl, setSelectedStreamUrl] = useState<string | null>(null)

  const effectiveStreamUrl = selectedStreamUrl ?? directStreamUrl ?? hlsUrl ?? dashUrl ?? null
  const streamType: StreamType = effectiveStreamUrl === directStreamUrl || (!directStreamUrl && !hlsUrl && !dashUrl)
    ? 'direct'
    : effectiveStreamUrl === hlsUrl
      ? 'hls'
      : effectiveStreamUrl === dashUrl
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
  const [showQualityMenu, setShowQualityMenu] = useState(false)
  const [showSpeedMenu, setShowSpeedMenu] = useState(false)
  const [shortcutToast, setShortcutToast] = useState<ShortcutToast | null>(null)
  const toastCounterRef = useRef(0)

  // Playback speed — prefer controlled prop, fall back to local state
  const [playbackSpeed, setPlaybackSpeedState] = useState(speed ?? 1)
  const effectiveSpeed = speed ?? playbackSpeed

  const setPlaybackSpeed = useCallback((s: number) => {
    setPlaybackSpeedState(s)
    onSpeedChange?.(s)
  }, [onSpeedChange])

  // Loop
  const [loopEnabled, setLoopEnabledState] = useState(loop ?? false)
  const effectiveLoop = loop ?? loopEnabled

  const setLoopEnabled = useCallback((v: boolean) => {
    setLoopEnabledState(v)
    onLoopChange?.(v)
  }, [onLoopChange])

  // PiP
  const [isPiP, setIsPiP] = useState(false)

  const prevVolumeRef = useRef(1)
  const hideTimerRef = useRef<ReturnType<typeof setTimeout>>()
  const progressThrottleRef = useRef<number>(0)
  const toastTimerRef = useRef<ReturnType<typeof setTimeout>>()

  const showToast = useCallback((label: string) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    toastCounterRef.current += 1
    setShortcutToast({ id: toastCounterRef.current, label })
    toastTimerRef.current = setTimeout(() => setShortcutToast(null), 1000)
  }, [])

  const togglePlay = useCallback(() => {
    const v = videoRef.current
    if (!v) return
    if (v.paused) {
      v.play()
    } else {
      v.pause()
    }
  }, [])

  const handleProgressClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const v = videoRef.current
      if (!v || !progressRef.current) return
      const rect = progressRef.current.getBoundingClientRect()
      const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
      const newTime = pct * duration
      v.currentTime = newTime
      if (onTimeUpdate && newTime > 0) onTimeUpdate(newTime)
    },
    [duration, onTimeUpdate]
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
      const v = videoRef.current
      if (!v || !volumeRef.current) return
      const rect = volumeRef.current.getBoundingClientRect()
      const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
      v.volume = pct
      v.muted = pct === 0
      setVolume(pct)
      setMuted(pct === 0)
      if (pct > 0) prevVolumeRef.current = pct
    },
    []
  )

  const toggleMute = useCallback(() => {
    const v = videoRef.current
    if (!v) return
    if (muted || volume === 0) {
      const restore = prevVolumeRef.current > 0 ? prevVolumeRef.current : 0.5
      v.volume = restore
      v.muted = false
      setVolume(restore)
      setMuted(false)
    } else {
      prevVolumeRef.current = volume
      v.muted = true
      setMuted(true)
    }
  }, [muted, volume])

  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return
    if (document.fullscreenElement) {
      document.exitFullscreen()
    } else {
      containerRef.current.requestFullscreen()
    }
  }, [])

  const togglePiP = useCallback(async () => {
    const v = videoRef.current
    if (!v) return
    if (document.pictureInPictureElement) {
      await document.exitPictureInPicture()
    } else if (document.pictureInPictureEnabled) {
      await v.requestPictureInPicture()
    }
  }, [])

  // Sync playback speed to video element
  useEffect(() => {
    if (videoRef.current) videoRef.current.playbackRate = effectiveSpeed
  }, [effectiveSpeed])

  // Sync loop to video element
  useEffect(() => {
    if (videoRef.current) videoRef.current.loop = effectiveLoop
  }, [effectiveLoop])

  // PiP state sync — track browser-native PiP toggle
  useEffect(() => {
    const v = videoRef.current
    if (!v) return
    const onEnter = () => setIsPiP(true)
    const onLeave = () => setIsPiP(false)
    v.addEventListener('enterpictureinpicture', onEnter)
    v.addEventListener('leavepictureinpicture', onLeave)
    return () => {
      v.removeEventListener('enterpictureinpicture', onEnter)
      v.removeEventListener('leavepictureinpicture', onLeave)
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
  }, [effectiveStreamUrl, initialTime])

  // HLS via hls.js (Chrome, Firefox, Edge); Safari uses native HLS via video src
  useEffect(() => {
    if (streamType !== 'hls' || !effectiveStreamUrl) return
    if (!Hls.isSupported()) return

    const v = videoRef.current
    if (!v) return

    hlsRef.current?.destroy()
    const hls = new Hls()
    hlsRef.current = hls
    hls.loadSource(effectiveStreamUrl)
    hls.attachMedia(v)

    return () => {
      hls.destroy()
      hlsRef.current = null
    }
  }, [effectiveStreamUrl, streamType])

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
  }, [effectiveStreamUrl, onTimeUpdate, onTimeProgress, onEnded])

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
      if (!videoRef.current?.paused) setShowControls(false)
    }, 3000)
  }, [])

  useEffect(() => {
    return () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current)
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    }
  }, [])

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return

      const v = videoRef.current
      switch (e.key) {
        case ' ':
        case 'k':
        case 'K':
          e.preventDefault()
          if (v) {
            if (v.paused) { v.play(); showToast('Play') } else { v.pause(); showToast('Pause') }
          }
          break
        case 'f':
        case 'F':
          e.preventDefault()
          toggleFullscreen()
          showToast(document.fullscreenElement ? 'Exit Fullscreen' : 'Fullscreen')
          break
        case 'm':
        case 'M':
          e.preventDefault()
          toggleMute()
          showToast(muted || volume === 0 ? 'Unmuted' : 'Muted')
          break
        case 't':
        case 'T':
          e.preventDefault()
          onTheaterModeToggle?.()
          showToast(theaterMode ? 'Normal View' : 'Theater Mode')
          break
        case 'p':
        case 'P':
          e.preventDefault()
          togglePiP()
          showToast('Picture-in-Picture')
          break
        case '<':
        case ',':
          e.preventDefault()
          {
            const idx = SPEEDS.indexOf(effectiveSpeed)
            const next = idx > 0 ? SPEEDS[idx - 1] : SPEEDS[0]
            setPlaybackSpeed(next)
            showToast(`${next}×`)
          }
          break
        case '>':
        case '.':
          e.preventDefault()
          {
            const idx = SPEEDS.indexOf(effectiveSpeed)
            const next = idx < SPEEDS.length - 1 ? SPEEDS[idx + 1] : SPEEDS[SPEEDS.length - 1]
            setPlaybackSpeed(next)
            showToast(`${next}×`)
          }
          break
        case 'ArrowLeft':
          e.preventDefault()
          if (v) { v.currentTime = Math.max(0, v.currentTime - 5); showToast('−5s') }
          break
        case 'ArrowRight':
          e.preventDefault()
          if (v && duration > 0) { v.currentTime = Math.min(duration, v.currentTime + 5); showToast('+5s') }
          break
        case 'ArrowUp':
          e.preventDefault()
          if (v) {
            const newVol = Math.min(1, v.volume + 0.1)
            v.volume = newVol
            v.muted = false
            setVolume(newVol)
            setMuted(false)
            showToast(`Volume ${Math.round(newVol * 100)}%`)
          }
          break
        case 'ArrowDown':
          e.preventDefault()
          if (v) {
            const newVol = Math.max(0, v.volume - 0.1)
            v.volume = newVol
            v.muted = newVol === 0
            setVolume(newVol)
            setMuted(newVol === 0)
            showToast(`Volume ${Math.round(newVol * 100)}%`)
          }
          break
        default:
          if (/^[0-9]$/.test(e.key) && duration > 0) {
            e.preventDefault()
            const pct = parseInt(e.key, 10) / 10
            if (v) {
              v.currentTime = duration * pct
              showToast(`${e.key}0%`)
            }
          }
          break
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [toggleFullscreen, toggleMute, togglePiP, muted, volume, duration, theaterMode, onTheaterModeToggle, showToast, effectiveSpeed, setPlaybackSpeed])

  // No playable stream — YouTube embed as fallback (or DASH defer)
  if (!effectiveStreamUrl || streamType === 'dash') {
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

  const sortedStreams = formatStreams
    ? [...formatStreams].sort(
        (a, b) => parseQualityHeight(b.qualityLabel) - parseQualityHeight(a.qualityLabel)
      )
    : []

  const currentStreamLabel = selectedStreamUrl
    ? sortedStreams.find((s) => s.url === selectedStreamUrl)?.qualityLabel ?? 'Auto'
    : 'Auto'

  const speedLabel = effectiveSpeed === 1 ? '1×' : `${effectiveSpeed}×`

  const hoverTime = hoverProgress !== null ? hoverProgress * duration : null
  const hoverChapter = hoverTime !== null && chapters?.length
    ? getChapterAtTime(chapters, hoverTime)
    : undefined

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
        key={effectiveStreamUrl}
        src={
          streamType === 'direct' || (streamType === 'hls' && !Hls.isSupported())
            ? effectiveStreamUrl
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

      {/* Shortcut toast */}
      {shortcutToast && (
        <div
          key={shortcutToast.id}
          className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-xl bg-black/70 px-4 py-2 text-sm font-semibold text-white animate-fade-in backdrop-blur-sm"
          style={{ animation: 'fadeInOut 1s ease forwards' }}
        >
          {shortcutToast.label}
        </div>
      )}

      {/* Overlay to close menus on outside click */}
      {(showQualityMenu || showSpeedMenu) && (
        <div
          className="absolute inset-0 z-10"
          onClick={() => { setShowQualityMenu(false); setShowSpeedMenu(false) }}
        />
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
            className="group/progress relative mb-3 h-1 w-full cursor-pointer rounded-full bg-white/20 transition-all hover:h-1.5"
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
            {/* Chapter tick marks */}
            {duration > 0 && (chapters ?? []).map((ch) => (
              <div
                key={ch.start}
                className="absolute top-0 h-full w-0.5 bg-white/40 pointer-events-none"
                style={{ left: `${(ch.start / duration) * 100}%` }}
              />
            ))}
            {/* Thumb */}
            <div
              className="absolute top-1/2 size-3 -translate-y-1/2 rounded-full bg-white opacity-0 shadow-md transition-opacity group-hover/progress:opacity-100"
              style={{ left: `calc(${progressPct}% - 6px)` }}
            />
            {/* Hover tooltip */}
            {hoverProgress !== null && hoverTime !== null && (
              <div
                className="absolute bottom-4 -translate-x-1/2 rounded-lg bg-black/80 px-2 py-1 text-xs font-medium text-white backdrop-blur-sm pointer-events-none whitespace-nowrap"
                style={{ left: `${hoverProgress * 100}%` }}
              >
                <div>{formatTime(hoverTime)}</div>
                {hoverChapter && (
                  <div className="text-white/60 text-[10px] mt-0.5">{hoverChapter}</div>
                )}
              </div>
            )}
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

            {/* Loop toggle */}
            <button
              onClick={(e) => { e.stopPropagation(); setLoopEnabled(!effectiveLoop) }}
              className={cx(
                'flex size-8 items-center justify-center rounded-lg transition-all duration-150',
                effectiveLoop
                  ? 'text-blue-400 hover:bg-white/10'
                  : 'text-white/90 hover:bg-white/10 hover:text-white'
              )}
              aria-label={effectiveLoop ? 'Disable loop' : 'Enable loop'}
              title={effectiveLoop ? 'Loop on' : 'Loop off'}
            >
              <Repeat01 className="size-4" />
            </button>

            {/* Speed selector */}
            <div className="relative z-20">
              <button
                onClick={(e) => { e.stopPropagation(); setShowSpeedMenu((v) => !v); setShowQualityMenu(false) }}
                className="flex h-8 items-center gap-1 rounded-lg px-2 text-xs font-semibold text-white/90 transition-all duration-150 hover:bg-white/10 hover:text-white"
                aria-label="Playback speed"
                title="Playback speed"
              >
                <Speedometer01 className="size-3.5" />
                <span>{speedLabel}</span>
              </button>

              {showSpeedMenu && (
                <div className="absolute bottom-10 right-0 min-w-[100px] overflow-hidden rounded-xl border border-white/10 bg-gray-950/95 shadow-2xl backdrop-blur-sm">
                  {SPEEDS.map((s) => (
                    <button
                      key={s}
                      onClick={(e) => {
                        e.stopPropagation()
                        setPlaybackSpeed(s)
                        setShowSpeedMenu(false)
                      }}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium text-white/90 transition-colors hover:bg-white/10"
                    >
                      <span className="flex-1">{s === 1 ? 'Normal' : `${s}×`}</span>
                      {effectiveSpeed === s && <Check className="size-3.5 text-white" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Quality selector */}
            {sortedStreams.length > 0 && (
              <div className="relative z-20">
                <button
                  onClick={(e) => { e.stopPropagation(); setShowQualityMenu((v) => !v); setShowSpeedMenu(false) }}
                  className="flex h-8 items-center rounded-lg px-2 text-xs font-semibold text-white/90 transition-all duration-150 hover:bg-white/10 hover:text-white"
                  aria-label="Quality"
                >
                  {currentStreamLabel}
                </button>

                {showQualityMenu && (
                  <div className="absolute bottom-10 right-0 min-w-[120px] overflow-hidden rounded-xl border border-white/10 bg-gray-950/95 shadow-2xl backdrop-blur-sm">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setSelectedStreamUrl(null)
                        setShowQualityMenu(false)
                      }}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium text-white/90 transition-colors hover:bg-white/10"
                    >
                      <span className="flex-1">Auto</span>
                      {selectedStreamUrl === null && <Check className="size-3.5 text-white" />}
                    </button>
                    {sortedStreams.map((stream) => (
                      <button
                        key={stream.url}
                        onClick={(e) => {
                          e.stopPropagation()
                          const v = videoRef.current
                          const time = v?.currentTime ?? 0
                          const wasPlaying = !v?.paused
                          setSelectedStreamUrl(stream.url)
                          setShowQualityMenu(false)
                          requestAnimationFrame(() => {
                            const el = videoRef.current
                            if (!el) return
                            el.currentTime = time
                            if (wasPlaying) el.play().catch(() => {})
                          })
                        }}
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium text-white/90 transition-colors hover:bg-white/10"
                      >
                        <span className="flex-1">{stream.qualityLabel}</span>
                        {selectedStreamUrl === stream.url && <Check className="size-3.5 text-white" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Picture-in-Picture */}
            {typeof document !== 'undefined' && document.pictureInPictureEnabled && (
              <button
                onClick={(e) => { e.stopPropagation(); togglePiP() }}
                className={cx(
                  'flex size-8 items-center justify-center rounded-lg transition-all duration-150',
                  isPiP
                    ? 'text-blue-400 hover:bg-white/10'
                    : 'text-white/90 hover:bg-white/10 hover:text-white'
                )}
                aria-label={isPiP ? 'Exit Picture-in-Picture' : 'Picture-in-Picture'}
                title={isPiP ? 'Exit Picture-in-Picture' : 'Picture-in-Picture'}
              >
                <Expand03 className="size-4" />
              </button>
            )}

            {/* Theater mode */}
            {onTheaterModeToggle && (
              <button
                onClick={(e) => { e.stopPropagation(); onTheaterModeToggle() }}
                className="flex size-8 items-center justify-center rounded-lg text-white/90 transition-all duration-150 hover:bg-white/10 hover:text-white"
                aria-label={theaterMode ? 'Exit theater mode' : 'Theater mode'}
              >
                {theaterMode ? (
                  <Minimize02 className="size-5" />
                ) : (
                  <Expand01 className="size-5" />
                )}
              </button>
            )}

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
