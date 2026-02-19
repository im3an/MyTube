/**
 * Analytics table: views, likes per video.
 */

import { query } from '../client.js'

export async function getAnalytics(videoId: string): Promise<{ views: number; likes: number } | null> {
  const res = await query<{ views: string; likes: number }>(
    'SELECT views, likes FROM analytics WHERE video_id = $1',
    [videoId]
  )
  const row = res.rows[0]
  if (!row) return null
  return { views: Number(row.views), likes: row.likes }
}

export async function incrementViews(videoId: string): Promise<void> {
  await query(
    `INSERT INTO analytics (video_id, views, updated_at) VALUES ($1, 1, NOW())
     ON CONFLICT (video_id) DO UPDATE SET views = analytics.views + 1, updated_at = NOW()`,
    [videoId]
  )
}

export async function incrementLikes(videoId: string): Promise<void> {
  await query(
    `INSERT INTO analytics (video_id, likes, updated_at) VALUES ($1, 1, NOW())
     ON CONFLICT (video_id) DO UPDATE SET likes = analytics.likes + 1, updated_at = NOW()`,
    [videoId]
  )
}
