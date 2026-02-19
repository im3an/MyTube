import { useState } from 'react'
import { Download01 } from '@untitledui/icons'
import { motion } from 'framer-motion'
import { Button } from '@/components/base/buttons/button'
import { DownloadModal } from '@/components/video/DownloadModal'
import { PageHeader } from '@/components/ui/PageHeader'

export function DownloadPage() {
  const [modalOpen, setModalOpen] = useState(false)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Download"
        description="Download YouTube videos as MP3, WAV, or MP4. Choose your format and quality."
        actions={
          <Button
            size="md"
            color="primary"
            className="rounded-xl"
            iconLeading={Download01}
            onClick={() => setModalOpen(true)}
          >
            New download
          </Button>
        }
      />

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-gray-200/50 bg-white p-8 dark:border-gray-800/50 dark:bg-gray-900"
      >
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="flex size-16 items-center justify-center rounded-2xl bg-red-50 dark:bg-red-950/30">
            <Download01 className="size-8 text-red-500" />
          </div>
          <h3 className="mt-4 text-lg font-semibold text-gray-900 dark:text-white">
            Download YouTube videos
          </h3>
          <p className="mt-2 max-w-sm text-sm text-gray-500 dark:text-gray-400">
            Paste a YouTube URL, choose format (MP3, WAV, or MP4) and quality, then download.
          </p>
          <Button
            size="md"
            color="primary"
            className="mt-6 rounded-xl"
            iconLeading={Download01}
            onClick={() => setModalOpen(true)}
          >
            Start download
          </Button>
        </div>
      </motion.div>

      <DownloadModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        initialUrl=""
      />
    </div>
  )
}
