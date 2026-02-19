import { useEffect, useState, useCallback, useRef } from 'react'
import {
  searchVideos,
  searchVideosPage,
  searchChannels,
  getSearchSuggestions,
  getTrending,
  getVideoMeta,
  getVideoStreams,
  getCommentsPage,
  getChannel,
  getChannelNextPage,
  toAppVideo,
  type InvidiousVideoDetail,
  type InvidiousComment,
  type ChannelInfo,
  type SearchChannel,
} from '@/api/youtube'

export type AppVideo = ReturnType<typeof toAppVideo>

export function useSearch(query: string | null) {
  const [videos, setVideos] = useState<AppVideo[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!query || !query.trim()) {
      getTrending().then((data) => {
        setVideos(data.map(toAppVideo))
        setError(null)
      }).catch((e) => {
        setError(e.message)
        setVideos([])
      })
      return
    }
    setLoading(true)
    setError(null)
    searchVideos(query.trim())
      .then((data) => {
        setVideos(data.map(toAppVideo))
      })
      .catch((e) => {
        setError(e.message)
        setVideos([])
      })
      .finally(() => setLoading(false))
  }, [query])

  return { videos, loading, error }
}

/**
 * Video Watch Page only. Fetches full stream data via getVideoStreams.
 * NEVER use getVideoStreams elsewhere — it hits Piped /streams/ which is rate-limited.
 */
export function useVideo(videoId: string | undefined) {
  const [video, setVideo] = useState<InvidiousVideoDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const fetchedRef = useRef<string>('')

  useEffect(() => {
    if (!videoId) {
      setVideo(null)
      setLoading(false)
      return
    }
    // Strict Mode guard: skip if we already started a fetch for this videoId
    const currentId = videoId
    if (fetchedRef.current === currentId) return
    fetchedRef.current = currentId

    setLoading(true)
    setError(null)
    getVideoStreams(currentId)
      .then((v) => {
        if (fetchedRef.current === currentId) setVideo(v)
      })
      .catch((e) => {
        if (fetchedRef.current === currentId) {
          setError(e.message)
          setVideo(null)
        }
      })
      .finally(() => {
        if (fetchedRef.current === currentId) setLoading(false)
        fetchedRef.current = ''
      })

    return () => {
      // Don't reset here — Strict Mode runs cleanup between double-invocations.
      // Reset in finally so navigation to new videoId can fetch.
    }
  }, [videoId])

  return { video, loading, error }
}

/** Max IDs to fetch for metadata. Uses getVideoMeta (oEmbed) — never hits /streams. */
const VIDEOS_BY_IDS_LIMIT = 12
const VIDEOS_BY_IDS_CONCURRENCY = 3

async function fetchWithStagger<T>(
  items: string[],
  fn: (id: string) => Promise<T | null>
): Promise<(T | null)[]> {
  const results: (T | null)[] = new Array(items.length).fill(null)
  for (let i = 0; i < items.length; i += VIDEOS_BY_IDS_CONCURRENCY) {
    const batch = items.slice(i, i + VIDEOS_BY_IDS_CONCURRENCY)
    const batchResults = await Promise.all(batch.map((id) => fn(id)))
    batchResults.forEach((r, j) => {
      results[i + j] = r
    })
  }
  return results
}

export function useVideosByIds(ids: string[]) {
  const [videos, setVideos] = useState<AppVideo[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const limited = ids.slice(0, VIDEOS_BY_IDS_LIMIT)
    if (limited.length === 0) {
      setVideos([])
      setLoading(false)
      return
    }
    setLoading(true)
    fetchWithStagger(limited, getVideoMeta)
      .then((results) => {
        const map = new Map<string, AppVideo>()
        results.forEach((v, i) => {
          if (v && limited[i]) map.set(limited[i], toAppVideo(v))
        })
        return limited.map((id) => map.get(id)).filter((v): v is AppVideo => v != null)
      })
      .then(setVideos)
      .catch(() => setVideos([]))
      .finally(() => setLoading(false))
  }, [ids.join(',')])

  return { videos, loading }
}

