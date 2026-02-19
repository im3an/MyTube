/**
 * Search cache: optional cache for hot queries.
 */

import { query } from '../client.js'

export async function getSearchCache(
  queryHash: string
): Promise<{ result_ids: string[]; nextpage: string | null } | null> {
  const res = await query<{ result_ids: string[]; nextpage: string | null }>(
    'SELECT result_ids, nextpage FROM search_cache WHERE query_hash = $1',
    [queryHash]
  )
  return res.rows[0] ?? null
}

export async function setSearchCache(
  queryHash: string,
  searchQuery: string,
  region: string | null,
  nextpage: string | null,
  resultIds: string[]
): Promise<void> {
  await query(
    `INSERT INTO search_cache (query_hash, query, region, nextpage, result_ids, created_at)
     VALUES ($1, $2, $3, $4, $5, NOW())
     ON CONFLICT (query_hash) DO UPDATE SET nextpage = EXCLUDED.nextpage, result_ids = EXCLUDED.result_ids, created_at = NOW()`,
    [queryHash, searchQuery, region, nextpage, resultIds]
  )
}
