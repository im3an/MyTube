/**
 * Cache key builders. Centralized so TTL and key shape stay consistent.
 */

import { createHash } from 'crypto'

export function videoKey(id: string): string {
  return `video:${id}`
}

export function channelKey(id: string): string {
  return `channel:${id}`
}

export function trendingKey(region: string): string {
  return `trending:${region}`
}

export function searchKey(query: string, region: string, page?: string): string {
  const payload = [query, region, page ?? ''].join(':')
  const hash = createHash('sha256').update(payload).digest('hex').slice(0, 16)
  return `search:${hash}`
}