export function useVideoComments(videoId: string | undefined, isLivestream = false) {
  const [comments, setComments] = useState<InvidiousComment[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const nextpageRef = useRef<string | null>(null)
  const videoIdRef = useRef(videoId)
  const seenIdsRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    videoIdRef.current = videoId
    nextpageRef.current = null
    seenIdsRef.current = new Set()

    if (!videoId) {
      setComments([])
      return
    }
    setLoading(true)
    getCommentsPage(videoId)
      .then(({ comments: c, nextpage }) => {
        if (videoIdRef.current !== videoId) return
        setComments(c)
        nextpageRef.current = nextpage
        c.forEach((co) => {
          if (co.commentId) seenIdsRef.current.add(co.commentId)
        })
      })
      .catch(() => setComments([]))
      .finally(() => setLoading(false))
  }, [videoId])

  useEffect(() => {
    if (!isLivestream || !videoId) return
    const interval = setInterval(() => {
      getCommentsPage(videoId).then(({ comments: c }) => {
        if (videoIdRef.current !== videoId) return
        const seen = seenIdsRef.current
        const newComments = c.filter((co) => co.commentId && !seen.has(co.commentId))
        if (newComments.length > 0) {
          newComments.forEach((co) => co.commentId && seen.add(co.commentId))
          setComments((prev) => [...newComments, ...prev])
        }
      }).catch(() => {})
    }, 30000)
    return () => clearInterval(interval)
  }, [videoId, isLivestream])

  const loadMore = useCallback(() => {
    const vid = videoIdRef.current
    const np = nextpageRef.current
    if (!vid || !np || loadingMore) return

    setLoadingMore(true)
    getCommentsPage(vid, np)
      .then(({ comments: c, nextpage }) => {
        if (videoIdRef.current !== vid) return
        setComments((prev) => [...prev, ...c])
        nextpageRef.current = nextpage
      })
      .catch(() => {})
      .finally(() => setLoadingMore(false))
  }, [loadingMore])

  return { comments, loading, loadingMore, hasMore: !!nextpageRef.current, loadMore }
}

/** Channel profiles from search — fetches when query changes. */
export function useSearchChannels(
  query: string | null,
  region?: string,
): { channels: SearchChannel[]; loading: boolean } {
  const [channels, setChannels] = useState<SearchChannel[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!query?.trim()) {
      setChannels([])
      setLoading(false)
      return
    }
    setLoading(true)
    searchChannels(query.trim(), region)
      .then(setChannels)
      .catch(() => setChannels([]))
      .finally(() => setLoading(false))
  }, [query, region])

  return { channels, loading }
}

/** Debounced search suggestions from Piped. */
export function useSearchSuggestions(query: string) {
  const [suggestions, setSuggestions] = useState<string[]>([])

  useEffect(() => {
    if (!query.trim()) {
      setSuggestions([])
      return
    }
    const timer = setTimeout(() => {
      getSearchSuggestions(query.trim())
        .then(setSuggestions)
        .catch(() => setSuggestions([]))
    }, 200)
    return () => clearTimeout(timer)
  }, [query])

  return suggestions
}

