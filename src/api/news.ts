/**
 * News API — top headlines via GNews.
 * @see https://gnews.io/docs/v4
 * Add GNEWS_API_KEY to env for the proxy.
 */

const API_BASE = '/api/news'

export interface NewsArticle {
  id?: string
  title: string
  description?: string
  url: string
  image?: string
  publishedAt: string
  source?: { name: string; url?: string }
}

export interface NewsResponse {
  totalArticles?: number
  articles: NewsArticle[]
}

/** Fetch top headlines. Proxied with API key server-side. */
export async function fetchHeadlines(options?: {
  max?: number
  lang?: string
  country?: string
  category?: string
}): Promise<NewsArticle[]> {
  const params = new URLSearchParams()
  params.set('max', String(options?.max ?? 20))
  if (options?.lang) params.set('lang', options.lang)
  if (options?.country) params.set('country', options.country)
  if (options?.category) params.set('category', options.category)

  const res = await fetch(`${API_BASE}/top-headlines?${params}`, {
    signal: AbortSignal.timeout(10000),
  })
  if (!res.ok) throw new Error('Failed to fetch news')
  const data = (await res.json()) as NewsResponse
  return data.articles ?? []
}

/** Pick 6 articles for "today" — deterministic by date */
export function getTodaysSelection(articles: NewsArticle[], count = 6): NewsArticle[] {
  if (articles.length === 0) return []
  const now = new Date()
  const dayOfYear = Math.floor(
    (now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24)
  )
  const seed = dayOfYear * 7919
  const result: NewsArticle[] = []
  for (let i = 0; i < count; i++) {
    const idx = Math.abs((seed + i * 2659) % articles.length)
    result.push(articles[idx])
  }
  return result
}
