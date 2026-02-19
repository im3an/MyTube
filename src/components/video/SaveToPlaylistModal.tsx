import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useUserData } from '@/hooks/useUserData'
import { Input } from '@/components/base/input/input'
import { Button } from '@/components/base/buttons/button'
import { Bookmark, Plus, X } from '@untitledui/icons'

interface SaveToPlaylistModalProps {
  videoId: string
  isOpen: boolean
  onClose: () => void
}

export function SaveToPlaylistModal({
  videoId,
  isOpen,
  onClose,
}: SaveToPlaylistModalProps) {
  const { playlists, addToPlaylist, toggleWatchLater, createPlaylist } = useUserData()
  const [newPlaylistName, setNewPlaylistName] = useState('')

  const handleAddToPlaylist = (playlistId: string) => {
    addToPlaylist(playlistId, videoId)
    onClose()
  }

  const handleWatchLater = () => {
    toggleWatchLater(videoId)
    onClose()
  }

  const handleCreatePlaylist = () => {
    if (newPlaylistName.trim()) {
      const id = createPlaylist(newPlaylistName.trim())
      addToPlaylist(id, videoId)
      setNewPlaylistName('')
      onClose()
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-50 bg-black/20 backdrop-blur-sm"
            onClick={onClose}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="w-full max-w-sm overflow-hidden rounded-2xl border border-gray-200/50 bg-white shadow-xl dark:border-gray-800/50 dark:bg-gray-900"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 dark:border-gray-800">
                <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                  Save to playlist
                </h2>
                <button
                  onClick={onClose}
                  className="flex size-7 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-50 hover:text-gray-600 dark:text-gray-500 dark:hover:bg-white/[0.04] dark:hover:text-gray-300"
                >
                  <X className="size-4" />
                </button>
              </div>

              {/* Options */}
              <div className="max-h-[40vh] overflow-y-auto p-1.5">
                <button
                  onClick={handleWatchLater}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors hover:bg-gray-50 dark:hover:bg-white/[0.04]"
                >
                  <Bookmark className="size-4 text-gray-400 dark:text-gray-500" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                    Watch later
                  </span>
                </button>

                {playlists.map((playlist) => (
                  <button
                    key={playlist.id}
                    onClick={() => handleAddToPlaylist(playlist.id)}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors hover:bg-gray-50 dark:hover:bg-white/[0.04]"
                  >
                    <div className="flex size-4 items-center justify-center">
                      <div className="size-1.5 rounded-full bg-gray-300 dark:bg-gray-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                        {playlist.name}
                      </span>
                      <span className="ml-2 text-xs text-gray-400 dark:text-gray-500">
                        {playlist.videoIds.length}
                      </span>
                    </div>
                  </button>
                ))}
              </div>

              {/* Create new */}
              <div className="border-t border-gray-100 p-4 dark:border-gray-800">
                <div className="flex gap-2">
                  <div className="min-w-0 flex-1">
                    <Input
                      placeholder="New playlist name"
                      value={newPlaylistName}
                      onChange={setNewPlaylistName}
                    />
                  </div>
                  <Button
                    onClick={handleCreatePlaylist}
                    isDisabled={!newPlaylistName.trim()}
                    color="primary"
                    size="md"
                    className="rounded-xl"
                    iconLeading={Plus}
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
  )
}
