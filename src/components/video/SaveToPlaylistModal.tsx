import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useUserData } from '@/hooks/useUserData'
import { Input } from '@/components/base/input/input'
import { Button } from '@/components/base/buttons/button'
import { Bookmark, Plus, X, Check, ChevronDown } from '@untitledui/icons'
import { cn } from '@/lib/utils'

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
  const { playlists, addToPlaylist, removeFromPlaylist, toggleWatchLater, watchLater, createPlaylist } = useUserData()
  const [newPlaylistName, setNewPlaylistName] = useState('')
  const [creatingNew, setCreatingNew] = useState(false)

  const isInWatchLater = watchLater.includes(videoId)

  const handleTogglePlaylist = (playlistId: string, isSaved: boolean) => {
    if (isSaved) {
      removeFromPlaylist(playlistId, videoId)
    } else {
      addToPlaylist(playlistId, videoId)
    }
  }

  const handleWatchLater = () => {
    toggleWatchLater(videoId)
  }

  const handleCreatePlaylist = () => {
    if (newPlaylistName.trim()) {
      const id = createPlaylist(newPlaylistName.trim())
      addToPlaylist(id, videoId)
      setNewPlaylistName('')
      setCreatingNew(false)
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
                {/* Watch Later */}
                <button
                  onClick={handleWatchLater}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors',
                    isInWatchLater
                      ? 'bg-brand-50 dark:bg-brand-950/20'
                      : 'hover:bg-gray-50 dark:hover:bg-white/[0.04]'
                  )}
                >
                  <div className={cn(
                    'flex size-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors',
                    isInWatchLater
                      ? 'border-brand-500 bg-brand-500 text-white dark:border-brand-400 dark:bg-brand-400'
                      : 'border-gray-200 dark:border-gray-700'
                  )}>
                    {isInWatchLater && <Check className="size-3" strokeWidth={3} />}
                  </div>
                  <Bookmark className={cn(
                    'size-4 shrink-0',
                    isInWatchLater ? 'text-brand-500 dark:text-brand-400' : 'text-gray-400 dark:text-gray-500'
                  )} />
                  <div className="min-w-0 flex-1">
                    <span className={cn(
                      'text-sm font-medium',
                      isInWatchLater ? 'text-brand-600 dark:text-brand-400' : 'text-gray-700 dark:text-gray-200'
                    )}>
                      Watch later
                    </span>
                  </div>
                </button>

                {/* Playlists */}
                {playlists.map((playlist) => {
                  const isSaved = playlist.videoIds.includes(videoId)
                  return (
                    <button
                      key={playlist.id}
                      onClick={() => handleTogglePlaylist(playlist.id, isSaved)}
                      className={cn(
                        'flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors',
                        isSaved
                          ? 'bg-brand-50 dark:bg-brand-950/20'
                          : 'hover:bg-gray-50 dark:hover:bg-white/[0.04]'
                      )}
                    >
                      <div className={cn(
                        'flex size-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors',
                        isSaved
                          ? 'border-brand-500 bg-brand-500 text-white dark:border-brand-400 dark:bg-brand-400'
                          : 'border-gray-200 dark:border-gray-700'
                      )}>
                        {isSaved && <Check className="size-3" strokeWidth={3} />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className={cn(
                          'text-sm font-medium',
                          isSaved ? 'text-brand-600 dark:text-brand-400' : 'text-gray-700 dark:text-gray-200'
                        )}>
                          {playlist.name}
                        </span>
                        <span className="ml-2 text-xs text-gray-400 dark:text-gray-500">
                          {playlist.videoIds.length} video{playlist.videoIds.length !== 1 ? 's' : ''}
                        </span>
                      </div>
                    </button>
                  )
                })}
              </div>

              {/* Create new section */}
              <div className="border-t border-gray-100 dark:border-gray-800">
                <AnimatePresence initial={false}>
                  {creatingNew ? (
                    <motion.div
                      key="form"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                      className="overflow-hidden"
                    >
                      <div className="flex gap-2 p-4">
                        <div className="min-w-0 flex-1">
                          <Input
                            placeholder="Playlist name"
                            value={newPlaylistName}
                            onChange={setNewPlaylistName}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleCreatePlaylist()
                              if (e.key === 'Escape') setCreatingNew(false)
                            }}
                            autoFocus
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
                        <Button
                          onClick={() => { setCreatingNew(false); setNewPlaylistName('') }}
                          color="tertiary"
                          size="md"
                          className="rounded-xl"
                        >
                          Cancel
                        </Button>
                      </div>
                    </motion.div>
                  ) : (
                    <motion.button
                      key="trigger"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      onClick={() => setCreatingNew(true)}
                      className="flex w-full items-center gap-2.5 px-5 py-3.5 text-sm font-medium text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-white/[0.04] dark:hover:text-gray-200"
                    >
                      <Plus className="size-4" />
                      New playlist
                      <ChevronDown className="ml-auto size-4 opacity-50" />
                    </motion.button>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  )
}
