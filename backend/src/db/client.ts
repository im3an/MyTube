/**
 * PostgreSQL connection pool. Single place for DB access.
 */

import pg from 'pg'
import { config } from '../config.js'
import { logger } from '../utils/logger.js'

const { Pool } = pg

export const pool = new Pool({
  connectionString: config.database.url,
  max: config.database.poolSize,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000,
})

pool.on('error', (err) => {
  logger.error('[db] Unexpected pool error', err)
})

/**
 * Verify the DB is reachable on startup. Logs and continues if not — the app
 * can still serve content via Piped directly.
 */
export async function checkDbConnection(): Promise<void> {
  try {
    await pool.query('SELECT 1')
    logger.info('[db] Connection OK')
  } catch (err) {
    logger.error('[db] Connection failed — app will serve Piped-only content', err)
  }
}

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
