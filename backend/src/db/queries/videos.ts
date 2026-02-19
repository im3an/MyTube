/**
 * Video table queries. Raw SQL, no ORM.
 */

import { query } from '../client.js'

export interface VideoRow {
  id: string
  channel_id: string
  title: string
  description: string | null
  thumbnail_url: string | null
  duration_sec: number | null
  published_at: Date | null
  raw_json: Record<string, unknown> | null
  created_at: Date
  updated_at: Date
}

export async function getVideoById(id: string): Promise<VideoRow | null> {
  const res = await query<VideoRow>('SELECT * FROM videos WHERE id = $1', [id])
  return res.rows[0] ?? null
}

export async function upsertVideo(row: {
  id: string
  channel_id: string
  title: string
  description?: string | null
  thumbnail_url?: string | null
  duration_sec?: number | null
  published_at?: Date | null
  raw_json?: Record<string, unknown> | null
}): Promise<void> {
  await query(
    `INSERT INTO videos (id, channel_id, title, description, thumbnail_url, duration_sec, published_at, raw_json, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
     ON CONFLICT (id) DO UPDATE SET
       channel_id = EXCLUDED.channel_id,
       title = EXCLUDED.title,
       description = EXCLUDED.description,
       thumbnail_url = EXCLUDED.thumbnail_url,
       duration_sec = EXCLUDED.duration_sec,
       published_at = EXCLUDED.published_at,
       raw_json = EXCLUDED.raw_json,
       updated_at = NOW()`,
    [
      row.id,
      row.channel_id,
      row.title,
      row.description ?? null,
      row.thumbnail_url ?? null,
      row.duration_sec ?? null,
      row.published_at ?? null,
      row.raw_json ? JSON.stringify(row.raw_json) : null,
    ]
  )
}

export async function listVideos(limit: number, cursor?: string): Promise<VideoRow[]> {
  if (cursor) {
    const res = await query<VideoRow>(
      'SELECT * FROM videos WHERE id < $1 ORDER BY id DESC LIMIT $2',
      [cursor, limit]
    )
    return res.rows
  }
  const res = await query<VideoRow>('SELECT * FROM videos ORDER BY id DESC LIMIT $1', [limit])
  return res.rows
}
