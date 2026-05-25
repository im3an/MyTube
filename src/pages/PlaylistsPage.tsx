import { useState, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useUserData } from '@/hooks/useUserData'
import { getFallbackThumbnail } from '@/api/youtube'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button } from '@/components/base/buttons/button'
import { Input } from '@/components/base/input/input'
import { Folder, Plus, Pencil01, Trash01, X, DotsVertical } from '@untitledui/icons'
import { motion, AnimatePresence } from 'framer-motion'
import { formatRelativeTime } from '@/lib/utils'

type SortOption = 'recent' | 'az' | 'count'

export function PlaylistsPage() {
  const navigate = useNavigate()
  const { playlists, createPlaylist, updatePlaylist, deletePlaylist } = useUserData()
  const [createOpen, setCreateOpen] = useState(false)
  const [newName, setNewName] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null)
  const [sort, setSort] = useState<SortOption>('recent')

  const handleCreate = () => {
    if (newName.trim()) {
      const id = createPlaylist(newName.trim(), newDescription.trim())
      setNewName('')
      setNewDescription('')
      setCreateOpen(false)
      navigate(`/playlist/${id}`)
    }
  }

  const startEdit = (id: string, name: string) => {
    setEditingId(id)
    setEditName(name)
    setMenuOpenId(null)
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
    setMenuOpenId(null)
  }

  const sortedPlaylists = useMemo(() => {
    const list = [...playlists]
    if (sort === 'az') return list.sort((a, b) => a.name.localeCompare(b.name))
    if (sort === 'count') return list.sort((a, b) => b.videoIds.length - a.videoIds.length)
    return list.reverse()
  }, [playlists, sort])

  const thumbnailsForPlaylist = (videoIds: string[]) =>
    videoIds.slice(0, 4).map((id) => getFallbackThumbnail(id))

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
          Create your first playlist to organize your favorite videos.
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

        <AnimatePresence>
          {createOpen && <CreatePlaylistModal
            name={newName}
            description={newDescription}
            onNameChange={setNewName}
            onDescriptionChange={setNewDescription}
            onConfirm={handleCreate}
            onClose={() => { setCreateOpen(false); setNewName(''); setNewDescription('') }}
          />}
        </AnimatePresence>
      </div>
    )
  }

  return (
    <div className="space-y-6" onClick={() => setMenuOpenId(null)}>
      <PageHeader
        title="Your playlists"
        description="Create and manage your video playlists"
        actions={
          <div className="flex items-center gap-3">
            <SortSelector value={sort} onChange={setSort} />
            <Button
              size="sm"
              color="primary"
              className="rounded-xl"
              iconLeading={Plus}
              onClick={(e: React.MouseEvent) => { e.stopPropagation(); setCreateOpen(true) }}
            >
              New playlist
            </Button>
          </div>
        }
      />

      <AnimatePresence>
        {createOpen && <CreatePlaylistModal
          name={newName}
          description={newDescription}
          onNameChange={setNewName}
          onDescriptionChange={setNewDescription}
          onConfirm={handleCreate}
          onClose={() => { setCreateOpen(false); setNewName(''); setNewDescription('') }}
        />}
      </AnimatePresence>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {sortedPlaylists.map((playlist, idx) => {
          const thumbs = thumbnailsForPlaylist(playlist.videoIds)
          const isEditing = editingId === playlist.id
          const isDeleting = deleteConfirmId === playlist.id
          const menuOpen = menuOpenId === playlist.id

          return (
            <motion.div
              key={playlist.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: idx * 0.04 }}
              className="group relative overflow-hidden rounded-2xl border border-gray-100 bg-white transition-all duration-300 hover:border-gray-200 hover:shadow-md dark:border-gray-800 dark:bg-gray-900 dark:hover:border-gray-700"
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
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
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
                      <Button size="sm" onClick={saveEdit}>Save</Button>
                      <Button size="sm" color="tertiary" onClick={() => setEditingId(null)}>Cancel</Button>
                    </div>
                  ) : (
                    <h3 className="font-semibold text-gray-900 transition-colors group-hover:text-brand-600 dark:text-gray-100 dark:group-hover:text-white line-clamp-1">
                      {playlist.name}
                    </h3>
                  )}
                  <div className="mt-1.5 flex items-center gap-2 text-sm text-gray-400 dark:text-gray-500">
                    <span>{playlist.videoIds.length} video{playlist.videoIds.length !== 1 ? 's' : ''}</span>
                    {playlist.createdAt && (
                      <>
                        <span>·</span>
                        <span>{formatRelativeTime(new Date(playlist.createdAt).getTime())}</span>
                      </>
                    )}
                  </div>
                </div>
              </Link>

              {!isEditing && (
                <div className="absolute right-2 top-2">
                  <button
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      setMenuOpenId(menuOpen ? null : playlist.id)
                    }}
                    className="flex size-8 items-center justify-center rounded-lg bg-black/60 text-white opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100 hover:bg-black/80"
                    aria-label="Options"
                  >
                    <DotsVertical className="size-4" />
                  </button>

                  <AnimatePresence>
                    {menuOpen && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: -4 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: -4 }}
                        transition={{ duration: 0.15 }}
                        className="absolute right-0 top-9 z-20 min-w-[140px] overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-900"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          onClick={(e) => {
                            e.preventDefault()
                            startEdit(playlist.id, playlist.name)
                          }}
                          className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-800"
                        >
                          <Pencil01 className="size-3.5" />
                          Rename
                        </button>
                        {isDeleting ? (
                          <div className="border-t border-gray-100 p-2 dark:border-gray-800">
                            <p className="mb-2 px-2 text-xs text-gray-500 dark:text-gray-400">Delete permanently?</p>
                            <div className="flex gap-1.5">
                              <button
                                onClick={(e) => { e.preventDefault(); handleDelete(playlist.id) }}
                                className="flex-1 rounded-lg bg-red-600 px-2 py-1.5 text-xs font-medium text-white hover:bg-red-700"
                              >
                                Delete
                              </button>
                              <button
                                onClick={(e) => { e.preventDefault(); setDeleteConfirmId(null) }}
                                className="flex-1 rounded-lg bg-gray-100 px-2 py-1.5 text-xs text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            onClick={(e) => {
                              e.preventDefault()
                              setDeleteConfirmId(playlist.id)
                            }}
                            className="flex w-full items-center gap-2.5 border-t border-gray-100 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 dark:border-gray-800 dark:text-red-400 dark:hover:bg-red-950/30"
                          >
                            <Trash01 className="size-3.5" />
                            Delete
                          </button>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}

