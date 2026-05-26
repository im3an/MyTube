import { createContext, useContext, useState, useCallback } from 'react'

export interface MiniPlayerVideo {
  id: string
  title: string
  streamUrl: string | null
  hlsUrl: string | null
  dashUrl: string | null
  initialTime: number
}

interface MiniPlayerContextValue {
  miniVideo: MiniPlayerVideo | null
  setMiniVideo: (video: MiniPlayerVideo | null) => void
  miniPlaying: boolean
  setMiniPlaying: (playing: boolean) => void
  dismiss: () => void
}

const MiniPlayerContext = createContext<MiniPlayerContextValue | null>(null)

export function MiniPlayerProvider({ children }: { children: React.ReactNode }) {
  const [miniVideo, setMiniVideoState] = useState<MiniPlayerVideo | null>(null)
  const [miniPlaying, setMiniPlaying] = useState(false)

  const setMiniVideo = useCallback((video: MiniPlayerVideo | null) => {
    setMiniVideoState(video)
    if (video) setMiniPlaying(true)
  }, [])

  const dismiss = useCallback(() => {
    setMiniVideoState(null)
    setMiniPlaying(false)
  }, [])

  return (
    <MiniPlayerContext.Provider value={{ miniVideo, setMiniVideo, miniPlaying, setMiniPlaying, dismiss }}>
      {children}
    </MiniPlayerContext.Provider>
  )
}

export function useMiniPlayer() {
  const ctx = useContext(MiniPlayerContext)
  if (!ctx) throw new Error('useMiniPlayer must be used within MiniPlayerProvider')
  return ctx
}
