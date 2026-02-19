/**
 * Channel business logic: cache -> DB -> Piped.
 */

import * as channelQueries from '../db/queries/channels.js'
import * as videoQueries from '../db/queries/videos.js'
import { getCachedChannel, setCachedChannel } from '../cache/memory.js'
import { getChannel as pipedGetChannel } from './piped.service.js'
import { toVideoListItem, type ChannelDto, type VideoListItem } from '../utils/dto.js'
import { NotFoundError } from '../utils/errors.js'

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

/** Get channel by ID: L1 cache -> DB -> Piped. */
export async function getChannelById(id: string): Promise<ChannelDto> {
  const cached = getCachedChannel<ChannelDto>(id)
  if (cached) return cached

  const row = await channelQueries.getChannelById(id)
  if (row) {
    const videos: VideoListItem[] = []
    const dto: ChannelDto = {
      id: row.id,
      name: row.name,
      avatarUrl: row.avatar_url ?? '',
      bannerUrl: row.banner_url ?? '',
      description: '',
      subscriberCount: Number(row.subscriber_count),
      verified: row.verified,
      videos,
      nextpage: null,
    }
    setCachedChannel(id, dto)
    return dto
  }

  const piped = await pipedGetChannel(id)
  if (!piped) throw new NotFoundError('Channel not found')

  const d = piped as Record<string, unknown>
  const relatedStreams = (d.relatedStreams as Array<Record<string, unknown>>) ?? []
  const videos = relatedStreams
    .filter((s) => String(s.url ?? '').includes('/watch'))
    .map(pipedItemToListItem)

  const dto: ChannelDto = {
    id: String(d.id ?? id),
    name: String(d.name ?? ''),
    avatarUrl: String(d.avatarUrl ?? d.avatar_url ?? ''),
    bannerUrl: String(d.bannerUrl ?? d.banner_url ?? ''),
    description: String(d.description ?? ''),
    subscriberCount: Number(d.subscriberCount ?? d.subscriber_count ?? 0),
    verified: Boolean(d.verified),
    videos,
    nextpage: (d.nextpage as string) ?? null,
  }
  setCachedChannel(id, dto)
  return dto
}
