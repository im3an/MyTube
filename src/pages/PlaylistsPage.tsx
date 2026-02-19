import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useUserData } from '@/hooks/useUserData'
import { getFallbackThumbnail } from '@/api/youtube'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button } from '@/components/base/buttons/button'
import { Input } from '@/components/base/input/input'
import { Folder, Plus, Pencil01, Trash01, X } from '@untitledui/icons'
import { motion, AnimatePresence } from 'framer-motion'

export function PlaylistsPage() {
  const navigate = useNavigate()
  const { playlists, createPlaylist, updatePlaylist, deletePlaylist } = useUserData()
  const [createOpen, setCreateOpen] = useState(false)
  const [newName, setNewName] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

  const handleCreate = () => {
    if (newName.trim()) {
      const id = createPlaylist(newName.trim())
      setNewName('')
      setCreateOpen(false)
      navigate(`/playlist/${id}`)
    }
  }

  const startEdit = (id: string, name: string) => {
    setEditingId(id)
    setEditName(name)
  }

  const saveEdit = () => {
    if (editingId && editName.trim()) {
      updatePlaylist(editingId, { name: editName.trim() })
      setEditingId(null)
    }
  }

  const handleDelete = (id: string) => {
    deletePlaylist(id)
    setDeleteConfirmId(null)
  }

  if (playlists.length === 0 && !createOpen) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center animate-fade-in">
        <div className="flex size-20 items-center justify-center rounded-2xl bg-gray-50 dark:bg-gray-800">
          <Folder className="size-10 text-gray-300 dark:text-gray-600" />
        </div>
        <h2 className="mt-5 text-lg font-semibold text-gray-900 dark:text-white">
          No playlists yet
        </h2>
        <p className="mt-2 max-w-xs text-sm text-gray-400 dark:text-gray-500">
          Create playlists from the Save button when watching a video.
        </p>
        <Button
          size="md"
          color="primary"
          className="mt-6 rounded-xl"
          iconLeading={Plus}
          onClick={() => setCreateOpen(true)}
        >
          Create playlist
        </Button>
      </div>
    )
  }

  const thumbnailsForPlaylist = (videoIds: string[]) =>
    videoIds.slice(0, 4).map((id) => getFallbackThumbnail(id))

  return (
    <div className="space-y-6">
      <PageHeader
        title="Your playlists"
        description="Create and manage your video playlists"
        actions={
          <Button
            size="sm"
            color="secondary"
            className="rounded-xl"
            iconLeading={Plus}
            onClick={() => setCreateOpen(true)}
          >
            Create playlist
          </Button>
        }
      />

      {/* Create playlist modal */}
      <AnimatePresence>
        {createOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/20 backdrop-blur-sm"
              onClick={() => setCreateOpen(false)}
            />
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                className="w-full max-w-sm overflow-hidden rounded-2xl border border-gray-200/50 bg-white shadow-xl dark:border-white/20 dark:bg-black/40 dark:shadow-none"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 dark:border-white/20">
                  <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                    Create playlist
                  </h2>
                  <button
                    onClick={() => setCreateOpen(false)}
                    className="flex size-7 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-50 dark:text-white/80 dark:hover:bg-white/10"
                  >
                    <X className="size-4" />
                  </button>
                </div>
                <div className="p-5">
                  <Input
                    placeholder="Playlist name"
                    value={newName}
                    onChange={(value) => setNewName(value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                    wrapperClassName={
                      newName.trim()
                        ? 'ring-2 ring-red-500 dark:ring-white'
                        : 'dark:ring-white/40'
                    }
                    inputClassName="dark:text-white dark:placeholder:text-white/50"
                  />
                  <div className="mt-4 flex justify-end gap-2">
                    <Button
                      size="sm"
                      color="tertiary"
                      onClick={() => setCreateOpen(false)}
                      className="dark:bg-transparent dark:text-white dark:hover:bg-white/10"
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      color="primary"
                      onClick={handleCreate}
                      isDisabled={!newName.trim()}
                      iconLeading={Plus}
                      className="dark:disabled:bg-transparent dark:disabled:text-white/50 dark:disabled:ring-1 dark:disabled:ring-white/30"
                    >
                      Create
                    </Button>
                  </div>
                </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {playlists.map((playlist) => {
          const thumbs = thumbnailsForPlaylist(playlist.videoIds)
          const isEditing = editingId === playlist.id
          const isDeleting = deleteConfirmId === playlist.id

          return (
            <div
              key={playlist.id}
              className="group relative overflow-hidden rounded-2xl border border-gray-100 bg-white transition-all duration-300 hover:border-gray-200 hover:shadow-sm dark:border-gray-800 dark:bg-gray-900 dark:hover:border-gray-700 animate-slide-up"
            >
              <Link to={`/playlist/${playlist.id}`} className="block">
                <div className="aspect-video overflow-hidden bg-gray-50 dark:bg-gray-800">
                  {thumbs.length > 0 ? (
                    thumbs.length === 1 ? (
                      <img
                        src={thumbs[0]}
                        alt=""
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                      />
                    ) : (
                      <div className="grid h-full grid-cols-2 grid-rows-2">
                        {thumbs.map((src, i) => (
                          <img key={i} src={src} alt="" className="h-full w-full object-cover" />
                        ))}
                      </div>
                    )
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <Folder className="size-12 text-gray-300 dark:text-gray-600" />
                    </div>
                  )}
                </div>
                <div className="p-4">
                  {isEditing ? (
                    <div className="flex items-center gap-2" onClick={(e) => e.preventDefault()}>
                      <Input
                        value={editName}
                        onChange={(value) => setEditName(value)}
                        className="flex-1"
                        onKeyDown={(e) => e.key === 'Enter' && saveEdit()}
                      />
                      <Button size="sm" onClick={saveEdit}>
                        Save
                      </Button>
                      <Button size="sm" color="tertiary" onClick={() => setEditingId(null)}>
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <h3 className="font-medium text-gray-800 transition-colors group-hover:text-gray-900 dark:text-gray-200 dark:group-hover:text-white">
                      {playlist.name}
                    </h3>
                  )}
                  <p className="mt-1 text-sm text-gray-400 dark:text-gray-500">
                    {playlist.videoIds.length} videos
                  </p>
                </div>
              </Link>
              {!isEditing && (
                <div className="absolute right-2 top-2 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                  <button
                    onClick={(e) => {
                      e.preventDefault()
                      startEdit(playlist.id, playlist.name)
                    }}
                    className="flex size-8 items-center justify-center rounded-lg bg-black/60 text-white backdrop-blur-sm hover:bg-black/80"
                    aria-label="Rename"
                  >
                    <Pencil01 className="size-4" />
                  </button>
                  {isDeleting ? (
                    <>
                      <button
                        onClick={(e) => {
                          e.preventDefault()
                          handleDelete(playlist.id)
                        }}
                        className="rounded-lg bg-red-600 px-2 py-1 text-xs font-medium text-white hover:bg-red-700"
                      >
                        Confirm
                      </button>
                      <button
                        onClick={(e) => {
                          e.preventDefault()
                          setDeleteConfirmId(null)
                        }}
                        className="rounded-lg bg-black/60 px-2 py-1 text-xs text-white hover:bg-black/80"
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={(e) => {
                        e.preventDefault()
                        setDeleteConfirmId(playlist.id)
                      }}
                      className="flex size-8 items-center justify-center rounded-lg bg-black/60 text-red-300 backdrop-blur-sm hover:bg-black/80"
                      aria-label="Delete"
                    >
                      <Trash01 className="size-4" />
                    </button>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
