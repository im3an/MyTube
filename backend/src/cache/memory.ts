/**
 * In-memory cache (node-cache). Swap to Redis later without touching services.
 */

import NodeCache from 'node-cache'
import { config } from '../config.js'
import * as keys from './keys.js'

const cache = new NodeCache({
  stdTTL: config.cache.videoTtl,
  useClones: false,
  checkperiod: 60,
})

export const memoryCache = {
  get<T>(key: string): T | undefined {
    return cache.get<T>(key)
  },

  set<T>(key: string, value: T, ttlSeconds?: number): void {
    cache.set(key, value, ttlSeconds ?? config.cache.videoTtl)
  },

  del(key: string): void {
    cache.del(key)
  },
}

/** Get video; TTL from config. */
export function getCachedVideo<T>(id: string): T | undefined {
  return memoryCache.get<T>(keys.videoKey(id))
}

export function setCachedVideo<T>(id: string, value: T): void {
  memoryCache.set(keys.videoKey(id), value, config.cache.videoTtl)
}

export function getCachedChannel<T>(id: string): T | undefined {
  return memoryCache.get<T>(keys.channelKey(id))
}

export function setCachedChannel<T>(id: string, value: T): void {
  memoryCache.set(keys.channelKey(id), value, config.cache.channelTtl)
}

export function getCachedTrending<T>(region: string): T | undefined {
  return memoryCache.get<T>(keys.trendingKey(region))
}

export function setCachedTrending<T>(region: string, value: T): void {
  memoryCache.set(keys.trendingKey(region), value, config.cache.trendingTtl)
}

export function getCachedSearch<T>(query: string, region: string, page?: string): T | undefined {
  return memoryCache.get<T>(keys.searchKey(query, region, page))
}

export function setCachedSearch<T>(query: string, region: string, value: T, page?: string): void {
  memoryCache.set(keys.searchKey(query, region, page), value, config.cache.searchTtl)
}

/** Invalidate video cache (e.g. after analytics write). */
export function invalidateVideo(id: string): void {
  memoryCache.del(keys.videoKey(id))
}