interface SortSelectorProps {
  value: SortOption
  onChange: (v: SortOption) => void
}

function SortSelector({ value, onChange }: SortSelectorProps) {
  const options: { value: SortOption; label: string }[] = [
    { value: 'recent', label: 'Recently updated' },
    { value: 'az', label: 'A–Z' },
    { value: 'count', label: 'Video count' },
  ]
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as SortOption)}
      className="rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  )
}

interface CreatePlaylistModalProps {
  name: string
  description: string
  onNameChange: (v: string) => void
  onDescriptionChange: (v: string) => void
  onConfirm: () => void
  onClose: () => void
}

function CreatePlaylistModal({
  name,
  description,
  onNameChange,
  onDescriptionChange,
  onConfirm,
  onClose,
}: CreatePlaylistModalProps) {
  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 8 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-sm overflow-hidden rounded-2xl border border-gray-200/50 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-900"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 dark:border-gray-800">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">New playlist</h2>
            <button
              onClick={onClose}
              className="flex size-7 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-50 hover:text-gray-600 dark:text-gray-500 dark:hover:bg-white/[0.06] dark:hover:text-gray-300"
            >
              <X className="size-4" />
            </button>
          </div>
          <div className="space-y-4 p-5">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-500 dark:text-gray-400">
                Name <span className="text-red-500">*</span>
              </label>
              <Input
                placeholder="My playlist"
                value={name}
                onChange={onNameChange}
                onKeyDown={(e) => e.key === 'Enter' && onConfirm()}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-500 dark:text-gray-400">
                Description <span className="text-gray-400">(optional)</span>
              </label>
              <Input
                placeholder="What's this playlist about?"
                value={description}
                onChange={onDescriptionChange}
              />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button size="sm" color="tertiary" onClick={onClose}>Cancel</Button>
              <Button
                size="sm"
                color="primary"
                onClick={onConfirm}
                isDisabled={!name.trim()}
                iconLeading={Plus}
              >
                Create
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    </>
  )
}