/** Infinite-scroll search: fetches pages on demand via `loadMore`. */
export function useInfiniteSearch(query: string | null, region?: string) {
  const [videos, setVideos] = useState<AppVideo[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const nextpageRef = useRef<string | null>(null)
  const queryRef = useRef(query)
  const regionRef = useRef(region)
  regionRef.current = region

  // Reset & fetch first page when query changes
  useEffect(() => {
    queryRef.current = query
    nextpageRef.current = null

    if (!query?.trim()) {
      setVideos([])
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)
    searchVideosPage(query.trim(), undefined, region)
      .then(({ videos: vids, nextpage }) => {
        if (queryRef.current !== query) return // stale
        setVideos(vids.map(toAppVideo))
        nextpageRef.current = nextpage
      })
      .catch((e) => {
        if (queryRef.current !== query) return
        setError(e.message)
        setVideos([])
      })
      .finally(() => setLoading(false))
  }, [query, region])

  const loadMore = useCallback(() => {
    const q = queryRef.current
    const np = nextpageRef.current
    if (!q?.trim() || !np || loadingMore) return

    setLoadingMore(true)
    searchVideosPage(q.trim(), np, regionRef.current)
      .then(({ videos: vids, nextpage }) => {
        if (queryRef.current !== q) return // stale
        setVideos((prev) => [...prev, ...vids.map(toAppVideo)])
        nextpageRef.current = nextpage
      })
      .catch(() => {})
      .finally(() => setLoadingMore(false))
  }, [loadingMore])

  return {
    videos,
    loading,
    loadingMore,
    hasMore: !!nextpageRef.current,
    loadMore,
    error,
  }
}

/**
 * Home page hook: "All" shows trending first, then seamlessly continues
 * with infinite-scroll search results. Other categories go straight to
 * infinite-scroll search.
 */
export function useHomeFeed(categoryQuery: string | null, region = 'US') {
  const [videos, setVideos] = useState<AppVideo[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const nextpageRef = useRef<string | null>(null)
  const queryRef = useRef(categoryQuery)
  const regionRef = useRef(region)
  regionRef.current = region
  /** Tracks whether the "All" tab has exhausted trending and switched to search. */
  const trendingExhaustedRef = useRef(false)

  // ─── Reset & fetch first page when category changes ───
  useEffect(() => {
    queryRef.current = categoryQuery
    nextpageRef.current = null
    trendingExhaustedRef.current = false

    setLoading(true)
    setError(null)

    if (categoryQuery === null) {
      // "All" → start with trending
      getTrending(region)
        .then((data) => {
          if (queryRef.current !== categoryQuery) return
          setVideos(data.map(toAppVideo))
          // Immediately mark "has more" so infinite scroll kicks in
          trendingExhaustedRef.current = false
        })
        .catch((e) => {
          if (queryRef.current !== categoryQuery) return
          setError(e.message)
          setVideos([])
        })
        .finally(() => setLoading(false))
    } else {
      // Category → search with first page (region adds language keyword for localized results)
      searchVideosPage(categoryQuery, undefined, region)
        .then(({ videos: vids, nextpage }) => {
          if (queryRef.current !== categoryQuery) return
          setVideos(vids.map(toAppVideo))
          nextpageRef.current = nextpage
        })
        .catch((e) => {
          if (queryRef.current !== categoryQuery) return
          setError(e.message)
          setVideos([])
        })
        .finally(() => setLoading(false))
    }
  }, [categoryQuery, region])

  // ─── Load more ───
  const loadMore = useCallback(() => {
    const cq = queryRef.current
    if (loadingMore) return

    // "All" tab: first time loadMore is called, start a broad search
    if (cq === null && !trendingExhaustedRef.current) {
      trendingExhaustedRef.current = true
      setLoadingMore(true)
      searchVideosPage('popular trending new', undefined, regionRef.current)
        .then(({ videos: vids, nextpage }) => {
          if (queryRef.current !== cq) return
          // Deduplicate against existing trending videos
          const existingIds = new Set(videos.map((v) => v.id))
          const newVids = vids.map(toAppVideo).filter((v) => !existingIds.has(v.id))
          setVideos((prev) => [...prev, ...newVids])
          nextpageRef.current = nextpage
        })
        .catch(() => {})
        .finally(() => setLoadingMore(false))
      return
    }

    // Paginated search (both "All" continuation and category pages)
    const np = nextpageRef.current
    if (!np) return

    const searchQ = cq === null ? 'popular trending new' : cq
    setLoadingMore(true)
    searchVideosPage(searchQ, np, regionRef.current)
      .then(({ videos: vids, nextpage }) => {
        if (queryRef.current !== cq) return
        setVideos((prev) => [...prev, ...vids.map(toAppVideo)])
        nextpageRef.current = nextpage
      })
      .catch(() => {})
      .finally(() => setLoadingMore(false))
  }, [loadingMore, videos])

  const hasMore =
    categoryQuery === null
      ? !trendingExhaustedRef.current || !!nextpageRef.current
      : !!nextpageRef.current

  return { videos, loading, loadingMore, hasMore, loadMore, error }
}

/**
 * Channel page hook — fetches channel info + paginated videos (infinite scroll).
 */
export function useChannel(channelId: string | undefined) {
  const [channel, setChannel] = useState<ChannelInfo | null>(null)
  const [videos, setVideos] = useState<AppVideo[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const nextpageRef = useRef<string | null>(null)
  const channelIdRef = useRef(channelId)

  useEffect(() => {
    channelIdRef.current = channelId
    nextpageRef.current = null

    if (!channelId) {
      setChannel(null)
      setVideos([])
      setLoading(false)
      return
    }

    // Clear previous channel data immediately so we never show stale content
    setChannel(null)
    setVideos([])
    setLoading(true)
    setError(null)
    getChannel(channelId)
      .then((data) => {
        if (channelIdRef.current !== channelId) return
        if (!data) {
          setError('Channel not found')
          return
        }
        setChannel(data)
        setVideos(data.videos.map(toAppVideo))
        nextpageRef.current = data.nextpage
      })
      .catch((e) => {
        if (channelIdRef.current !== channelId) return
        setError(e.message)
      })
      .finally(() => setLoading(false))
  }, [channelId])

  const loadMore = useCallback(() => {
    const cid = channelIdRef.current
    const np = nextpageRef.current
    if (!cid || !np || loadingMore) return

    setLoadingMore(true)
    getChannelNextPage(cid, np)
      .then(({ videos: vids, nextpage }) => {
        if (channelIdRef.current !== cid) return
        setVideos((prev) => [...prev, ...vids.map(toAppVideo)])
        nextpageRef.current = nextpage
      })
      .catch(() => {})
      .finally(() => setLoadingMore(false))
  }, [loadingMore])

  return {
    channel,
    videos,
    loading,
    loadingMore,
    hasMore: !!nextpageRef.current,
    loadMore,
    error,
  }
}
