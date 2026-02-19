/**
 * Trending: L1 cache -> Piped.
 */

import { getCachedTrending, setCachedTrending } from '../cache/memory.js'
import { getTrending as pipedGetTrending } from './piped.service.js'
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

export async function getTrending(region: string): Promise<VideoListItem[]> {
  const cached = getCachedTrending<VideoListItem[]>(region)
  if (cached) return cached

  const items = await pipedGetTrending(region)
  if (!items) return []
  const list = (items as Record<string, unknown>[]).map(pipedItemToListItem)
  setCachedTrending(region, list)
  return list
}
