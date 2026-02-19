import { useCallback, useEffect, useRef, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import * as userDataApi from '@/api/user-data'

export interface HistoryEntry {
  videoId: string
  watchedAt: string
}

export interface FavoriteCreator {
  id: string
  name: string
  avatar?: string
}

export interface Playlist {
  id: string
  name: string
  description: string
  videoIds: string[]
  thumbnailUrls?: string[]
}

export interface SearchHistoryEntry {
  query: string
  searchedAt: string
}

export interface UserData {
  username: string
  favoriteCreators: FavoriteCreator[]
  history: HistoryEntry[]
  favorites: string[]
  dislikes: string[]
  watchLater: string[]
  playlists: Playlist[]
  playbackPositions: Record<string, number>
  searchHistory: SearchHistoryEntry[]
  watchTime: Record<string, number>
}

const STORAGE_KEY = 'mytube-user-data'

const DEFAULT: UserData = {
  username: '',
  favoriteCreators: [],
  history: [],
  favorites: [],
  dislikes: [],
  watchLater: [],
  playlists: [],
  playbackPositions: {},
  searchHistory: [],
  watchTime: {},
}

function loadFromStorage(): UserData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<UserData>
      return { ...DEFAULT, ...parsed }
    }
  } catch {}
  return { ...DEFAULT }
}

function saveToStorage(data: UserData) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

function apiToUserData(api: userDataApi.UserDataPayload): UserData {
  return {
    username: '',
    favoriteCreators: api.favoriteCreators ?? [],
    history: api.history ?? [],
    favorites: api.favorites ?? [],
    dislikes: api.dislikes ?? [],
    watchLater: api.watchLater ?? [],
    playlists: (api.playlists ?? []).map((p) => ({ ...p, thumbnailUrls: [] })),
    playbackPositions: api.playbackPositions ?? {},
    searchHistory: api.searchHistory ?? [],
    watchTime: api.playbackPositions ?? {},
  }
}

function userDataToPayload(data: UserData): userDataApi.UserDataPayload {
  return {
    history: data.history,
    favorites: data.favorites,
    dislikes: data.dislikes,
    favoriteCreators: data.favoriteCreators,
    watchLater: data.watchLater,
    playlists: data.playlists.map(({ id, name, description, videoIds }) => ({ id, name, description, videoIds })),
    searchHistory: data.searchHistory,
    playbackPositions: data.playbackPositions,
  }
}

const SYNC_DEBOUNCE_MS = 800

