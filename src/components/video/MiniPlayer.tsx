import { useRef, useEffect, useState, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import Hls from 'hls.js'
import { Play, PauseCircle, X } from '@untitledui/icons'
import { useMiniPlayer } from '@/components/providers/MiniPlayerContext'

export function MiniPlayer() {
  const { miniVideo, miniPlaying, setMiniPlaying, dismiss } = useMiniPlayer()
  const navigate = useNavigate()
  const location = useLocation()
  const videoRef = useRef<HTMLVideoElement>(null)
  const hlsRef = useRef<Hls | null>(null)
  const [playing, setPlaying] = useState(false)

  const isOnWatchPage = location.pathname.startsWith('/watch/')

  const effectiveUrl = miniVideo?.streamUrl ?? miniVideo?.hlsUrl ?? miniVideo?.dashUrl ?? null
  const streamType = miniVideo?.streamUrl ? 'direct' : miniVideo?.hlsUrl ? 'hls' : 'dash'

  useEffect(() => {
    if (!miniVideo || !effectiveUrl) return
    if (streamType !== 'hls') return
    if (!Hls.isSupported()) return

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
  }, [effectiveUrl, streamType, miniVideo])

  useEffect(() => {
    const v = videoRef.current
    if (!v) return
    const onPlay = () => setPlaying(true)
    const onPause = () => setPlaying(false)
    v.addEventListener('play', onPlay)
    v.addEventListener('pause', onPause)
    return () => {
      v.removeEventListener('play', onPlay)
      v.removeEventListener('pause', onPause)
    }
  }, [miniVideo])

  useEffect(() => {
    const v = videoRef.current
    if (!v) return
    if (miniPlaying) {
      v.play().catch(() => {})
    } else {
      v.pause()
    }
  }, [miniPlaying, miniVideo])

  const togglePlay = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    const v = videoRef.current
    if (!v) return
    if (v.paused) {
      v.play().catch(() => {})
      setMiniPlaying(true)
    } else {
      v.pause()
      setMiniPlaying(false)
    }
  }, [setMiniPlaying])

  const handleClick = useCallback(() => {
    if (!miniVideo) return
    const v = videoRef.current
    const time = v?.currentTime ?? miniVideo.initialTime
    dismiss()
    navigate(`/watch/${miniVideo.id}`, { state: { resumeTime: time } })
  }, [miniVideo, navigate, dismiss])

  if (!miniVideo || isOnWatchPage) return null

  return (
    <AnimatePresence>
      <motion.div
        key="mini-player"
        initial={{ opacity: 0, y: 40, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 40, scale: 0.95 }}
        transition={{ type: 'spring', damping: 24, stiffness: 320 }}
        className="fixed bottom-6 right-6 z-50 w-[320px] overflow-hidden rounded-2xl bg-gray-950 shadow-2xl ring-1 ring-white/10 cursor-pointer"
        onClick={handleClick}
      >
        <div className="relative aspect-video w-full bg-black">
          {effectiveUrl && streamType !== 'dash' ? (
            <video
              ref={videoRef}
              key={effectiveUrl}
              src={
                streamType === 'direct' || (streamType === 'hls' && !Hls.isSupported())
                  ? effectiveUrl
                  : undefined
              }
              playsInline
              muted={false}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <span className="text-xs text-white/40">Preview unavailable</span>
            </div>
          )}

          {!playing && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/20">
              <div className="flex size-10 items-center justify-center rounded-full bg-white/90 shadow-lg">
                <Play className="ml-0.5 size-4 text-gray-900" />
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 px-3 py-2.5">
          <p className="flex-1 truncate text-xs font-medium text-white">
            {miniVideo.title}
          </p>

          <button
            onClick={togglePlay}
            className="flex size-7 shrink-0 items-center justify-center rounded-lg text-white/70 transition-colors hover:bg-white/10 hover:text-white"
            aria-label={playing ? 'Pause' : 'Play'}
          >
            {playing ? <PauseCircle className="size-4" /> : <Play className="ml-0.5 size-4" />}
          </button>

          <button
            onClick={(e) => { e.stopPropagation(); dismiss() }}
            className="flex size-7 shrink-0 items-center justify-center rounded-lg text-white/70 transition-colors hover:bg-white/10 hover:text-white"
            aria-label="Close mini player"
          >
            <X className="size-4" />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
