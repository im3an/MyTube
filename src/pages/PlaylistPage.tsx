import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { VideoCard } from '@/components/video/VideoCard'
import { Button } from '@/components/base/buttons/button'
import { useUserData } from '@/hooks/useUserData'
import { useVideosByIds } from '@/hooks/useYouTube'
import { Pencil01, Trash01, ChevronUp, ChevronDown } from '@untitledui/icons'
import { Input } from '@/components/base/input/input'

export function PlaylistPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const {
    playlists,
    removeFromPlaylist,
    updatePlaylist,
    deletePlaylist,
    moveVideoInPlaylist,
  } = useUserData()
  const playlist = playlists.find((p) => p.id === id)
  const { videos, loading } = useVideosByIds(playlist?.videoIds ?? [])

  const [editing, setEditing] = useState(false)
  const [editName, setEditName] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState(false)

  if (!playlist) {
    return (
      <div className="py-16 text-center text-sm text-gray-400 dark:text-gray-500">
        Playlist not found
      </div>
    )
  }

  const startEdit = () => {
    setEditName(playlist.name)
    setEditing(true)
  }

  const saveEdit = () => {
    if (editName.trim()) {
      updatePlaylist(playlist.id, { name: editName.trim() })
      setEditing(false)
    }
  }

  const handleDelete = () => {
    deletePlaylist(playlist.id)
    navigate('/playlists')
  }

  return (
    <div className="space-y-6">
      <div className="animate-fade-in space-y-3">
        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm">
          <Link to="/playlists" className="text-gray-400 hover:text-gray-700 dark:text-gray-500 dark:hover:text-gray-300">
            Playlists
          </Link>
          <span className="text-gray-400">/</span>
          <span className="font-medium text-gray-700 dark:text-gray-200">{playlist.name}</span>
        </nav>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 flex-1">
            {editing ? (
              <div className="flex flex-wrap items-center gap-2">
                <Input
                  value={editName}
                  onChange={(value) => setEditName(value)}
                  className="max-w-xs"
                  onKeyDown={(e) => e.key === 'Enter' && saveEdit()}
                />
                <Button size="sm" color="primary" onClick={saveEdit}>
                  Save
                </Button>
                <Button size="sm" color="tertiary" onClick={() => setEditing(false)}>
                  Cancel
                </Button>
              </div>
            ) : (
              <>
                <h1 className="text-2xl font-semibold tracking-tight text-gray-900 dark:text-white">
                  {playlist.name}
                </h1>
                <p className="mt-1 text-sm text-gray-400 dark:text-gray-500">
                  {playlist.description || `${playlist.videoIds.length} videos`}
                </p>
              </>
            )}
          </div>
          {!editing && (
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                color="tertiary"
                className="rounded-xl"
                iconLeading={Pencil01}
                onClick={startEdit}
              >
                Rename
              </Button>
              {deleteConfirm ? (
                <>
                  <Button
                    size="sm"
                    color="primary"
                    className="rounded-xl bg-red-600 hover:bg-red-700"
                    onClick={handleDelete}
                  >
                    Confirm delete
                  </Button>
                  <Button size="sm" color="tertiary" onClick={() => setDeleteConfirm(false)}>
                    Cancel
                  </Button>
                </>
              ) : (
                <Button
                  size="sm"
                  color="tertiary"
                  className="rounded-xl text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30"
                  iconLeading={Trash01}
                  onClick={() => setDeleteConfirm(true)}
                >
                  Delete
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
      {loading ? (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="aspect-video rounded-2xl bg-gray-100 dark:bg-gray-800" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {videos.map((video, index) => (
            <div key={video.id} className="group relative">
              <VideoCard
                video={video}
                showRemove
                onRemove={() => removeFromPlaylist(playlist.id, video.id)}
              />
              <div className="absolute right-2 top-2 z-10 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                <button
                  onClick={() => moveVideoInPlaylist(playlist.id, video.id, 'up')}
                  disabled={index === 0}
                  className="flex size-8 items-center justify-center rounded-lg bg-black/60 text-white backdrop-blur-sm hover:bg-black/80 disabled:opacity-30"
                  aria-label="Move up"
                >
                  <ChevronUp className="size-4" />
                </button>
                <button
                  onClick={() => moveVideoInPlaylist(playlist.id, video.id, 'down')}
                  disabled={index === videos.length - 1}
                  className="flex size-8 items-center justify-center rounded-lg bg-black/60 text-white backdrop-blur-sm hover:bg-black/80 disabled:opacity-30"
                  aria-label="Move down"
                >
                  <ChevronDown className="size-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
