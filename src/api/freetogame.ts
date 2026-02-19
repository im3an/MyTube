/**
 * FreeToGame API — free-to-play games database.
 * @see https://www.freetogame.com/api-doc
 * Data from FreeToGame.com — attribution required.
 */

const API_BASE = '/api/freetogame'

export interface FreeToGameItem {
  id: number
  title: string
  thumbnail: string
  short_description: string
  game_url: string
  genre: string
  platform: string
  publisher: string
  developer: string
  release_date: string
  freetogame_profile_url: string
}

/** Fetch all games (or filtered). Uses proxy for CORS. */
export async function fetchGames(options?: {
  platform?: 'pc' | 'browser' | 'all'
  category?: string
  'sort-by'?: 'release-date' | 'popularity' | 'alphabetical' | 'relevance'
}): Promise<FreeToGameItem[]> {
  const params = new URLSearchParams()
  if (options?.platform) params.set('platform', options.platform)
  if (options?.category) params.set('category', options.category)
  if (options?.['sort-by']) params.set('sort-by', options['sort-by'])

  const qs = params.toString()
  const url = `${API_BASE}/games${qs ? `?${qs}` : ''}`

  const res = await fetch(url, { signal: AbortSignal.timeout(10000) })
  if (!res.ok) throw new Error('Failed to fetch games')
  return res.json()
}

/** Pick 6 games for "today" — deterministic by date so selection is consistent all day */
export function getTodaysSelection(games: FreeToGameItem[], count = 6): FreeToGameItem[] {
  if (games.length === 0) return []
  const now = new Date()
  const dayOfYear = Math.floor(
    (now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24)
  )
  const seed = dayOfYear * 7919
  const result: FreeToGameItem[] = []
  for (let i = 0; i < count; i++) {
    const idx = Math.abs((seed + i * 2659) % games.length)
    result.push(games[idx])
  }
  return result
}
