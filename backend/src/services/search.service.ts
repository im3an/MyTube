/**
 * Search: optional L1 cache -> Piped. Returns videos + nextpage.
 */

import { getCachedSearch, setCachedSearch } from '../cache/memory.js'
import { search as pipedSearch } from './piped.service.js'
import { toVideoListItem, type VideoListItem } from '../utils/dto.js'

function extractChannelId(url: string): string {
  if (!url) return ''
  const channelMatch = url.match(/\/channel\/([^/?]+)/)
  if (channelMatch) return channelMatch[1]
  const handleMatch = url.match(/\/@([^/?]+)/)
  if (handleMatch) return `@${handleMatch[1]}`
  return url.replace(/^\/channel\//, '')
}

function extractVideoId(url: string): string {
  const m = url?.match(/[?&]v=([^&]+)/)
  return m?.[1] ?? ''
}

function pipedItemToListItem(s: Record<string, unknown>): VideoListItem {
  return {
    type: 'video',
    title: String(s.title ?? ''),
    videoId: extractVideoId(String(s.url ?? '')),
    author: String(s.uploaderName ?? ''),
    authorId: extractChannelId(String(s.uploaderUrl ?? '')),
    authorUrl: String(s.uploaderUrl ?? ''),
    videoThumbnails: [{ quality: 'medium', url: String(s.thumbnail ?? ''), width: 320, height: 180 }],
    viewCount: Number(s.views ?? 0),
    published: 0,
    publishedText: String(s.uploadedDate ?? ''),
    lengthSeconds: Number(s.duration ?? 0),
    authorThumbnails: s.uploaderAvatar ? [{ quality: 'default', url: String(s.uploaderAvatar), width: 48, height: 48 }] : undefined,
    authorVerified: Boolean(s.uploaderVerified),
  }
}

export async function searchVideos(
  q: string,
  region: string,
  nextpage?: string
): Promise<{ videos: VideoListItem[]; nextpage: string | null }> {
  const cacheKey = nextpage ?? 'first'
  const cached = getCachedSearch<{ videos: VideoListItem[]; nextpage: string | null }>(q, region, nextpage)
  if (cached) return cached

  const data = await pipedSearch(q, 'videos', nextpage)
  if (!data) return { videos: [], nextpage: null }
  const videos = (data.items as Record<string, unknown>[])
    .filter((i) => String(i.url ?? '').includes('/watch'))
    .map(pipedItemToListItem)
  const result = { videos, nextpage: data.nextpage ?? null }
  setCachedSearch(q, region, result, nextpage)
  return result
}
