/**
 * Channel table queries.
 */

import { query } from '../client.js'

export interface ChannelRow {
  id: string
  name: string
  avatar_url: string | null
  banner_url: string | null
  subscriber_count: number
  verified: boolean
  raw_json: Record<string, unknown> | null
  created_at: Date
  updated_at: Date
}

export async function getChannelById(id: string): Promise<ChannelRow | null> {
  const res = await query<ChannelRow>('SELECT * FROM channels WHERE id = $1', [id])
  return res.rows[0] ?? null
}

export async function upsertChannel(row: {
  id: string
  name: string
  avatar_url?: string | null
  banner_url?: string | null
  subscriber_count?: number
  verified?: boolean
  raw_json?: Record<string, unknown> | null
}): Promise<void> {
  await query(
    `INSERT INTO channels (id, name, avatar_url, banner_url, subscriber_count, verified, raw_json, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
     ON CONFLICT (id) DO UPDATE SET
       name = EXCLUDED.name,
       avatar_url = EXCLUDED.avatar_url,
       banner_url = EXCLUDED.banner_url,
       subscriber_count = EXCLUDED.subscriber_count,
       verified = EXCLUDED.verified,
       raw_json = EXCLUDED.raw_json,
       updated_at = NOW()`,
    [
      row.id,
      row.name,
      row.avatar_url ?? null,
      row.banner_url ?? null,
      row.subscriber_count ?? 0,
      row.verified ?? false,
      row.raw_json ? JSON.stringify(row.raw_json) : null,
    ]
  )
}
