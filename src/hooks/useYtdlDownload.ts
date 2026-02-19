import { useState, useCallback } from 'react'
import { requestYtdlDownload } from '@/api/ytdl'
import { triggerDownload } from '@/api/cobalt'
import type { DownloadFormat, DownloadQuality } from '@/api/ytdl'

const QUALITY_OPTIONS: Record<DownloadFormat, { value: DownloadQuality; label: string }[]> = {
  mp3: [
    { value: '128', label: '128 kbps' },
    { value: '192', label: '192 kbps' },
    { value: '320', label: '320 kbps' },
  ],
  wav: [{ value: 'lossless', label: 'Lossless' }],
  mp4: [
    { value: '720p', label: '720p' },
    { value: '1080p', label: '1080p' },
    { value: '4k', label: '4K' },
  ],
}

export function useYtdlDownload() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const download = useCallback(
    async (url: string, format: DownloadFormat, quality: DownloadQuality) => {
      setLoading(true)
      setError(null)

      try {
        const result = await requestYtdlDownload({ url, format, quality })

        if ('error' in result) {
          setError(result.error)
          return
        }

        triggerDownload(result.blobUrl, result.filename)
        URL.revokeObjectURL(result.blobUrl)
      } catch (e) {
        setError((e as Error).message)
      } finally {
        setLoading(false)
      }
    },
    []
  )

  const clearError = useCallback(() => setError(null), [])

  return {
    download,
    loading,
    error,
    clearError,
    qualityOptions: QUALITY_OPTIONS,
  }
}
