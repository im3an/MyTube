/**
 * User data service: persist and retrieve user preferences.
 */

import { query } from '../db/client.js'
import { NotFoundError } from '../utils/errors.js'

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

export interface UserData {
  history: { videoId: string; watchedAt: string }[]
  favorites: string[]
  dislikes: string[]
  favoriteCreators: { id: string; name: string; avatar?: string }[]
  watchLater: string[]
  playlists: { id: string; name: string; description: string; videoIds: string[] }[]
  searchHistory: { query: string; searchedAt: string }[]
  playbackPositions: Record<string, number>
}

const EMPTY: UserData = {
  history: [],
  favorites: [],
  dislikes: [],
  favoriteCreators: [],
  watchLater: [],
  playlists: [],
  searchHistory: [],
  playbackPositions: {},
}

export async function getUserData(userId: string): Promise<UserData> {
  const [historyRes, favoritesRes, dislikesRes, creatorsRes, watchLaterRes, playlistsRes, searchRes, positionsRes] = await Promise.all([
    query<{ video_id: string; watched_at: string }>('SELECT video_id, watched_at FROM user_history WHERE user_id = $1 ORDER BY watched_at DESC LIMIT 100', [userId]),
    query<{ video_id: string }>('SELECT video_id FROM user_favorites WHERE user_id = $1', [userId]),
    query<{ video_id: string }>('SELECT video_id FROM user_dislikes WHERE user_id = $1', [userId]),
    query<{ channel_id: string; name: string; avatar: string | null }>('SELECT channel_id, name, avatar FROM user_favorite_creators WHERE user_id = $1', [userId]),
    query<{ video_id: string }>('SELECT video_id FROM user_watch_later WHERE user_id = $1', [userId]),
    query<{ id: string; name: string; description: string }>('SELECT id, name, description FROM user_playlists WHERE user_id = $1 ORDER BY created_at', [userId]),
    query<{ query: string; searched_at: string }>('SELECT query, searched_at FROM user_search_history WHERE user_id = $1 ORDER BY searched_at DESC LIMIT 20', [userId]),
    query<{ video_id: string; position_sec: number }>('SELECT video_id, position_sec FROM user_playback_positions WHERE user_id = $1', [userId]),
  ])

  const playlists = playlistsRes.rows
  const playlistVideosRes = playlists.length > 0
    ? await query<{ playlist_id: string; video_id: string; position: number }>(
        'SELECT playlist_id, video_id, position FROM user_playlist_videos WHERE playlist_id = ANY($1) ORDER BY position',
        [playlists.map((p) => p.id)]
      )
    : { rows: [] }

  const videoMap = new Map<string, string[]>()
  for (const r of playlistVideosRes.rows) {
    const list = videoMap.get(r.playlist_id) ?? []
    list.push(r.video_id)
    videoMap.set(r.playlist_id, list)
  }

  return {
    history: historyRes.rows.map((r) => ({ videoId: r.video_id, watchedAt: r.watched_at })),
    favorites: favoritesRes.rows.map((r) => r.video_id),
    dislikes: dislikesRes.rows.map((r) => r.video_id),
    favoriteCreators: creatorsRes.rows.map((r) => ({ id: r.channel_id, name: r.name, avatar: r.avatar ?? undefined })),
    watchLater: watchLaterRes.rows.map((r) => r.video_id),
    playlists: playlists.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description ?? '',
      videoIds: videoMap.get(p.id) ?? [],
    })),
    searchHistory: searchRes.rows.map((r) => ({ query: r.query, searchedAt: r.searched_at })),
    playbackPositions: Object.fromEntries(positionsRes.rows.map((r) => [r.video_id, r.position_sec])),
  }
}

export async function putUserData(userId: string, data: UserDataPayload): Promise<UserData> {
  const client = await (await import('../db/client.js')).pool.connect()
  try {
    await client.query('BEGIN')
    if (data.history !== undefined) {
      await client.query('DELETE FROM user_history WHERE user_id = $1', [userId])
      for (const h of data.history.slice(0, 100)) {
        await client.query(
          'INSERT INTO user_history (user_id, video_id, watched_at) VALUES ($1, $2, $3) ON CONFLICT (user_id, video_id) DO UPDATE SET watched_at = $3',
          [userId, h.videoId, h.watchedAt]
        )
      }
    }
    if (data.favorites !== undefined) {
      await client.query('DELETE FROM user_favorites WHERE user_id = $1', [userId])
      for (const v of data.favorites) {
        await client.query('INSERT INTO user_favorites (user_id, video_id) VALUES ($1, $2)', [userId, v])
      }
    }
    if (data.dislikes !== undefined) {
      await client.query('DELETE FROM user_dislikes WHERE user_id = $1', [userId])
      for (const v of data.dislikes) {
        await client.query('INSERT INTO user_dislikes (user_id, video_id) VALUES ($1, $2)', [userId, v])
      }
    }
    if (data.favoriteCreators !== undefined) {
      await client.query('DELETE FROM user_favorite_creators WHERE user_id = $1', [userId])
      for (const c of data.favoriteCreators) {
        await client.query('INSERT INTO user_favorite_creators (user_id, channel_id, name, avatar) VALUES ($1, $2, $3, $4)', [userId, c.id, c.name, c.avatar ?? null])
      }
    }
    if (data.watchLater !== undefined) {
      await client.query('DELETE FROM user_watch_later WHERE user_id = $1', [userId])
      for (const v of data.watchLater) {
        await client.query('INSERT INTO user_watch_later (user_id, video_id) VALUES ($1, $2)', [userId, v])
      }
    }
    if (data.playlists !== undefined) {
      await client.query('DELETE FROM user_playlist_videos WHERE playlist_id IN (SELECT id FROM user_playlists WHERE user_id = $1)', [userId])
      await client.query('DELETE FROM user_playlists WHERE user_id = $1', [userId])
      for (const p of data.playlists) {
        await client.query('INSERT INTO user_playlists (id, user_id, name, description) VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING', [p.id, userId, p.name, p.description])
        for (let i = 0; i < (p.videoIds ?? []).length; i++) {
          await client.query('INSERT INTO user_playlist_videos (playlist_id, video_id, position) VALUES ($1, $2, $3)', [p.id, (p.videoIds ?? [])[i], i])
        }
      }
    }
    if (data.searchHistory !== undefined) {
      await client.query('DELETE FROM user_search_history WHERE user_id = $1', [userId])
      for (const s of data.searchHistory.slice(0, 20)) {
        await client.query('INSERT INTO user_search_history (user_id, query, searched_at) VALUES ($1, $2, $3)', [userId, s.query, s.searchedAt])
      }
    }
    if (data.playbackPositions !== undefined) {
      for (const [videoId, pos] of Object.entries(data.playbackPositions)) {
        await client.query(
          'INSERT INTO user_playback_positions (user_id, video_id, position_sec, updated_at) VALUES ($1, $2, $3, NOW()) ON CONFLICT (user_id, video_id) DO UPDATE SET position_sec = $3, updated_at = NOW()',
          [userId, videoId, pos]
        )
      }
    }
    await client.query('COMMIT')
    return getUserData(userId)
  } catch (e) {
    await client.query('ROLLBACK')
    throw e
  } finally {
    client.release()
  }
}
