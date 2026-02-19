/**
 * Share modal: copy link, optional timestamp.
 */

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/base/buttons/button'
import { Share01, Copy01 } from '@untitledui/icons'

interface ShareModalProps {
  isOpen: boolean
  onClose: () => void
  videoId?: string
  title?: string
  currentTime?: number
}

export function ShareModal({
  isOpen,
  onClose,
  videoId,
  title = '',
  currentTime = 0,
}: ShareModalProps) {
  const [copied, setCopied] = useState(false)
  const [withTimestamp, setWithTimestamp] = useState(false)

  const baseUrl = typeof window !== 'undefined' ? `${window.location.origin}/watch/${videoId ?? ''}` : ''
  const timeParam = withTimestamp && currentTime > 0 ? `?t=${Math.floor(currentTime)}` : ''
  const shareUrl = baseUrl + timeParam

  useEffect(() => {
    if (!isOpen) setCopied(false)
  }, [isOpen])

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      window.open(shareUrl, '_blank')
    }
  }

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title,
          url: shareUrl,
          text: title,
        })
        onClose()
      } catch (err) {
        if ((err as Error).name !== 'AbortError') handleCopy()
      }
    } else {
      handleCopy()
    }
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.96 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-md overflow-hidden rounded-2xl border border-gray-200/50 bg-white shadow-xl dark:border-gray-800/50 dark:bg-gray-900"
        >
          <div className="flex items-center justify-between border-b border-gray-200/50 px-5 py-4 dark:border-gray-800/50">
            <h2 className="flex items-center gap-2 text-base font-semibold text-gray-900 dark:text-white">
              <Share01 className="size-5 text-gray-500" />
              Share
            </h2>
            <button
              onClick={onClose}
              className="flex size-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-white"
              aria-label="Close"
            >
              ×
            </button>
          </div>

          <div className="space-y-4 p-5">
            <div>
              <input
                type="text"
                readOnly
                value={shareUrl}
                className="w-full rounded-xl border border-gray-200/60 bg-gray-50 py-2.5 px-4 text-sm text-gray-900 dark:border-gray-700/60 dark:bg-gray-800/50 dark:text-white"
              />
            </div>

            {videoId && currentTime > 0 && (
              <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <input
                  type="checkbox"
                  checked={withTimestamp}
                  onChange={(e) => setWithTimestamp(e.target.checked)}
                  className="rounded border-gray-300"
                />
                Include timestamp ({Math.floor(currentTime / 60)}:{String(Math.floor(currentTime % 60)).padStart(2, '0')})
              </label>
            )}

            <div className="flex gap-2">
              <Button
                onClick={handleCopy}
                color="primary"
                size="md"
                className="flex-1 rounded-xl"
                iconLeading={Copy01}
              >
                {copied ? 'Copied!' : 'Copy link'}
              </Button>
              {typeof navigator.share === 'function' && (
                <Button
                  onClick={handleShare}
                  color="tertiary"
                  size="md"
                  className="rounded-xl"
                  iconLeading={Share01}
                >
                  Share…
                </Button>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
