import { useEffect, useState } from 'react'
import {
  resolveChannelIdentity,
  isCanonicalChannelId,
} from '@/services/channelService'

/** Sync lookup: returns canonical ID if cached. Populated by useResolvedChannelId. */
export const channelIdCache = new Map<string, string>()

/** Sync lookup: returns canonical ID if cached or already canonical, else the raw id. */
export function getCachedChannelId(id: string): string {
  if (!id) return id
  if (isCanonicalChannelId(id)) return id
  return channelIdCache.get(id) ?? id
}

export interface UseResolvedChannelIdResult {
  resolvedId: string | undefined
  error: string | null
  isLoading: boolean
}

/**
 * Resolves @handle to canonical UC channel ID for use in URLs.
 * Uses channelService — single source of truth. Never routes with unresolved @handle.
 */
export function useResolvedChannelId(
  channelId: string | undefined
): UseResolvedChannelIdResult {
  const [resolved, setResolved] = useState<string | undefined>(() => {
    if (!channelId) return undefined
    if (isCanonicalChannelId(channelId)) return channelId
    return channelIdCache.get(channelId) ?? undefined
  })
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!channelId) {
      setResolved(undefined)
      setError(null)
      return
    }
    if (isCanonicalChannelId(channelId)) {
      setResolved(channelId)
      setError(null)
      return
    }
    const cached = channelIdCache.get(channelId)
    if (cached) {
      setResolved(cached)
      setError(null)
      return
    }
    setError(null)
    let cancelled = false
    resolveChannelIdentity(channelId).then((identity) => {
      if (cancelled) return
      if (identity?.id) {
        channelIdCache.set(channelId, identity.id)
        channelIdCache.set(identity.id, identity.id)
        setResolved(identity.id)
        setError(null)
      } else {
        setError('Channel not found')
      }
    })
    return () => {
      cancelled = true
    }
  }, [channelId])

  const resolvedId = resolved ?? (channelId && isCanonicalChannelId(channelId) ? channelId : undefined)
  const isLoading = !!channelId && !isCanonicalChannelId(channelId) && !resolvedId && !error

  return { resolvedId, error, isLoading }
}

