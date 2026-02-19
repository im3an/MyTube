/**
 * Run SQL migrations. Execute: npm run build && node dist/db/migrate.js
 * Or with tsx: npx tsx src/db/migrate.ts
 */

import { readFileSync, readdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { pool } from './client.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

async function migrate() {
  // Resolve migrations from src (SQL files are not compiled to dist)
  const migrationsDir = join(__dirname, __dirname.includes('dist') ? '../../src/db/migrations' : 'migrations')
  const files = readdirSync(migrationsDir).filter((f) => f.endsWith('.sql')).sort()
  for (const file of files) {
    const sql = readFileSync(join(migrationsDir, file), 'utf-8')
    console.log('[migrate] Running', file)
    await pool.query(sql)
  }
  console.log('[migrate] Done')
  await pool.end()
}

migrate().catch((e) => {
  console.error(e)
  process.exit(1)
})