export function useUserData() {
  const { user } = useAuth()
  const [data, setData] = useState<UserData>(loadFromStorage)
  const [isLoading, setIsLoading] = useState(false)
  const syncTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isMountedRef = useRef(true)

  // When logged in: fetch from backend (fresh for new accounts, no localStorage merge)
  useEffect(() => {
    isMountedRef.current = true
    if (user) {
      setIsLoading(true)
      userDataApi
        .getUserData()
        .then((api) => {
          if (isMountedRef.current) setData(apiToUserData(api))
        })
        .catch(() => {
          if (isMountedRef.current) setData({ ...DEFAULT })
        })
        .finally(() => {
          if (isMountedRef.current) setIsLoading(false)
        })
    } else {
      setData(loadFromStorage())
    }
    return () => {
      isMountedRef.current = false
      if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current)
    }
  }, [user?.id])

  // Persist: localStorage when anonymous, debounced API when logged in
  useEffect(() => {
    if (!user) {
      saveToStorage(data)
      return
    }
    if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current)
    syncTimeoutRef.current = setTimeout(() => {
      syncTimeoutRef.current = null
      userDataApi.putUserData(userDataToPayload(data)).catch(() => {})
    }, SYNC_DEBOUNCE_MS)
    return () => {
      if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current)
    }
  }, [user?.id, data])

  const setUsername = useCallback((name: string) => {
    setData((prev) => ({ ...prev, username: name.trim() }))
  }, [])

  const addFavoriteCreator = useCallback(
    (id: string, name: string, avatar?: string) => {
      setData((prev) => {
        if (prev.favoriteCreators.some((c) => c.id === id)) return prev
        return {
          ...prev,
          favoriteCreators: [...prev.favoriteCreators, { id, name, avatar }],
        }
      })
    },
    []
  )

  const removeFavoriteCreator = useCallback((id: string) => {
    setData((prev) => ({
      ...prev,
      favoriteCreators: prev.favoriteCreators.filter((c) => c.id !== id),
    }))
  }, [])

  const toggleFavoriteCreator = useCallback(
    (id: string, name: string, avatar?: string) => {
      setData((prev) => {
        const exists = prev.favoriteCreators.some((c) => c.id === id)
        if (exists) {
          return {
            ...prev,
            favoriteCreators: prev.favoriteCreators.filter((c) => c.id !== id),
          }
        }
        return {
          ...prev,
          favoriteCreators: [...prev.favoriteCreators, { id, name, avatar }],
        }
      })
    },
    []
  )

  const isFavoriteCreator = useCallback(
    (id: string) => data.favoriteCreators.some((c) => c.id === id),
    [data.favoriteCreators]
  )

  const addToHistory = useCallback((videoId: string) => {
    setData((prev) => ({
      ...prev,
      history: [
        { videoId, watchedAt: new Date().toISOString() },
        ...prev.history.filter((h) => h.videoId !== videoId),
      ].slice(0, 100),
    }))
  }, [])

  const clearHistory = useCallback(() => {
    setData((prev) => ({ ...prev, history: [] }))
  }, [])

  const toggleFavorite = useCallback((videoId: string) => {
    setData((prev) => ({
      ...prev,
      favorites: prev.favorites.includes(videoId)
        ? prev.favorites.filter((id) => id !== videoId)
        : [...prev.favorites, videoId],
    }))
  }, [])

  const isFavorite = useCallback(
    (videoId: string) => data.favorites.includes(videoId),
    [data.favorites]
  )

  const toggleDislike = useCallback((videoId: string) => {
    setData((prev) => ({
      ...prev,
      dislikes: prev.dislikes.includes(videoId)
        ? prev.dislikes.filter((id) => id !== videoId)
        : [...prev.dislikes, videoId],
    }))
  }, [])

  const isDisliked = useCallback(
    (videoId: string) => data.dislikes.includes(videoId),
    [data.dislikes]
  )

  const toggleWatchLater = useCallback((videoId: string) => {
    setData((prev) => ({
      ...prev,
      watchLater: prev.watchLater.includes(videoId)
        ? prev.watchLater.filter((id) => id !== videoId)
        : [...prev.watchLater, videoId],
    }))
  }, [])

  const removeFromWatchLater = useCallback((videoId: string) => {
    setData((prev) => ({
      ...prev,
      watchLater: prev.watchLater.filter((id) => id !== videoId),
    }))
  }, [])

  const createPlaylist = useCallback(
    (name: string, description: string = '') => {
      const id = crypto.randomUUID()
      setData((prev) => ({
        ...prev,
        playlists: [...prev.playlists, { id, name, description, videoIds: [] }],
      }))
      return id
    },
    []
  )

  const addToPlaylist = useCallback((playlistId: string, videoId: string) => {
    setData((prev) => ({
      ...prev,
      playlists: prev.playlists.map((p) =>
        p.id === playlistId
          ? {
              ...p,
              videoIds: p.videoIds.includes(videoId) ? p.videoIds : [...p.videoIds, videoId],
            }
          : p
      ),
    }))
  }, [])

  const removeFromPlaylist = useCallback(
    (playlistId: string, videoId: string) => {
      setData((prev) => ({
        ...prev,
        playlists: prev.playlists.map((p) =>
          p.id === playlistId ? { ...p, videoIds: p.videoIds.filter((id) => id !== videoId) } : p
        ),
      }))
    },
    []
  )

  const updatePlaylist = useCallback(
    (playlistId: string, updates: { name?: string; description?: string }) => {
      setData((prev) => ({
        ...prev,
        playlists: prev.playlists.map((p) =>
          p.id === playlistId
            ? {
                ...p,
                ...(updates.name !== undefined && { name: updates.name }),
                ...(updates.description !== undefined && { description: updates.description }),
              }
            : p
        ),
      }))
    },
    []
  )

  const deletePlaylist = useCallback((playlistId: string) => {
    setData((prev) => ({
      ...prev,
      playlists: prev.playlists.filter((p) => p.id !== playlistId),
    }))
  }, [])

  const moveVideoInPlaylist = useCallback(
    (playlistId: string, videoId: string, direction: 'up' | 'down') => {
      setData((prev) => ({
        ...prev,
        playlists: prev.playlists.map((p) => {
          if (p.id !== playlistId) return p
          const idx = p.videoIds.indexOf(videoId)
          if (idx < 0) return p
          const newIdx = direction === 'up' ? idx - 1 : idx + 1
          if (newIdx < 0 || newIdx >= p.videoIds.length) return p
          const ids = [...p.videoIds]
          ;[ids[idx], ids[newIdx]] = [ids[newIdx], ids[idx]]
          return { ...p, videoIds: ids }
        }),
      }))
    },
    []
  )

  const setPlaybackPosition = useCallback((videoId: string, seconds: number) => {
    const pos = Math.floor(seconds)
    setData((prev) => ({
      ...prev,
      playbackPositions: { ...prev.playbackPositions, [videoId]: pos },
      watchTime: { ...prev.watchTime, [videoId]: pos },
    }))
  }, [])

  const addSearchToHistory = useCallback((query: string) => {
    const trimmed = query.trim()
    if (!trimmed) return
    setData((prev) => {
      const entry = { query: trimmed, searchedAt: new Date().toISOString() }
      const filtered = prev.searchHistory.filter((e) => e.query.toLowerCase() !== trimmed.toLowerCase())
      return {
        ...prev,
        searchHistory: [entry, ...filtered].slice(0, 20),
      }
    })
  }, [])

  const getPlaybackPosition = useCallback(
    (videoId: string): number | undefined => data.playbackPositions[videoId],
    [data.playbackPositions]
  )

  return {
    ...data,
    isLoadingUserData: isLoading,
    setUsername,
    addFavoriteCreator,
    removeFavoriteCreator,
    toggleFavoriteCreator,
    isFavoriteCreator,
    addToHistory,
    clearHistory,
    toggleFavorite,
    isFavorite,
    toggleDislike,
    isDisliked,
    toggleWatchLater,
    removeFromWatchLater,
    createPlaylist,
    addToPlaylist,
    removeFromPlaylist,
    updatePlaylist,
    deletePlaylist,
    moveVideoInPlaylist,
    setPlaybackPosition,
    getPlaybackPosition,
    addSearchToHistory,
  }
}
