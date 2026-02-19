import { useEffect, useState } from 'react'
import { resolveChannelIdentity } from '@/services/channelService'

const avatarCache = new Map<string, string>()

/** Detect mock/placeholder avatars (DiceBear, etc.) — never treat as real. */
function isMock(url: string | null | undefined): boolean {
  if (!url?.trim()) return true
  return url.includes('dicebear') || url.includes('avataaars')
}

/**
 * Returns the channel avatar with correct fallback hierarchy:
 * 1. Resolved channel avatar (via channelService — single source of truth)
 * 2. Passed-in avatar (if real, not mock)
 * 3. Empty string (UI shows initials/placeholder)
 */
export function useChannelAvatar(
  channelId: string | undefined,
  currentAvatar: string
): string {
  const cached = channelId ? avatarCache.get(channelId) : undefined
  const [resolvedAvatar, setResolvedAvatar] = useState<string | null>(cached ?? null)

  useEffect(() => {
    if (!channelId) return

    const cachedUrl = avatarCache.get(channelId)
    if (cachedUrl) {
      setResolvedAvatar(cachedUrl)
      return
    }

    let cancelled = false
    resolveChannelIdentity(channelId).then((identity) => {
      if (cancelled || !identity?.avatar) return
      avatarCache.set(channelId, identity.avatar)
      if (identity.id && identity.id !== channelId) {
        avatarCache.set(identity.id, identity.avatar)
      }
      setResolvedAvatar(identity.avatar)
    })
    return () => {
      cancelled = true
    }
  }, [channelId])

  if (resolvedAvatar) return resolvedAvatar
  if (currentAvatar && !isMock(currentAvatar)) return currentAvatar
  return ''
}
