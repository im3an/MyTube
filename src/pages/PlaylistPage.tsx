import { useState, useRef, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { Button } from '@/components/base/buttons/button'
import { Input } from '@/components/base/input/input'
import { useUserData } from '@/hooks/useUserData'
import { useVideosByIds } from '@/hooks/useYouTube'
import type { AppVideo } from '@/hooks/useYouTube'
import { getFallbackThumbnail } from '@/api/youtube'
import {
  Pencil01,
  Trash01,
  Play,
  Shuffle01,
  X,
  DotsGrid,
} from '@untitledui/icons'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'

function formatSeconds(s: number): string {
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`
  return `${m}:${sec.toString().padStart(2, '0')}`
}

function parseDuration(duration: string | undefined): number {
  if (!duration) return 0
  const parts = duration.split(':').map(Number)
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2]
  if (parts.length === 2) return parts[0] * 60 + parts[1]
  return 0
}

interface DraggableVideoRowProps {
  video: AppVideo
  index: number
  total: number
  onRemove: () => void
  onReorder: (from: number, to: number) => void
  playlistId: string
}

function DraggableVideoRow({ video, index, total, onRemove, onReorder, playlistId }: DraggableVideoRowProps) {
  const dragStartY = useRef<number>(0)
  const dragStartIndex = useRef<number>(0)
  const isDragging = useRef(false)
  const rowRef = useRef<HTMLDivElement>(null)
  const [dragging, setDragging] = useState(false)

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      isDragging.current = true
      dragStartY.current = e.clientY
      dragStartIndex.current = index
      setDragging(true)

      const handleMouseMove = (me: MouseEvent) => {
        if (!isDragging.current) return
        const diff = me.clientY - dragStartY.current
        const rowHeight = rowRef.current?.offsetHeight ?? 68
        const steps = Math.round(diff / rowHeight)
        const newIndex = Math.max(0, Math.min(total - 1, dragStartIndex.current + steps))
        if (newIndex !== dragStartIndex.current) {
          onReorder(dragStartIndex.current, newIndex)
          dragStartIndex.current = newIndex
          dragStartY.current = me.clientY
        }
      }

      const handleMouseUp = () => {
        isDragging.current = false
        setDragging(false)
        window.removeEventListener('mousemove', handleMouseMove)
        window.removeEventListener('mouseup', handleMouseUp)
      }

      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
    },
    [index, total, onReorder]
  )

  const watchUrl = `/watch/${video.id}?playlist=${playlistId}&index=${index}`

  return (
    <div
      ref={rowRef}
      className={cn(
        'group flex items-center gap-3 rounded-xl p-2 transition-colors',
        dragging
          ? 'z-10 bg-gray-50 shadow-md dark:bg-gray-800'
          : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
      )}
    >
      <button
        onMouseDown={handleMouseDown}
        className="shrink-0 cursor-grab touch-none text-gray-300 hover:text-gray-500 dark:text-gray-600 dark:hover:text-gray-400 active:cursor-grabbing"
        aria-label="Drag to reorder"
      >
        <DotsGrid className="size-4" />
      </button>

      <span className="w-5 shrink-0 text-center text-sm tabular-nums text-gray-400 dark:text-gray-500">
        {index + 1}
      </span>

      <Link to={watchUrl} className="group/thumb relative shrink-0">
        <div className="relative h-12 w-[86px] overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-800">
          <img
            src={video.thumbnail || getFallbackThumbnail(video.id)}
            alt=""
            className="h-full w-full object-cover transition-transform duration-300 group-hover/thumb:scale-105"
            loading="lazy"
          />
          {video.duration && (
            <span className="absolute bottom-0.5 right-0.5 rounded bg-black/60 px-1 py-0.5 text-[9px] tabular-nums text-white">
              {video.duration}
            </span>
          )}
        </div>
      </Link>

      <div className="min-w-0 flex-1">
        <Link
          to={watchUrl}
          className="line-clamp-1 text-sm font-medium text-gray-900 hover:underline dark:text-gray-100"
        >
          {video.title}
        </Link>
        <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">{video.channelName}</p>
      </div>

      <button
        onClick={onRemove}
        className="shrink-0 text-gray-300 opacity-0 transition-opacity hover:text-red-500 group-hover:opacity-100 dark:text-gray-600 dark:hover:text-red-400"
        aria-label="Remove from playlist"
      >
        <X className="size-4" />
      </button>
    </div>
  )
}

export function PlaylistPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const {
    playlists,
    removeFromPlaylist,
    updatePlaylist,
    deletePlaylist,
  } = useUserData()
  const playlist = playlists.find((p) => p.id === id)
  const { videos, loading } = useVideosByIds(playlist?.videoIds ?? [])

  const [editing, setEditing] = useState(false)
  const [editName, setEditName] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState(false)

  const handleReorder = useCallback(
    (from: number, to: number) => {
      if (!playlist) return
      const ids = [...playlist.videoIds]
      const [moved] = ids.splice(from, 1)
      ids.splice(to, 0, moved)
      updatePlaylist(playlist.id, { videoIds: ids })
    },
    [playlist, updatePlaylist]
  )

  if (!playlist) {
    return (
      <div className="py-16 text-center text-sm text-gray-400 dark:text-gray-500">
        Playlist not found
      </div>
    )
  }

  const startEdit = () => {
    setEditName(playlist.name)
    setEditDescription(playlist.description ?? '')
    setEditing(true)
  }

  const saveEdit = () => {
    if (editName.trim()) {
      updatePlaylist(playlist.id, { name: editName.trim(), description: editDescription.trim() })
      setEditing(false)
    }
  }

  const handleDelete = () => {
    deletePlaylist(playlist.id)
    navigate('/playlists')
  }

  const handleShuffle = () => {
    if (playlist.videoIds.length === 0) return
    const shuffled = [...playlist.videoIds].sort(() => Math.random() - 0.5)
    navigate(`/watch/${shuffled[0]}?playlist=${playlist.id}&index=0`)
  }

  const firstVideoId = playlist.videoIds[0]
  const firstThumb = firstVideoId ? getFallbackThumbnail(firstVideoId) : null

  const totalSeconds = videos.reduce((sum, v) => sum + parseDuration(v.duration), 0)
  const totalDuration = totalSeconds > 0 ? formatSeconds(totalSeconds) : null

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm">
        <Link to="/playlists" className="text-gray-400 hover:text-gray-700 dark:text-gray-500 dark:hover:text-gray-300">
          Playlists
        </Link>
        <span className="text-gray-300 dark:text-gray-600">/</span>
        <span className="font-medium text-gray-700 dark:text-gray-200">{playlist.name}</span>
      </nav>

      {/* Header */}
      <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
        {/* Cover thumbnail */}
        <div className="w-full shrink-0 sm:w-56">
          <div className="aspect-video overflow-hidden rounded-2xl bg-gray-100 dark:bg-gray-800">
            {firstThumb ? (
              <img src={firstThumb} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-gray-300 dark:text-gray-600">
                <Play className="size-12" />
              </div>
            )}
          </div>
        </div>

        {/* Playlist info */}
        <div className="flex flex-1 flex-col justify-between gap-4">
          <div>
            {editing ? (
              <div className="space-y-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">Name</label>
                  <Input
                    value={editName}
                    onChange={setEditName}
                    onKeyDown={(e) => e.key === 'Enter' && saveEdit()}
                    inputClassName="text-xl font-semibold"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">Description</label>
                  <Input
                    value={editDescription}
                    onChange={setEditDescription}
                    placeholder="Optional description"
                  />
                </div>
                <div className="flex gap-2">
                  <Button size="sm" color="primary" onClick={saveEdit}>Save</Button>
                  <Button size="sm" color="tertiary" onClick={() => setEditing(false)}>Cancel</Button>
                </div>
              </div>
            ) : (
              <h1 className="text-2xl font-semibold tracking-tight text-gray-900 dark:text-white">
                {playlist.name}
              </h1>
            )}

            {playlist.description && (
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{playlist.description}</p>
            )}

            <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-gray-400 dark:text-gray-500">
              <span>{playlist.videoIds.length} video{playlist.videoIds.length !== 1 ? 's' : ''}</span>
              {totalDuration && <><span>·</span><span>{totalDuration} total</span></>}
            </div>
          </div>

          {/* Controls */}
          {!editing && (
            <div className="flex flex-wrap items-center gap-2">
              {firstVideoId && (
                <Button
                  size="md"
                  color="primary"
                  className="rounded-xl"
                  iconLeading={Play}
                  onClick={() => navigate(`/watch/${firstVideoId}?playlist=${playlist.id}&index=0`)}
                >
                  Play all
                </Button>
              )}
              {playlist.videoIds.length > 1 && (
                <Button
                  size="md"
                  color="secondary"
                  className="rounded-xl"
                  iconLeading={Shuffle01}
                  onClick={handleShuffle}
                >
                  Shuffle
                </Button>
              )}
              <Button
                size="md"
                color="tertiary"
                className="rounded-xl"
                iconLeading={Pencil01}
                onClick={startEdit}
              >
                Edit
              </Button>
              <AnimatePresence mode="wait">
                {deleteConfirm ? (
                  <motion.div
                    key="confirm"
                    initial={{ opacity: 0, x: -4 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -4 }}
                    className="flex gap-2"
                  >
                    <Button size="md" color="primary" className="rounded-xl bg-red-600 hover:bg-red-700" onClick={handleDelete}>
                      Confirm delete
                    </Button>
                    <Button size="md" color="tertiary" className="rounded-xl" onClick={() => setDeleteConfirm(false)}>
                      Cancel
                    </Button>
                  </motion.div>
                ) : (
                  <motion.div key="delete" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <Button
                      size="md"
                      color="tertiary"
                      className="rounded-xl text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30"
                      iconLeading={Trash01}
                      onClick={() => setDeleteConfirm(true)}
                    >
                      Delete
                    </Button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>

      {/* Video list */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex animate-pulse items-center gap-3 rounded-xl p-2">
              <div className="size-4 rounded bg-gray-100 dark:bg-gray-800" />
              <div className="w-5 rounded bg-gray-100 dark:bg-gray-800 h-4" />
              <div className="h-12 w-[86px] rounded-lg bg-gray-100 dark:bg-gray-800" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-2/3 rounded bg-gray-100 dark:bg-gray-800" />
                <div className="h-3 w-1/3 rounded bg-gray-100 dark:bg-gray-800" />
              </div>
            </div>
          ))}
        </div>
      ) : playlist.videoIds.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-sm text-gray-400 dark:text-gray-500">No videos yet. Add some from any video page.</p>
        </div>
      ) : (
        <div className="space-y-0.5">
          {playlist.videoIds.map((vid, index) => {
            const videoData = videos.find((v) => v.id === vid)
            if (!videoData) return null
            return (
              <DraggableVideoRow
                key={vid}
                video={videoData}
                index={index}
                total={playlist.videoIds.length}
                playlistId={playlist.id}
                onRemove={() => removeFromPlaylist(playlist.id, vid)}
                onReorder={handleReorder}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}
