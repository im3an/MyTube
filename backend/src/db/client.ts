/**
 * PostgreSQL connection pool. Single place for DB access.
 */

import pg from 'pg'
import { config } from '../config.js'

const { Pool } = pg

export const pool = new Pool({
  connectionString: config.database.url,
  max: config.database.poolSize,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000,
})

pool.on('error', (err) => {
  console.error('[db] Unexpected pool error:', err.message)
})

export async function query<T extends pg.QueryResultRow = pg.QueryResultRow>(
  text: string,
  params?: unknown[]
): Promise<pg.QueryResult<T>> {
  const start = Date.now()
  const res = await pool.query<T>(text, params)
  const duration = Date.now() - start
  if (duration > 500) {
    console.warn('[db] Slow query', { text: text.slice(0, 80), duration })
  }
  return res
}

export async function closePool(): Promise<void> {
  await pool.end()
}
