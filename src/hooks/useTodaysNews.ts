import { useState, useEffect } from 'react'
import { fetchHeadlines, getTodaysSelection, type NewsArticle } from '@/api/news'

export function useTodaysNews(count = 6) {
  const [articles, setArticles] = useState<NewsArticle[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    fetchHeadlines({ max: 30, lang: 'en', category: 'general' })
      .then((all) => setArticles(getTodaysSelection(all, count)))
      .catch((e) => {
        setError((e as Error).message)
        setArticles([])
      })
      .finally(() => setLoading(false))
  }, [count])

  return { articles, loading, error }
}
