/**
 * User data API. Requires auth.
 */

const API_BASE = '/api/user-data'

export interface UserDataPayload {
  history?: { videoId: string; watchedAt: string }[]
  favorites?: string[]
  dislikes?: string[]
  favoriteCreators?: { id: string; name: string; avatar?: string }[]
  watchLater?: string[]
  playlists?: { id: string; name: string; description: string; videoIds: string[] }[]
  searchHistory?: { query: string; searchedAt: string }[]
  playbackPositions?: Record<string, number>
}

export async function getUserData(): Promise<UserDataPayload> {
  const res = await fetch(API_BASE, { credentials: 'include' })
  if (!res.ok) throw new Error('Failed to fetch user data')
  return res.json()
}

export async function putUserData(data: UserDataPayload): Promise<void> {
  const res = await fetch(API_BASE, {
    method: 'PUT',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error('Failed to save user data')
}
