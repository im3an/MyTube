import { useEffect, useState } from 'react'
import { fetchStreamUrl } from '@/api/cobalt'

/**
 * Fetches a direct stream URL from Cobalt when the primary source (Piped) doesn't provide one.
 * Used to always use the custom player instead of the YouTube embed.
 */
export function useCobaltStreamUrl(
  videoId: string | undefined,
  primaryStreamUrl: string | null | undefined
): { streamUrl: string | null; loading: boolean; error: string | null } {
  const [streamUrl, setStreamUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const needsFallback = !primaryStreamUrl && !!videoId && /^[a-zA-Z0-9_-]{11}$/.test(videoId)

  useEffect(() => {
    if (!needsFallback) {
      setStreamUrl(null)
      setLoading(false)
      setError(null)
      return
    }

    let cancelled = false
    setLoading(true)
    setError(null)

    const youtubeUrl = `https://www.youtube.com/watch?v=${videoId}`

    fetchStreamUrl(youtubeUrl)
      .then((url) => {
        if (cancelled) return
        setStreamUrl(url)
        setError(url ? null : 'Could not load stream')
      })
      .catch((e) => {
        if (cancelled) return
        setStreamUrl(null)
        setError((e as Error).message)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [videoId, needsFallback])

  const effectiveStreamUrl = primaryStreamUrl ?? streamUrl

  return {
    streamUrl: effectiveStreamUrl || null,
    loading: needsFallback && loading,
    error: needsFallback && !loading && !effectiveStreamUrl ? error : null,
  }
}
