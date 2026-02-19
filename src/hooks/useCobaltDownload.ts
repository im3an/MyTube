import { useState, useCallback } from 'react'
import {
  requestDownload,
  triggerDownload,
  type CobaltResponse,
  type CobaltPickerItem,
} from '@/api/cobalt'

export function useCobaltDownload() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pickerItems, setPickerItems] = useState<CobaltPickerItem[] | null>(null)

  const download = useCallback(async (youtubeUrl: string) => {
    setLoading(true)
    setError(null)
    setPickerItems(null)

    try {
      const res = (await requestDownload(youtubeUrl)) as CobaltResponse

      if (res.status === 'tunnel' || res.status === 'redirect') {
        triggerDownload(res.url, res.filename)
      } else if (res.status === 'picker' && res.picker?.length) {
        setPickerItems(res.picker)
      } else if (res.status === 'error') {
        setError(res.error?.code ?? 'Download failed')
      } else if (res.status === 'local-processing') {
        setError('Local processing required — not supported in browser')
      } else {
        setError('Unexpected response')
      }
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }, [])

  const pickAndDownload = useCallback((url: string) => {
    triggerDownload(url)
    setPickerItems(null)
  }, [])

  const clearPicker = useCallback(() => setPickerItems(null), [])

  return { download, loading, error, pickerItems, pickAndDownload, clearPicker }
}
