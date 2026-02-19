import { useState, useEffect } from 'react'
import { X, Download01 } from '@untitledui/icons'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/base/buttons/button'
import { Input } from '@/components/base/input/input'
import { useYtdlDownload } from '@/hooks/useYtdlDownload'
import type { DownloadFormat, DownloadQuality } from '@/api/ytdl'

const FORMATS: { value: DownloadFormat; label: string }[] = [
  { value: 'mp3', label: 'MP3' },
  { value: 'wav', label: 'WAV' },
  { value: 'mp4', label: 'MP4' },
]

function extractYoutubeUrl(input: string): string | null {
  const trimmed = input.trim()
  if (!trimmed) return null
  // Support watch URLs, shorts, embed
  const patterns = [
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?v=([\w-]+)/,
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/shorts\/([\w-]+)/,
    /(?:https?:\/\/)?(?:www\.)?youtu\.be\/([\w-]+)/,
  ]
  for (const p of patterns) {
    const m = trimmed.match(p)
    if (m) return m[0].startsWith('http') ? m[0] : `https://${m[0]}`
  }
  return null
}

interface DownloadModalProps {
  isOpen: boolean
  onClose: () => void
  /** Pre-fill URL when opened from watch page */
  initialUrl?: string
}

export function DownloadModal({
  isOpen,
  onClose,
  initialUrl = '',
}: DownloadModalProps) {
  const [urlInput, setUrlInput] = useState(initialUrl)
  const [format, setFormat] = useState<DownloadFormat>('mp3')
  const [quality, setQuality] = useState<DownloadQuality>('320')

  useEffect(() => {
    if (isOpen) setUrlInput(initialUrl)
  }, [isOpen, initialUrl])

  const { download, loading, error, clearError, qualityOptions } = useYtdlDownload()

  const currentQualities = qualityOptions[format]
  const effectiveQuality = currentQualities.some((q) => q.value === quality)
    ? quality
    : currentQualities[0].value

  const handleDownload = () => {
    const url = extractYoutubeUrl(urlInput)
    if (!url) {
      clearError()
      return
    }
    download(url, format, effectiveQuality)
  }

  const youtubeUrl = extractYoutubeUrl(urlInput)
  const canDownload = !!youtubeUrl && !loading

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.96 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-md overflow-hidden rounded-2xl border border-gray-200/50 bg-white shadow-xl dark:border-gray-800/50 dark:bg-gray-900"
        >
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 dark:border-gray-800">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">
              Download video
            </h2>
            <button
              onClick={onClose}
              className="flex size-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-white"
              aria-label="Close"
            >
              <X className="size-5" />
            </button>
          </div>

          <div className="space-y-5 p-5">
            {/* URL input */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                YouTube URL
              </label>
              <Input
                placeholder="https://www.youtube.com/watch?v=..."
                value={urlInput}
                onChange={(v) => {
                  setUrlInput(v)
                  clearError()
                }}
                inputClassName="font-mono text-sm"
              />
            </div>

            {/* Format */}
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Format
              </label>
              <div className="flex gap-3">
                {FORMATS.map((f) => (
                  <label
                    key={f.value}
                    className="flex cursor-pointer items-center gap-2 rounded-xl border border-gray-200 px-4 py-2.5 transition-colors has-[:checked]:border-red-500 has-[:checked]:bg-red-50 has-[:checked]:ring-1 has-[:checked]:ring-red-500 dark:border-gray-700 dark:has-[:checked]:border-red-500 dark:has-[:checked]:bg-red-950/30 dark:has-[:checked]:ring-red-500"
                  >
                    <input
                      type="radio"
                      name="format"
                      value={f.value}
                      checked={format === f.value}
                      onChange={() => {
                        setFormat(f.value)
                        setQuality(currentQualities[0].value)
                      }}
                      className="size-4 border-gray-300 text-red-500 focus:ring-red-500"
                    />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {f.label}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Quality */}
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Quality
              </label>
              <div className="flex flex-wrap gap-2">
                {currentQualities.map((q) => (
                  <label
                    key={q.value}
                    className="flex cursor-pointer items-center gap-2 rounded-xl border border-gray-200 px-4 py-2.5 transition-colors has-[:checked]:border-red-500 has-[:checked]:bg-red-50 has-[:checked]:ring-1 has-[:checked]:ring-red-500 dark:border-gray-700 dark:has-[:checked]:border-red-500 dark:has-[:checked]:bg-red-950/30 dark:has-[:checked]:ring-red-500"
                  >
                    <input
                      type="radio"
                      name="quality"
                      value={q.value}
                      checked={effectiveQuality === q.value}
                      onChange={() => setQuality(q.value)}
                      className="size-4 border-gray-300 text-red-500 focus:ring-red-500"
                    />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {q.label}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {error && (
              <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600 dark:bg-red-950/40 dark:text-red-400">
                {error}
              </div>
            )}

            <Button
              onClick={handleDownload}
              disabled={!canDownload}
              isLoading={loading}
              color="primary"
              size="md"
              className="w-full rounded-xl"
              iconLeading={Download01}
            >
              {loading ? 'Downloading…' : 'Download'}
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
