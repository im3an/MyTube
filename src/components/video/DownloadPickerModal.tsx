import { X } from '@untitledui/icons'
import { motion, AnimatePresence } from 'framer-motion'
import type { CobaltPickerItem } from '@/api/cobalt'

interface DownloadPickerModalProps {
  isOpen: boolean
  items: CobaltPickerItem[]
  onPick: (url: string) => void
  onClose: () => void
}

export function DownloadPickerModal({
  isOpen,
  items,
  onPick,
  onClose,
}: DownloadPickerModalProps) {
  if (!isOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          onClick={(e) => e.stopPropagation()}
          className="max-h-[80vh] w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-xl dark:bg-gray-900"
        >
          <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-gray-700">
            <h3 className="font-semibold text-gray-900 dark:text-white">
              Choose format
            </h3>
            <button
              onClick={onClose}
              className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800 dark:hover:text-gray-300"
              aria-label="Close"
            >
              <X className="size-5" />
            </button>
          </div>
          <div className="max-h-[60vh] overflow-y-auto p-4">
            <div className="space-y-2">
              {items.map((item, i) => (
                <button
                  key={`${item.type}-${i}`}
                  onClick={() => onPick(item.url)}
                  className="flex w-full items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 p-3 text-left transition-colors hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800/50 dark:hover:bg-gray-800"
                >
                  {item.thumb && (
                    <img
                      src={item.thumb}
                      alt=""
                      className="size-16 shrink-0 rounded-lg object-cover"
                    />
                  )}
                  <span className="font-medium capitalize text-gray-900 dark:text-white">
                    {item.type}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
