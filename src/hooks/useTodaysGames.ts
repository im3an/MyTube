import { useState, useEffect } from 'react'
import { fetchGames, getTodaysSelection, type FreeToGameItem } from '@/api/freetogame'

export function useTodaysGames(count = 6) {
  const [games, setGames] = useState<FreeToGameItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    fetchGames({ platform: 'pc', 'sort-by': 'popularity' })
      .then((all) => setGames(getTodaysSelection(all, count)))
      .catch((e) => {
        setError((e as Error).message)
        setGames([])
      })
      .finally(() => setLoading(false))
  }, [count])

  return { games, loading, error }
}
